import express from 'express'
import * as dashboardController from '../../controllers/admin/dashboardController.js'
import { verifyToken, restrictToRoles } from '../../middleware/authMiddleware.js'

const router = express.Router()

router.use(verifyToken, restrictToRoles(['ADMIN']))

// Tổng quan tài chính
router.get('/financial-overview', dashboardController.getFinancialOverview)

// Đơn hàng chờ xác nhận
router.get('/pending-orders', dashboardController.getPendingOrders)

// Top 7 sản phẩm bán chạy
router.get('/top-products', dashboardController.getTopProducts)

// Top khách hàng chi tiêu nhiều nhất
router.get('/top-customers', dashboardController.getTopCustomers)

// Voucher được dùng nhiều nhất
router.get('/top-vouchers', dashboardController.getTopVouchers)

// Biểu đồ doanh thu theo tháng
router.get('/revenue-chart', dashboardController.getRevenueChart)

export default router
