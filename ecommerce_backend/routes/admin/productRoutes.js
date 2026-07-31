import express from 'express'
import uploadCloud from '../../config/cloudinary.js'
import * as adminController from '../../controllers/admin/productController.js'
import { verifyToken, restrictToRoles } from '../../middleware/authMiddleware.js'

const router = express.Router()

router.use(verifyToken, restrictToRoles(['ADMIN']))

// Product management:

// Get product statistics (must precede /:id)
router.get('/stats/overview', adminController.getProductStats)

// Get all products
router.get('/', adminController.getAllProducts)

// Get product by ID
router.get('/:id', adminController.getProductByID)

// Add new product, upload images to Cloudinary with multer
router.post(
  '/add',
  uploadCloud.fields([
    { name: 'thumbnail', maxCount: 1 },
    { name: 'images', maxCount: 20 }
  ]),
  adminController.createProduct
)

// Update product, upload images to Cloudinary with multer
router.put(
  '/update/:id',
  uploadCloud.fields([
    { name: 'thumbnail', maxCount: 1 },
    { name: 'images', maxCount: 20 }
  ]),
  adminController.updateProduct
)
router.delete('/delete/:id', adminController.deleteProduct) // Delete product
router.put('/stock/:productId/:variantId', adminController.updateVariantStock) // Update inventory

export default router
