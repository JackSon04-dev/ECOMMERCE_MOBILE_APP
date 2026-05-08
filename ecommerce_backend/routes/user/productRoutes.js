import express from 'express'
import {
  getAllProducts,
  getFeaturedProducts,
  getProductById,
} from '../../controllers/user/productController.js'

const router = express.Router()

// 🌟 Featured products (phải đặt trước /:id)
router.get('/featured', getFeaturedProducts)


// 🛍️ Get all products (with filters)
router.get('/', getAllProducts)


// 📦 Get product by ID (phải đặt cuối cùng)
router.get('/:id', getProductById)

export default router
