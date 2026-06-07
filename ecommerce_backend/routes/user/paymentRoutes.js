import express from 'express'
import {
  createPaymentUrl,
  vnpayReturn,
  vnpayIpn,
  checkPaymentStatus,
  createZalopayPaymentUrl,
  zalopayCallback,
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

// 🔍 Kiểm tra trạng thái thanh toán (cần auth)
router.get('/status/:orderId', verifyToken, validate(paymentStatusSchema), checkPaymentStatus)

// ==========================================
// THIẾT LẬP ROUTE CHO VNPAY
// ==========================================

// 💳 Tạo URL thanh toán VNPay (cần auth)
router.post('/create_payment_url', verifyToken, validate(createPaymentUrlSchema), createPaymentUrl)

// 🔄 VNPay Return URL - User redirect về đây (KHÔNG cần auth, VNPay redirect)
router.get('/vnpay_return', vnpayReturn)

// 📡 VNPay IPN - Server VNPay gọi (KHÔNG cần auth, VNPay server gọi)
router.get('/vnpay_ipn', vnpayIpn)

// ==========================================
// THIẾT LẬP ROUTE CHO ZALOPAY
// ==========================================

// 💳 Tạo URL/Mã QR thanh toán ZaloPay (cần auth)
router.post('/create_zalopay_url', verifyToken, validate(zalopayPaymentUrlSchema), createZalopayPaymentUrl)

// 📡 ZaloPay Callback - Server ZaloPay gọi (KHÔNG cần auth, ZaloPay server gọi)
router.post('/zalopay_callback', zalopayCallback)

// ==========================================
// THIẾT LẬP ROUTE CHO PAYOS (VietQR)
// ==========================================

// 💳 Tạo URL/Mã QR thanh toán PayOS (cần auth)
router.post('/create_payos_url', verifyToken, validate(payosPaymentUrlSchema), createPayosPaymentUrl)

// 🔄 PayOS Return URL - User redirect về đây sau khi thanh toán web
router.get('/payos_return', payosReturn)

// 📡 PayOS Webhook - Server PayOS gọi khi có thanh toán
router.post('/payos_webhook', payosWebhook)

export default router
