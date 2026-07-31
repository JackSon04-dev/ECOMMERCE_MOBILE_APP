import Order from '../../models/orderModel.js'
import User from '../../models/userModel.js'
import Notification from '../../models/notification.js'
import { sendPushNotification } from '../../services/fcmService.js'
import { asyncHandler, ApiError } from '../../middleware/errorMiddleware.js'

// Map status to Vietnamese notification content
const statusMessages = {
  'Đã xác nhận': 'Đơn hàng của bạn đã được xác nhận và đang chuẩn bị',
  'Đang giao': 'Đơn hàng của bạn đang được giao đến bạn',
  'Đã giao': 'Đơn hàng của bạn đã được giao thành công',
  'Thành công': 'Đơn hàng của bạn đã hoàn thành. Cảm ơn bạn đã mua sắm!',
  'Đã hủy': 'Đơn hàng của bạn đã bị hủy'
}

// @desc    Get list of all orders
// @route   GET /api/admin/orders
// @access  Admin
export const getAllOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find().sort({ createdAt: -1 }).lean()

  const mappedOrders = orders.map(order => {
    order.id = order._id.toString()
    delete order._id
    return order
  })

  res.status(200).json({
    success: true,
    data: mappedOrders
  })
});

// @desc    Get order details
// @route   GET /api/admin/orders/:id
// @access  Admin
export const getOrderById = asyncHandler(async (req, res) => {
  const { id } = req.params

  const order = await Order.findById(id).lean()

  if (!order) {
    throw new ApiError(404, 'Không tìm thấy đơn hàng')
  }

  order.id = order._id.toString()
  delete order._id

  res.status(200).json({
    success: true,
    data: order
  })
});

// @desc    Update order status
// @route   PUT /api/admin/orders/:id/status
// @access  Admin
export const updateOrderStatus = asyncHandler(async (req, res) => {
  const { id } = req.params
  const { status, note } = req.body

  // Validate status
  const validStatuses = [
    'Chờ xác nhận',
    'Đã xác nhận',
    'Đang giao',
    'Đã giao',
    'Thành công',
    'Đã hủy'
  ]

  if (!validStatuses.includes(status)) {
    throw new ApiError(400, 'Trạng thái không hợp lệ')
  }

  const order = await Order.findById(id)

  if (!order) {
    throw new ApiError(404, 'Không tìm thấy đơn hàng')
  }

  // If order is cancelled or successful, it cannot be changed
  if (order.status === 'Đã hủy') {
    throw new ApiError(400, 'Đơn hàng đã hủy, không thể thay đổi trạng thái')
  }

  if (order.status === 'Thành công') {
    throw new ApiError(400, 'Đơn hàng đã thành công, không thể thay đổi trạng thái')
  }

  // Always allow transitioning to "Cancelled" from any status
  if (status === 'Đã hủy') {
    order.status = status
    // Record timestamp in statusHistory
    order.statusHistory.push({
      status,
      note: note || 'Đơn hàng đã bị hủy'
    })
    await order.save()

    // === TRIGGER FCM PUSH NOTIFICATION ===
    await _sendOrderNotification(order, status)

    return res.status(200).json({
      success: true,
      message: 'Đơn hàng đã được hủy',
      data: order
    })
  }

  // Kiểm tra logic chuyển trạng thái tiến tiến (chỉ được tiến, không được lùi)
  const statusOrder = [
    'Chờ xác nhận',
    'Đã xác nhận',
    'Đang giao',
    'Đã giao',
    'Thành công'
  ]

  const currentIndex = statusOrder.indexOf(order.status)
  const newIndex = statusOrder.indexOf(status)

  // Only allow transitioning to the next status (newIndex = currentIndex + 1)
  if (newIndex !== currentIndex + 1) {
    throw new ApiError(400, `Không thể chuyển từ "${order.status}" sang "${status}". Chỉ được chuyển sang trạng thái tiếp theo là "${statusOrder[currentIndex + 1]}" hoặc "Đã hủy"`)
  }

  // Update status
  order.status = status

  // Record timestamp in statusHistory
  order.statusHistory.push({
    status,
    note: note || ''
  })

  // If order is successful and is COD -> mark as paid
  if (status === 'Thành công' && order.paymentMethod === 'COD') {
    order.isPaid = true
  }

  await order.save()

  // === TRIGGER FCM PUSH NOTIFICATION ===
  await _sendOrderNotification(order, status)

  res.status(200).json({
    success: true,
    message: `Cập nhật trạng thái đơn hàng thành "${status}"`,
    data: order
  })
});

/**
 * Internal function: Create Notification in DB + Send FCM Push Notification
 * Runs concurrently, does not block Admin response
 */
const _sendOrderNotification = async (order, status) => {
  try {
    const orderId = order._id.toString()
    const orderCode = orderId.slice(-8).toUpperCase()
    const userName = order.userInfo?.username || 'bạn'
    
    const title = '📦 Cập nhật đơn hàng'
    const baseMessage = statusMessages[status] || `Đơn hàng của bạn đã chuyển sang: ${status}`
    const body = `Xin chào ${userName}! ${baseMessage.replace('Đơn hàng của bạn', `Đơn hàng #${orderCode}`)}`

    // Delete previous status notification of this order
    // (Because by design, after user reads an ORDER notification, it is completely removed from DB. 
    // So if it still exists in DB, meaning user hasn't read it -> Delete it to replace with latest status)
    await Notification.deleteMany({
      userId: order.user,
      type: 'ORDER',
      referenceId: order._id
    })

    // Get the image of the first product to display on notification (if any)
    let imageUrl = null;
    if (order.orderItems && order.orderItems.length > 0) {
      imageUrl = order.orderItems[0].variant?.colorImage || order.orderItems[0].productImage;
    }

    // 1. Create new Notification in DB (for User to review in App)
    const notification = await Notification.create({
      userId: order.user,
      title,
      message: body,
      type: 'ORDER',
      referenceId: order._id,
      imageUrl: imageUrl
    })

    // 2. Get User's FCM tokens to send Push Notification
    const user = await User.findById(order.user).select('fcmTokens').lean()
    if (!user || !user.fcmTokens || user.fcmTokens.length === 0) {
      console.log(`⚠️ User ${order.user} không có FCM token, bỏ qua push notification`)
      return
    }

    // Extract list of token strings from fcmTokens array
    const tokens = user.fcmTokens.map(t => t.token)

    // 3. Send Push Notification via FCM
    const result = await sendPushNotification(tokens, title, body, {
      type: 'ORDER', // Matches the type Flutter is checking
      referenceId: orderId, // Matches the key Flutter retrieves
      status: status,
      notificationId: notification._id.toString()
    }, imageUrl)

  } catch (error) {
    // Notification send error does not affect order update logic
    console.error('❌ Lỗi gửi thông báo đơn hàng:', error.message)
  }
}

// @desc    Update payment status
// @route   PUT /api/admin/orders/:id/payment
// @access  Admin
export const updatePaymentStatus = asyncHandler(async (req, res) => {
  const { id } = req.params
  const { isPaid } = req.body

  const order = await Order.findById(id)

  if (!order) {
    throw new ApiError(404, 'Không tìm thấy đơn hàng')
  }

  order.isPaid = isPaid

  await order.save()

  res.status(200).json({
    success: true,
    message: isPaid
      ? 'Đã đánh dấu đơn hàng đã thanh toán'
      : 'Đã đánh dấu đơn hàng chưa thanh toán',
    data: order
  })
});

// @desc    Order statistics
// @route   GET /api/admin/orders/statistics
// @access  Admin
export const getOrderStatistics = asyncHandler(async (req, res) => {
  const [
    totalOrders,
    pendingOrders,
    confirmedOrders,
    shippingOrders,
    deliveredOrders,
    completedOrders,
    cancelledOrders,
    revenueStats
  ] = await Promise.all([
    Order.countDocuments(),
    Order.countDocuments({ status: 'Chờ xác nhận' }),
    Order.countDocuments({ status: 'Đã xác nhận' }),
    Order.countDocuments({ status: 'Đang giao' }),
    Order.countDocuments({ status: 'Đã giao' }),
    Order.countDocuments({ status: 'Thành công' }),
    Order.countDocuments({ status: 'Đã hủy' }),
    Order.aggregate([
      { $match: { status: 'Thành công' } },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$totalPrice' },
          avgOrderValue: { $avg: '$totalPrice' }
        }
      }
    ])
  ])

  res.status(200).json({
    success: true,
    data: {
      totalOrders,
      ordersByStatus: {
        pending: pendingOrders,
        confirmed: confirmedOrders,
        shipping: shippingOrders,
        delivered: deliveredOrders,
        completed: completedOrders,
        cancelled: cancelledOrders
      },
      revenue: {
        totalRevenue: revenueStats[0]?.totalRevenue || 0,
        avgOrderValue: Math.round(revenueStats[0]?.avgOrderValue || 0)
      }
    }
  })
});

