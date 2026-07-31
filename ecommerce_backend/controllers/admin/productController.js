import Product from '../../models/productModel.js'
import { asyncHandler, ApiError } from '../../middleware/errorMiddleware.js'

// 1. Create new product
export const createProduct = asyncHandler(async (req, res) => {
  // 1. Get data from req.body and req.files
  const productData = req.body
  // 1.1 Decode colorVariants variable (sent via FormData so it is a String)
  if (
    productData.colorVariants &&
    typeof productData.colorVariants === 'string'
  ) {
    productData.colorVariants = JSON.parse(productData.colorVariants)
  }
  // 1.2 Decode tags if any, cast via FormData so it is a String
  if (productData.tags && typeof productData.tags === 'string') {
    productData.tags = JSON.parse(productData.tags)
  }
  // 1.3 Process thumbnail image from Cloudinary
  if (req.files && req.files['thumbnail']) {
    productData.thumbnail = req.files['thumbnail'][0].path
  }

  // 1.4 Process variant images array
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

  // 2. Data is ready, create new product in DB
  const product = new Product(productData)
  await product.save() // Trigger pre-save to calculate finalPrice
  res.status(201).json({ success: true, data: product })
});

// 2. Get all products
export const getAllProducts = asyncHandler(async (req, res) => {
  const products = await Product.find().sort({ createdAt: -1 })
  res
    .status(200)
    .json({ success: true, count: products.length, data: products })
});

// 3. Get product by ID
export const getProductByID = asyncHandler(async (req, res) => {
  const { id } = req.params
  const product = await Product.findById(id)

  if (!product) {
    throw new ApiError(404, 'Không tìm thấy sản phẩm')
  }

  // Ensure product has finalPrice to avoid Frontend error
  const safeProduct = product.toObject()
  safeProduct.finalPrice =
    safeProduct.finalPrice ||
    safeProduct.price * (1 - safeProduct.discount / 100)

  res.status(200).json({ success: true, data: safeProduct })
});

// 4. Update general info and images
export const updateProduct = asyncHandler(async (req, res) => {
  const { id } = req.params
  let updateData = { ...req.body }

  // 1. PROCESS NEW IMAGE FILE (Main Thumbnail)
  if (req.files && req.files['thumbnail']) {
    updateData.thumbnail = req.files['thumbnail'][0].path
  }

  // 2. DECODE DATA FROM FORMDATA (Fix Cast Error)
  if (
    updateData.colorVariants &&
    typeof updateData.colorVariants === 'string'
  ) {
    updateData.colorVariants = JSON.parse(updateData.colorVariants)
  }

  // Decode tags
  if (updateData.tags && typeof updateData.tags === 'string') {
    updateData.tags = JSON.parse(updateData.tags)
  }

  // Process new variant images array
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

  // Process Boolean for isActive (FormData sends it as String "true"/"false")
  if (updateData.isActive !== undefined) {
    updateData.isActive = updateData.isActive === 'true'
  }

  // 3. UPDATE DATABASE
  const product = await Product.findByIdAndUpdate(id, updateData, {
    new: true,
    runValidators: true
  })

  if (!product) {
    throw new ApiError(404, 'Không tìm thấy sản phẩm')
  }

  // 4. RECALCULATE FINAL PRICE (Trigger pre-save middleware)
  await product.save()

  res.status(200).json({ success: true, data: product })
});

// 5. Update variant inventory
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

// 6. Delete product
export const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findByIdAndDelete(req.params.id)
  if (!product) {
    throw new ApiError(404, 'Không tìm thấy sản phẩm')
  }
  res.status(200).json({ success: true, message: 'Đã xóa sản phẩm' })
});

// 7. Product statistics
export const getProductStats = asyncHandler(async (req, res) => {
  // Total products
  const totalProducts = await Product.countDocuments()

  // Active vs inactive products
  const activeProducts = await Product.countDocuments({ isActive: true })
  const inactiveProducts = await Product.countDocuments({ isActive: false })

  // Get all products for detailed statistics
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

            // Count variants running low (0 < stock < 5)
            if (stock > 0 && stock < 5) {
              lowStockVariants++
              hasLowStockVariant = true
            }

            // Count out of stock variants (stock = 0)
            if (stock === 0) {
              outOfStockVariants++
            }
          })
        }
      })

      // Out of stock products: total stock = 0
      if (productTotalStock === 0) {
        outOfStockProducts++
      }
      // Products running low: total stock > 0 and at least 1 variant < 5
      else if (hasLowStockVariant) {
        lowStockProducts++
      }
    }
  })

  // Average value
  const avgPrice =
    products.length > 0
      ? products.reduce((sum, p) => sum + (p.finalPrice || p.price), 0) /
      products.length
      : 0

  // Discounted products
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

