import express from 'express'
import * as dashboardController from '../../controllers/admin/dashboardController.js'
import { verifyToken, restrictToRoles } from '../../middleware/authMiddleware.js'

const router = express.Router()

router.use(verifyToken, restrictToRoles(['ADMIN']))

// Financial overview
router.get('/financial-overview', dashboardController.getFinancialOverview)

// Orders pending confirmation
router.get('/pending-orders', dashboardController.getPendingOrders)

// Top 7 best selling products
router.get('/top-products', dashboardController.getTopProducts)

// Top customers by highest spend
router.get('/top-customers', dashboardController.getTopCustomers)

// Most used voucher
router.get('/top-vouchers', dashboardController.getTopVouchers)

// Monthly revenue chart
router.get('/revenue-chart', dashboardController.getRevenueChart)

export default router
