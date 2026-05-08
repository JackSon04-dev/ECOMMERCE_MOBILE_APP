import express from 'express'
import {
  getAllOrders,
  getOrderById,
  updateOrderStatus,
  updatePaymentStatus,
  getOrderStatistics
} from '../../controllers/admin/orderController.js'

const router = express.Router()

// GET /api/admin/orders/statistics - Thống kê đơn hàng (đặt trước /:id)
router.get('/statistics', getOrderStatistics)

// GET /api/admin/orders - Lấy danh sách đơn hàng
router.get('/', getAllOrders)

// GET /api/admin/orders/:id - Lấy chi tiết đơn hàng
router.get('/:id', getOrderById)

// PUT /api/admin/orders/:id/status - Cập nhật trạng thái đơn hàng
router.put('/:id/status', updateOrderStatus)

// PUT /api/admin/orders/:id/payment - Cập nhật trạng thái thanh toán
router.put('/:id/payment', updatePaymentStatus)

export default router
