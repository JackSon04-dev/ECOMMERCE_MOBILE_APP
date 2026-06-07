import express from 'express'
import {
  getMyOrders,
  getOrderById,
  createOrder,
  cancelOrder,
  confirmReceived
} from '../../controllers/user/orderController.js'
import { verifyToken } from '../../middleware/authMiddleware.js'
import { validate } from '../../middleware/validationMiddleware.js'
import {
  getMyOrdersSchema,
  getOrderByIdSchema,
  createOrderSchema,
  orderActionSchema
} from '../../validations/userValidation.js'

const router = express.Router()

// Tất cả routes đều cần authentication
router.use(verifyToken)

// 📋 Lấy tất cả đơn hàng của user (có thể filter theo status)
router.get('/my-orders', validate(getMyOrdersSchema), getMyOrders)

// ✨ Tạo đơn hàng mới
router.post('/', validate(createOrderSchema), createOrder)

// 📦 Lấy chi tiết đơn hàng theo ID
router.get('/:id', validate(getOrderByIdSchema), getOrderById)

// ❌ Hủy đơn hàng
router.patch('/:id/cancel', validate(orderActionSchema), cancelOrder)

// ✅ Xác nhận đã nhận hàng
router.patch('/:id/confirm-received', validate(orderActionSchema), confirmReceived)

export default router
