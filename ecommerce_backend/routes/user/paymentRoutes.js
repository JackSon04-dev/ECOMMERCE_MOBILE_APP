import express from 'express'
import {
  createPaymentUrl,
  vnpayReturn,
  checkPaymentStatus,
  createZalopayPaymentUrl,
  createPayosPaymentUrl,
  payosReturn,
  payosWebhook
} from '../../controllers/user/paymentController.js'
import { verifyToken } from '../../middleware/authMiddleware.js'
import { validate } from '../../middleware/validationMiddleware.js'
import {
  paymentStatusSchema,
  createPaymentUrlSchema,
  zalopayPaymentUrlSchema,
  payosPaymentUrlSchema
} from '../../validations/userValidation.js'

const router = express.Router()

// 🔍 Check payment status (auth required)
router.get('/status/:orderId', verifyToken, validate(paymentStatusSchema), checkPaymentStatus)

// ==========================================
// VNPAY ROUTE SETUP
// ==========================================

// 💳 Create VNPay payment URL (auth required)
router.post('/create_payment_url', verifyToken, validate(createPaymentUrlSchema), createPaymentUrl)

// 🔄 VNPay Return URL - User redirects here (NO auth required, VNPay redirect)
router.get('/vnpay_return', vnpayReturn)



// ==========================================
// ZALOPAY ROUTE SETUP
// ==========================================

// 💳 Create ZaloPay payment URL/QR Code (auth required)
router.post('/create_zalopay_url', verifyToken, validate(zalopayPaymentUrlSchema), createZalopayPaymentUrl)



// ==========================================
// PAYOS ROUTE SETUP (VietQR)
// ==========================================

// 💳 Create PayOS payment URL/QR Code (auth required)
router.post('/create_payos_url', verifyToken, validate(payosPaymentUrlSchema), createPayosPaymentUrl)

// 🔄 PayOS Return URL - User redirects here after web payment
router.get('/payos_return', payosReturn)

// 📡 PayOS Webhook - PayOS Server calls on payment
router.post('/payos_webhook', payosWebhook)

export default router
