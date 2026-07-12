import express from 'express'
import uploadCloud from '../../config/cloudinary.js'
import * as adminController from '../../controllers/admin/productController.js'
import { verifyToken, restrictToRoles } from '../../middleware/authMiddleware.js'

const router = express.Router()

router.use(verifyToken, restrictToRoles(['ADMIN']))

// Quản lý sản phẩm:

// Lấy thống kê sản phẩm (phải đặt trước /:id)
router.get('/stats/overview', adminController.getProductStats)

// Lấy tất cả sản phẩm
router.get('/', adminController.getAllProducts)

// Lấy sản phẩm theo ID
router.get('/:id', adminController.getProductByID)

// Thêm sản phẩm mới, upload hình ảnh lên Cloudinary với multer
router.post(
  '/add',
  uploadCloud.fields([
    { name: 'thumbnail', maxCount: 1 },
    { name: 'images', maxCount: 20 }
  ]),
  adminController.createProduct
)

// Cập nhật sản phẩm mới, upload hình ảnh lên Cloudinary với multer
router.put(
  '/update/:id',
  uploadCloud.fields([
    { name: 'thumbnail', maxCount: 1 },
    { name: 'images', maxCount: 20 }
  ]),
  adminController.updateProduct
)
router.delete('/delete/:id', adminController.deleteProduct) // Xóa sản phẩm
router.put('/stock/:productId/:variantId', adminController.updateVariantStock) // Cập nhật kho

export default router
