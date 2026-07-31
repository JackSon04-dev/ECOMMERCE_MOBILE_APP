import express from 'express'
import {
  getAllVouchers,
  createVoucher,
  updateVoucher
} from '../../controllers/admin/voucherController.js'
import { verifyToken, restrictToRoles } from '../../middleware/authMiddleware.js'

const router = express.Router()

router.use(verifyToken, restrictToRoles(['ADMIN']))

// GET /api/admin/vouchers - Get all vouchers list
router.get('/', getAllVouchers)

// POST /api/admin/vouchers - Create new voucher
router.post('/', createVoucher)

// PUT /api/admin/vouchers/:id - Update voucher
router.put('/:id', updateVoucher)

export default router
