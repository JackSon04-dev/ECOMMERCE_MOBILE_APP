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

// 📖 GET /api/reviews/product/:productId - Get reviews by product (No auth required)
router.get('/product/:productId', validate(getReviewsByProductSchema), getReviewsByProduct)

// ✍️ POST /api/reviews - Create new review (Auth required)
// Note: Place validate BEFORE uploadReview to check body data before uploading image to Cloudinary! 
// Or place AFTER if uploadReview parses form-data first. 
// Normally multer parses form-data before putting text fields into req.body. Thus we should place validate(createReviewSchema) AFTER multer middleware.
router.post('/', verifyToken, uploadReview.array('images', 5), validate(createReviewSchema), createReview)

// 📦 GET /api/reviews/order/:orderId - Get reviews list by order (Auth required)
router.get('/order/:orderId', verifyToken, validate(getReviewsByOrderSchema), getReviewsByOrder)

export default router
