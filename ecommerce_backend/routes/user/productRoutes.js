import express from 'express'
import {
  getAllProducts,
  getFeaturedProducts,
  getProductById,
  getAutocompleteSuggestions,
} from '../../controllers/user/productController.js'
import { validate } from '../../middleware/validationMiddleware.js'
import { getAllProductsSchema, getProductByIdSchema } from '../../validations/userValidation.js'

const router = express.Router()

// 🌟 Featured products (must precede /:id)
router.get('/featured', getFeaturedProducts)

// 🔍 Autocomplete (must precede /:id)
router.get('/autocomplete', getAutocompleteSuggestions)

// 🛍️ Get all products (with filters)
router.get('/', validate(getAllProductsSchema), getAllProducts)

// 📦 Get product by ID (must be placed last)
router.get('/:id', validate(getProductByIdSchema), getProductById)

export default router
