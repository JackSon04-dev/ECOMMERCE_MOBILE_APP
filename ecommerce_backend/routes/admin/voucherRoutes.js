import express from 'express'
import {
  getAllVouchers,
  createVoucher,
  updateVoucher
} from '../../controllers/admin/voucherController.js'
import { verifyToken, restrictToRoles } from '../../middleware/authMiddleware.js'

const router = express.Router()

router.use(verifyToken, restrictToRoles(['ADMIN']))

// GET /api/admin/vouchers - Lấy danh sách tất cả vouchers
router.get('/', getAllVouchers)

// POST /api/admin/vouchers - Tạo voucher mới
router.post('/', createVoucher)

// PUT /api/admin/vouchers/:id - Cập nhật voucher
router.put('/:id', updateVoucher)

export default router
