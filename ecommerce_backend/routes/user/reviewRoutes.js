import express from 'express'
import {
  getReviewsByProduct,
  createReview,
  getReviewsByOrder
} from '../../controllers/user/reviewController.js'
import { verifyToken } from '../../middleware/authMiddleware.js'
import { uploadReview } from '../../config/cloudinary.js'
import { validate } from '../../middleware/validationMiddleware.js'
import {
  getReviewsByProductSchema,
  getReviewsByOrderSchema,
  createReviewSchema
} from '../../validations/userValidation.js'

const router = express.Router()

// 📖 GET /api/reviews/product/:productId - Lấy đánh giá theo sản phẩm (Không cần auth)
router.get('/product/:productId', validate(getReviewsByProductSchema), getReviewsByProduct)

// ✍️ POST /api/reviews - Tạo đánh giá mới (Cần auth)
// Lưu ý: Đặt validate TRƯỚC uploadReview để check data body trước khi upload ảnh lên Cloudinary! 
// Hoặc đặt SAU nếu uploadReview parse form-data trước. 
// Thông thường multer parse form-data mới đưa text fields vào req.body. Vì thế ta nên đặt validate(createReviewSchema) SAU multer middleware.
router.post('/', verifyToken, uploadReview.array('images', 5), validate(createReviewSchema), createReview)

// 📦 GET /api/reviews/order/:orderId - Lấy danh sách đánh giá theo đơn hàng (Cần auth)
router.get('/order/:orderId', verifyToken, validate(getReviewsByOrderSchema), getReviewsByOrder)

export default router
