import express from 'express'
import { applyVoucher } from '../../controllers/user/voucherController.js'

const router = express.Router()

router.post('/apply', applyVoucher)

export default router
