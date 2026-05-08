import express from 'express'
import {
  getMyOrders,
  getOrderById,
  createOrder,
  cancelOrder,
  confirmReceived
} from '../../controllers/user/orderController.js'
import { verifyToken } from '../../middleware/authMiddleware.js'

const router = express.Router()

// Tất cả routes đều cần authentication
router.use(verifyToken)

// 📋 Lấy tất cả đơn hàng của user (có thể filter theo status)
// Query: ?status=Chờ xác nhận
router.get('/my-orders', getMyOrders)

// ✨ Tạo đơn hàng mới
router.post('/', createOrder)

// 📦 Lấy chi tiết đơn hàng theo ID
router.get('/:id', getOrderById)

// ❌ Hủy đơn hàng
router.patch('/:id/cancel', cancelOrder)

// ✅ Xác nhận đã nhận hàng
router.patch('/:id/confirm-received', confirmReceived)

export default router
