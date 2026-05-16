import Product from '../../models/productModel.js'
import { getOrSetCache } from '../../services/redisService.js'

// 🛍️ GET /api/products - Lấy tất cả sản phẩm (có filter, sort, search)
export const getAllProducts = async (req, res) => {
  try {
    const { tag, sortBy, search } = req.query

    // Tạo khóa Cache chứa đủ các trường lọc (để user search cái khác sẽ không dính cache cũ)
    const cacheKey = `ecom:products:all:tag_${tag || 'all'}:sort_${sortBy || 'newest'}:search_${search || 'none'}`

    // Dùng getOrSetCache thay vì gọi trực tiếp DB
    const products = await getOrSetCache(cacheKey, 600, async () => {
      // Build query
      let query = { isActive: true }

      // Filter by tag
      if (tag) {
        query.tags = tag
      }

      // Search by name, description, or tags
      if (search) {
        query.$or = [
          { name: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
          { shortDescription: { $regex: search, $options: 'i' } },
          { tags: { $regex: search, $options: 'i' } }
        ]
      }

      // Build sort - 4 loại sắp xếp
      let sort = {}
      if (sortBy === 'newest') {
        sort.createdAt = -1 // Mới nhất
      } else if (sortBy === 'price_asc' || sortBy === 'price-asc') {
        sort.finalPrice = 1 // Giá thấp đến cao
      } else if (sortBy === 'price_desc' || sortBy === 'price-desc') {
        sort.finalPrice = -1 // Giá cao đến thấp
      } else if (sortBy === 'best_selling' || sortBy === 'best-selling') {
        sort.soldCount = -1 // Bán chạy nhất
        sort.createdAt = -1 // Nếu soldCount bằng nhau thì sắp theo mới nhất
      } else {
        sort.createdAt = -1 // Mặc định: Mới nhất
      }

      return await Product.find(query).sort(sort)
    })

    res.status(200).json({
      success: true,
      count: products.length,
      products
    })
  } catch (error) {
    console.error('❌ Get all products error:', error)
    res.status(500).json({
      success: false,
      message: 'Không thể lấy danh sách sản phẩm',
      error: error.message
    })
  }
}

// 🌟 GET /api/products/featured - Lấy sản phẩm nổi bật (có tag "featured")
export const getFeaturedProducts = async (req, res) => {
  try {
    const cacheKey = 'ecom:products:featured'
    const products = await getOrSetCache(cacheKey, 600, async () => {
      return await Product.find({
        isActive: true,
        tags: 'featured'
      })
        .sort({ createdAt: -1 })
        .limit(10)
    })

    res.status(200).json({
      success: true,
      count: products.length,
      products
    })
  } catch (error) {
    console.error('❌ Get featured products error:', error)
    res.status(500).json({
      success: false,
      message: 'Không thể lấy sản phẩm nổi bật',
      error: error.message
    })
  }
}


// 📦 GET /api/products/:id - Lấy chi tiết sản phẩm theo ID
export const getProductById = async (req, res) => {
  try {
    const { id } = req.params

    const cacheKey = `ecom:products:id_${id}`
    const product = await getOrSetCache(cacheKey, 600, async () => {
      return await Product.findOne({
        _id: id,
        isActive: true
      })
    })

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy sản phẩm'
      })
    }

    res.status(200).json({
      success: true,
      product
    })
  } catch (error) {
    console.error('❌ Get product by id error:', error)
    res.status(500).json({
      success: false,
      message: 'Không thể lấy thông tin sản phẩm',
      error: error.message
    })
  }
}

