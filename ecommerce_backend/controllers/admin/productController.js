import Product from '../../models/productModel.js'
import { asyncHandler, ApiError } from '../../middleware/errorMiddleware.js'

// 1. Tạo sản phẩm mới
export const createProduct = asyncHandler(async (req, res) => {
  // 1.Get dữ liệu từ req.body và req.files
  const productData = req.body
  // 1.1 Giải mã biến colorVariants (vì gửi qua FormData nên đang là String)
  if (
    productData.colorVariants &&
    typeof productData.colorVariants === 'string'
  ) {
    productData.colorVariants = JSON.parse(productData.colorVariants)
  }
  // 1.2 Giải mã tags nếu có, vì gửi qua FormData ép kiểu nên đang là String
  if (productData.tags && typeof productData.tags === 'string') {
    productData.tags = JSON.parse(productData.tags)
  }
  // 1.3 Xử lý ảnh thumbnail từ Cloudinary
  if (req.files && req.files['thumbnail']) {
    productData.thumbnail = req.files['thumbnail'][0].path
  }
  
  // 1.4 Xử lý mảng ảnh biến thể
  if (req.files && req.files['images']) {
    const uploadedImages = req.files['images']
    if (Array.isArray(productData.colorVariants)) {
      productData.colorVariants.forEach(variant => {
        if (variant.imageUploadIndex !== undefined) {
          const file = uploadedImages[variant.imageUploadIndex]
          if (file) {
            variant.images = [file.path]
          }
        }
      })
    }
  }

  // 2. Đã đủ dữ liệu, tạo mới sản phẩm trong DB
  const product = new Product(productData)
  await product.save() // Kích hoạt pre-save để tính finalPrice
  res.status(201).json({ success: true, data: product })
});

// 2. Lấy toàn bộ sản phẩm
export const getAllProducts = asyncHandler(async (req, res) => {
  const products = await Product.find().sort({ createdAt: -1 })
  res
    .status(200)
    .json({ success: true, count: products.length, data: products })
});

// 3. Lấy sản phẩm theo ID
export const getProductByID = asyncHandler(async (req, res) => {
  const { id } = req.params
  const product = await Product.findById(id)

  if (!product) {
    throw new ApiError(404, 'Không tìm thấy sản phẩm')
  }

  // Đảm bảo sản phẩm có finalPrice để tránh lỗi Frontend
  const safeProduct = product.toObject()
  safeProduct.finalPrice =
    safeProduct.finalPrice ||
    safeProduct.price * (1 - safeProduct.discount / 100)

  res.status(200).json({ success: true, data: safeProduct })
});

// 4. Cập nhật thông tin chung và hình ảnh
export const updateProduct = asyncHandler(async (req, res) => {
  const { id } = req.params
  let updateData = { ...req.body }

  // 1. XỬ LÝ FILE ẢNH MỚI (Thumbnail chính)
  if (req.files && req.files['thumbnail']) {
    updateData.thumbnail = req.files['thumbnail'][0].path
  }

  // 2. GIẢI MÃ DỮ LIỆU TỪ FORMDATA (Sửa lỗi Cast Error)
  if (
    updateData.colorVariants &&
    typeof updateData.colorVariants === 'string'
  ) {
    updateData.colorVariants = JSON.parse(updateData.colorVariants)
  }

  // Giải mã tags
  if (updateData.tags && typeof updateData.tags === 'string') {
    updateData.tags = JSON.parse(updateData.tags)
  }

  // Xử lý mảng ảnh biến thể mới
  if (req.files && req.files['images']) {
    const uploadedImages = req.files['images']
    if (Array.isArray(updateData.colorVariants)) {
      updateData.colorVariants.forEach(variant => {
        if (variant.imageUploadIndex !== undefined) {
          const file = uploadedImages[variant.imageUploadIndex]
          if (file) {
            variant.images = [file.path]
          }
        }
      })
    }
  }

  // Xử lý Boolean cho isActive (Vì FormData gửi lên là String "true"/"false")
  if (updateData.isActive !== undefined) {
    updateData.isActive = updateData.isActive === 'true'
  }

  // 3. CẬP NHẬT VÀO DATABASE
  const product = await Product.findByIdAndUpdate(id, updateData, {
    new: true,
    runValidators: true
  })

  if (!product) {
    throw new ApiError(404, 'Không tìm thấy sản phẩm')
  }

  // 4. TÍNH LẠI FINAL PRICE (Kích hoạt middleware pre-save)
  await product.save()

  res.status(200).json({ success: true, data: product })
});

// 5. Cập nhật kho biến thể
export const updateVariantStock = asyncHandler(async (req, res) => {
  const { productId, variantId } = req.params
  const { newStock } = req.body

  const product = await Product.findOneAndUpdate(
    { _id: productId, 'variants._id': variantId },
    { $set: { 'variants.$.stock': newStock } },
    { new: true }
  )

  if (!product) {
    throw new ApiError(404, 'Không tìm thấy sản phẩm hoặc biến thể')
  }

  res.status(200).json({ success: true, data: product })
});

// 6. Xóa sản phẩm
export const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findByIdAndDelete(req.params.id)
  if (!product) {
    throw new ApiError(404, 'Không tìm thấy sản phẩm')
  }
  res.status(200).json({ success: true, message: 'Đã xóa sản phẩm' })
});

// 7. Thống kê sản phẩm
export const getProductStats = asyncHandler(async (req, res) => {
  // Tổng số sản phẩm
  const totalProducts = await Product.countDocuments()

  // Sản phẩm active vs inactive
  const activeProducts = await Product.countDocuments({ isActive: true })
  const inactiveProducts = await Product.countDocuments({ isActive: false })

  // Lấy tất cả sản phẩm để tính thống kê chi tiết
  const products = await Product.find()

  let totalStock = 0
  let outOfStockProducts = 0
  let lowStockProducts = 0
  let lowStockVariants = 0
  let outOfStockVariants = 0

  products.forEach((product) => {
    if (product.colorVariants && product.colorVariants.length > 0) {
      let productTotalStock = 0
      let hasLowStockVariant = false

      product.colorVariants.forEach((colorVariant) => {
        if (colorVariant.sizes && colorVariant.sizes.length > 0) {
          colorVariant.sizes.forEach((size) => {
            const stock = size.stock || 0
            totalStock += stock
            productTotalStock += stock

            // Đếm biến thể sắp hết (0 < stock < 5)
            if (stock > 0 && stock < 5) {
              lowStockVariants++
              hasLowStockVariant = true
            }

            // Đếm biến thể hết hàng (stock = 0)
            if (stock === 0) {
              outOfStockVariants++
            }
          })
        }
      })

      // Sản phẩm hết hàng: tổng stock = 0
      if (productTotalStock === 0) {
        outOfStockProducts++
      }
      // Sản phẩm sắp hết hàng: tổng stock > 0 và có ít nhất 1 biến thể < 5
      else if (hasLowStockVariant) {
        lowStockProducts++
      }
    }
  })

  // Giá trị trung bình
  const avgPrice =
    products.length > 0
      ? products.reduce((sum, p) => sum + (p.finalPrice || p.price), 0) /
        products.length
      : 0

  // Sản phẩm có giảm giá
  const discountedProducts = await Product.countDocuments({
    discount: { $gt: 0 }
  })

  res.status(200).json({
    success: true,
    data: {
      totalProducts,
      activeProducts,
      inactiveProducts,
      totalStock,
      outOfStockProducts,
      lowStockProducts,
      lowStockVariants,
      outOfStockVariants,
      averagePrice: Math.round(avgPrice),
      discountedProducts
    }
  })
});

