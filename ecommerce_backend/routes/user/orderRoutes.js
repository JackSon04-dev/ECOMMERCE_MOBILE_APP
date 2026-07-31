import express from 'express'
import {
  getMyOrders,
  getOrderById,
  createOrder,
  cancelOrder,
  confirmReceived,
  getOrderStatus
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

// All routes require authentication
router.use(verifyToken)

// 📋 Get all user's orders (can filter by status)
router.get('/my-orders', validate(getMyOrdersSchema), getMyOrders)

// ✨ Create new order
router.post('/', validate(createOrderSchema), createOrder)

// 🔍 Check order processing status (Polling)
router.get('/status/:id', validate(getOrderByIdSchema), getOrderStatus)

// 📦 Get order details by ID
router.get('/:id', validate(getOrderByIdSchema), getOrderById)

// ❌ Cancel order
router.patch('/:id/cancel', validate(orderActionSchema), cancelOrder)

// ✅ Confirm received order
router.patch('/:id/confirm-received', validate(orderActionSchema), confirmReceived)

export default router
