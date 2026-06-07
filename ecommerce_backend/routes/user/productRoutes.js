import express from 'express'
import {
  getAllProducts,
  getFeaturedProducts,
  getProductById,
} from '../../controllers/user/productController.js'
import { validate } from '../../middleware/validationMiddleware.js'
import { getAllProductsSchema, getProductByIdSchema } from '../../validations/userValidation.js'

const router = express.Router()

// 🌟 Featured products (phải đặt trước /:id)
router.get('/featured', getFeaturedProducts)

// 🛍️ Get all products (with filters)
router.get('/', validate(getAllProductsSchema), getAllProducts)

// 📦 Get product by ID (phải đặt cuối cùng)
router.get('/:id', validate(getProductByIdSchema), getProductById)

export default router
