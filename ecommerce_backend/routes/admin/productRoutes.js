import express from 'express'
import uploadCloud from '../../config/cloudinary.js'
import * as adminController from '../../controllers/admin/productController.js'

const router = express.Router()

// Quản lý sản phẩm:

// Lấy thống kê sản phẩm (phải đặt trước /:id)
router.get('/stats/overview', adminController.getProductStats)

// Lấy tất cả sản phẩm
router.get('/', adminController.getAllProducts)

// Lấy sản phẩm theo ID
router.get('/:id', adminController.getProductByID)

// Thêm sản phẩm mới, upload hình ảnh lên Cloudinary với multer và trả về url
router.post(
  '/add',
  uploadCloud.fields([
    { name: 'thumbnail', maxCount: 1 },
    { name: 'images', maxCount: 5 }
  ]),
  adminController.createProduct
)

// Cập nhật sản phẩm mới, upload hình ảnh lên Cloudinary với multer và trả về url nếu có
router.put(
  '/update/:id',
  uploadCloud.fields([{ name: 'thumbnail', maxCount: 1 }]),
  adminController.updateProduct
)
router.delete('/delete/:id', adminController.deleteProduct) // Xóa sản phẩm
router.put('/stock/:productId/:variantId', adminController.updateVariantStock) // Cập nhật kho

// ROUTE MỚI: Chỉ dùng để upload ảnh variant riêng lẻ và trả về URL ngay lập tức
router.post('/upload-single', uploadCloud.single('thumbnail'), (req, res) => {
  try {
    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, message: 'Không có file nào được chọn' })
    }

    // Trả về URL ảnh từ Cloudinary ngay lập tức
    res.status(200).json({
      success: true,
      data: {
        url: req.file.path // Đường dẫn ảnh trên Cloudinary
      }
    })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})
export default router
