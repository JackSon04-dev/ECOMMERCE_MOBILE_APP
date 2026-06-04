import * as orderService from '../../services/orderService.js';

// 📋 Lấy đơn hàng của user với tính năng phân trang
export const getMyOrders = async (req, res) => {
  try {
    const userId = req.user.id
    const data = await orderService.getMyOrders(userId, req.query)

    res.status(200).json({
      success: true,
      ...data
    })
  } catch (error) {
    console.error('❌ Get my orders error:', error)
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy danh sách đơn hàng',
      error: error.message
    })
  }
}

// 📦 Lấy chi tiết đơn hàng theo ID
export const getOrderById = async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.user.id

    const order = await orderService.getOrderById(id, userId)

    res.status(200).json({
      success: true,
      order
    })
  } catch (error) {
    console.error('❌ Get order by id error:', error)
    const statusCode = error.message.includes('quyền') ? 403 : (error.message.includes('tìm thấy') ? 404 : 500);
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Lỗi khi lấy thông tin đơn hàng',
      error: error.message
    })
  }
}

// ✨ Tạo đơn hàng mới
export const createOrder = async (req, res) => {
  try {
    const userId = req.user.id
    const orderData = req.body

    const result = await orderService.processCreateOrder(userId, orderData)

    res.status(201).json({
      success: true,
      message: 'Đặt hàng thành công',
      order: result.order
    })
  } catch (error) {
    console.error('\n❌ ========== TẠO ĐƠN HÀNG THẤT BẠI ==========')
    console.error('Error:', error.message)
    console.error('==========================================\n')

    res.status(400).json({
      success: false,
      message: error.message || 'Lỗi khi tạo đơn hàng',
      error: error.message
    })
  }
}

// ✅ Xác nhận đã nhận hàng → cập nhật status thành "Thành công"
export const confirmReceived = async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.user.id

    const order = await orderService.processConfirmReceived(id, userId)

    res.status(200).json({
      success: true,
      message: 'Xác nhận nhận hàng thành công',
      order
    })
  } catch (error) {
    console.error('❌ [confirmReceived] Error:', error.message)
    res.status(400).json({
      success: false,
      message: error.message || 'Lỗi khi xác nhận nhận hàng',
      error: error.message
    })
  }
}

// ❌ Hủy đơn hàng
export const cancelOrder = async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.user.id

    const order = await orderService.processCancelOrder(id, userId)

    res.status(200).json({
      success: true,
      message: 'Hủy đơn hàng thành công',
      order
    })
  } catch (error) {
    console.error('❌ [cancelOrder] Error:', error.message)
    res.status(400).json({
      success: false,
      message: error.message || 'Lỗi khi hủy đơn hàng',
      error: error.message
    })
  }
}
