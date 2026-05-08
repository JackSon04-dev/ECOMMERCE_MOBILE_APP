import Order from '../../models/orderModel.js'

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
    const { status } = req.body

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
      await order.save()

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

    // Nếu đơn hàng thành công và là COD -> đánh dấu đã thanh toán
    if (status === 'Thành công' && order.paymentMethod === 'COD') {
      order.isPaid = true
    }

    await order.save()

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
