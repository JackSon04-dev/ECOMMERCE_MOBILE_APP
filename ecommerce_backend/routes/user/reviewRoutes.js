import express from 'express'
import {
  getReviewsByProduct,
  createReview,
  getReviewsByOrder
} from '../../controllers/user/reviewController.js'
import { verifyToken } from '../../middleware/authMiddleware.js'
import { uploadReview } from '../../config/cloudinary.js'

const router = express.Router()

// 📖 GET /api/reviews/product/:productId - Lấy đánh giá theo sản phẩm (Không cần auth)
router.get('/product/:productId', getReviewsByProduct)

// ✍️ POST /api/reviews - Tạo đánh giá mới (Cần auth)
router.post('/', verifyToken, uploadReview.array('images', 5), createReview)

// 📦 GET /api/reviews/order/:orderId - Lấy danh sách đánh giá theo đơn hàng (Cần auth)
router.get('/order/:orderId', verifyToken, getReviewsByOrder)

export default router
