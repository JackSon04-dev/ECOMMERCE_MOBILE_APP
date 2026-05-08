import express from 'express'
import {
  createPaymentUrl,
  vnpayReturn,
  vnpayIpn,
  checkPaymentStatus,
  createZalopayPaymentUrl
} from '../../controllers/user/paymentController.js'
import { verifyToken } from '../../middleware/authMiddleware.js'

const router = express.Router()

// 💳 Tạo URL thanh toán VNPay (cần auth)
router.post('/create_payment_url', verifyToken, createPaymentUrl)

// 🔍 Kiểm tra trạng thái thanh toán (cần auth)
router.get('/status/:orderId', verifyToken, checkPaymentStatus)

// 🔄 VNPay Return URL - User redirect về đây (KHÔNG cần auth, VNPay redirect)
router.get('/vnpay_return', vnpayReturn)

// 📡 VNPay IPN - Server VNPay gọi (KHÔNG cần auth, VNPay server gọi)
router.get('/vnpay_ipn', vnpayIpn)

// 💳 Tạo URL/Mã QR thanh toán ZaloPay (cần auth)
router.post('/create_zalopay_url', verifyToken, createZalopayPaymentUrl)

export default router

