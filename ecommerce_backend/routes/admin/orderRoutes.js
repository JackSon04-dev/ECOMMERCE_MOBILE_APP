import express from 'express'
import {
  getAllOrders,
  getOrderById,
  updateOrderStatus,
  updatePaymentStatus,
  getOrderStatistics
} from '../../controllers/admin/orderController.js'
import { verifyToken, restrictToRoles } from '../../middleware/authMiddleware.js'

const router = express.Router()

router.use(verifyToken, restrictToRoles(['ADMIN']))

// GET /api/admin/orders/statistics - Order statistics (must precede /:id)
router.get('/statistics', getOrderStatistics)

// GET /api/admin/orders - Get list of orders
router.get('/', getAllOrders)

// GET /api/admin/orders/:id - Get order details
router.get('/:id', getOrderById)

// PUT /api/admin/orders/:id/status - Update order status
router.put('/:id/status', updateOrderStatus)

// PUT /api/admin/orders/:id/payment - Update payment status
router.put('/:id/payment', updatePaymentStatus)

export default router
