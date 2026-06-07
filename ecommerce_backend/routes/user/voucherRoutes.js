import express from 'express'
import { applyVoucher } from '../../controllers/user/voucherController.js'
import { validate } from '../../middleware/validationMiddleware.js'
import { applyVoucherSchema } from '../../validations/userValidation.js'

const router = express.Router()

router.post('/apply', validate(applyVoucherSchema), applyVoucher)

export default router
