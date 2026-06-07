import * as productService from '../../services/productService.js';

// 🛍️ GET /api/products - Lấy tất cả sản phẩm (có filter, sort, search)
export const getAllProducts = async (req, res) => {
  try {
    const { tag, sortBy, search } = req.query;

    const products = await productService.getAllProducts({ tag, sortBy, search });

    res.status(200).json({
      success: true,
      count: products.length,
      products
    });
  } catch (error) {
    console.error('❌ Get all products error:', error);
    res.status(500).json({
      success: false,
      message: 'Không thể lấy danh sách sản phẩm',
      error: error.message
    });
  }
};

// 🌟 GET /api/products/featured - Lấy sản phẩm nổi bật (có tag "featured")
export const getFeaturedProducts = async (req, res) => {
  try {
    const products = await productService.getFeaturedProducts();

    res.status(200).json({
      success: true,
      count: products.length,
      products
    });
  } catch (error) {
    console.error('❌ Get featured products error:', error);
    res.status(500).json({
      success: false,
      message: 'Không thể lấy sản phẩm nổi bật',
      error: error.message
    });
  }
};

// 📦 GET /api/products/:id - Lấy chi tiết sản phẩm theo ID
export const getProductById = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await productService.getProductById(id);

    res.status(200).json({
      success: true,
      product
    });
  } catch (error) {
    console.error('❌ Get product by id error:', error);
    const statusCode = error.message.includes('tìm thấy') ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Không thể lấy thông tin sản phẩm',
      error: error.message
    });
  }
};
