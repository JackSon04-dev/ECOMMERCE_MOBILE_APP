import Order from '../../models/orderModel.js'
import User from '../../models/userModel.js'
import Notification from '../../models/notification.js'
import { sendPushNotification } from '../../services/fcmService.js'

// Map trạng thái sang nội dung thông báo tiếng Việt
const statusMessages = {
  'Đã xác nhận': 'Đơn hàng của bạn đã được xác nhận và đang chuẩn bị',
  'Đang giao': 'Đơn hàng của bạn đang được giao đến bạn',
  'Đã giao': 'Đơn hàng của bạn đã được giao thành công',
  'Thành công': 'Đơn hàng của bạn đã hoàn thành. Cảm ơn bạn đã mua sắm!',
  'Đã hủy': 'Đơn hàng của bạn đã bị hủy'
}

// @desc    Lấy danh sách tất cả đơn hàng
// @route   GET /api/admin/orders
// @access  Admin
export const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 }).lean()

    res.status(200).json({
      success: true,
      data: orders
    })
  } catch (error) {
    console.error('Error in getAllOrders:', error)
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy danh sách đơn hàng',
      error: error.message
    })
  }
}

// @desc    Lấy chi tiết một đơn hàng
// @route   GET /api/admin/orders/:id
// @access  Admin
export const getOrderById = async (req, res) => {
  try {
    const { id } = req.params

    const order = await Order.findById(id).lean()

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy đơn hàng'
      })
    }

    res.status(200).json({
      success: true,
      data: order
    })
  } catch (error) {
    console.error('Error in getOrderById:', error)
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy chi tiết đơn hàng',
      error: error.message
    })
  }
}

// @desc    Cập nhật trạng thái đơn hàng
// @route   PUT /api/admin/orders/:id/status
// @access  Admin
export const updateOrderStatus = async (req, res) => {
  try {
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
      return res.status(400).json({
        success: false,
        message: 'Trạng thái không hợp lệ',
        validStatuses
      })
    }

    const order = await Order.findById(id)

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy đơn hàng'
      })
    }

    // Nếu đơn hàng đã hủy hoặc thành công thì không được thay đổi
    if (order.status === 'Đã hủy') {
      return res.status(400).json({
        success: false,
        message: 'Đơn hàng đã hủy, không thể thay đổi trạng thái'
      })
    }

    if (order.status === 'Thành công') {
      return res.status(400).json({
        success: false,
        message: 'Đơn hàng đã thành công, không thể thay đổi trạng thái'
      })
    }

    // Luôn cho phép chuyển sang trạng thái "Đã hủy" từ bất kỳ trạng thái nào
    if (status === 'Đã hủy') {
      order.status = status
      // Ghi nhận mốc thời gian vào statusHistory
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

    // Chỉ cho phép chuyển sang trạng thái tiếp theo (newIndex = currentIndex + 1)
    if (newIndex !== currentIndex + 1) {
      return res.status(400).json({
        success: false,
        message: `Không thể chuyển từ "${order.status}" sang "${status}". Chỉ được chuyển sang trạng thái tiếp theo là "${statusOrder[currentIndex + 1]}" hoặc "Đã hủy"`
      })
    }

    // Cập nhật trạng thái
    order.status = status

    // Ghi nhận mốc thời gian vào statusHistory
    order.statusHistory.push({
      status,
      note: note || ''
    })

    // Nếu đơn hàng thành công và là COD -> đánh dấu đã thanh toán
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
  } catch (error) {
    console.error('Error in updateOrderStatus:', error)
    res.status(500).json({
      success: false,
      message: 'Lỗi khi cập nhật trạng thái đơn hàng',
      error: error.message
    })
  }
}

/**
 * Hàm nội bộ: Tạo Notification trong DB + Gửi FCM Push Notification
 * Chạy song song, không block response của Admin
 */
const _sendOrderNotification = async (order, status) => {
  try {
    const orderId = order._id.toString()
    const orderCode = orderId.slice(-8).toUpperCase()
    const userName = order.userInfo?.username || 'bạn'
    
    const title = '📦 Cập nhật đơn hàng'
    const baseMessage = statusMessages[status] || `Đơn hàng của bạn đã chuyển sang: ${status}`
    const body = `Xin chào ${userName}! ${baseMessage.replace('Đơn hàng của bạn', `Đơn hàng #${orderCode}`)}`

    // Xoá thông báo trạng thái trước đó của order này
    // (Vì theo thiết kế, user đọc thông báo ORDER xong thì báo đó sẽ bị xoá hẳn khỏi DB. 
    // Nên nếu còn tồn tại trong DB, tức là user chưa đọc -> Xoá đi để thay bằng trạng thái mới nhất)
    await Notification.deleteMany({
      userId: order.user,
      type: 'ORDER',
      referenceId: order._id
    })

    // Lấy ảnh của sản phẩm đầu tiên để hiển thị trên thông báo (nếu có)
    let imageUrl = null;
    if (order.orderItems && order.orderItems.length > 0) {
      imageUrl = order.orderItems[0].variant?.colorImage || order.orderItems[0].productImage;
    }

    // 1. Tạo Notification mới trong DB (để User xem lại trong App)
    const notification = await Notification.create({
      userId: order.user,
      title,
      message: body,
      type: 'ORDER',
      referenceId: order._id,
      imageUrl: imageUrl
    })

    // 2. Lấy FCM tokens của User để gửi Push Notification
    const user = await User.findById(order.user).select('fcmTokens').lean()
    if (!user || !user.fcmTokens || user.fcmTokens.length === 0) {
      console.log(`⚠️ User ${order.user} không có FCM token, bỏ qua push notification`)
      return
    }

    // Trích xuất danh sách token string từ mảng fcmTokens
    const tokens = user.fcmTokens.map(t => t.token)

    // 3. Gửi Push Notification qua FCM
    await sendPushNotification(tokens, title, body, {
      type: 'ORDER', // Trùng khớp với type Flutter đang kiểm tra
      referenceId: orderId, // Trùng khớp với key Flutter lấy ra
      status: status,
      notificationId: notification._id.toString(),
      imageUrl: imageUrl || ''
    }, imageUrl)
  } catch (error) {
    // Lỗi gửi thông báo không ảnh hưởng đến logic cập nhật đơn hàng
    console.error('❌ Lỗi gửi thông báo đơn hàng:', error.message)
  }
}

// @desc    Cập nhật trạng thái thanh toán
// @route   PUT /api/admin/orders/:id/payment
// @access  Admin
export const updatePaymentStatus = async (req, res) => {
  try {
    const { id } = req.params
    const { isPaid } = req.body

    const order = await Order.findById(id)

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy đơn hàng'
      })
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
  } catch (error) {
    console.error('Error in updatePaymentStatus:', error)
    res.status(500).json({
      success: false,
      message: 'Lỗi khi cập nhật trạng thái thanh toán',
      error: error.message
    })
  }
}

// @desc    Thống kê đơn hàng
// @route   GET /api/admin/orders/statistics
// @access  Admin
export const getOrderStatistics = async (req, res) => {
  try {
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
  } catch (error) {
    console.error('Error in getOrderStatistics:', error)
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy thống kê đơn hàng',
      error: error.message
    })
  }
}
