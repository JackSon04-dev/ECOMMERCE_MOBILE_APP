import * as productService from '../../services/productService.js';
import { asyncHandler } from '../../middleware/errorMiddleware.js';

// 🛍️ GET /api/products - Lấy tất cả sản phẩm (có filter, sort, search)
export const getAllProducts = asyncHandler(async (req, res) => {
  const { tag, sortBy, search, lastId, limit } = req.query;

  const products = await productService.getAllProducts({
    tag,
    sortBy,
    search,
    lastId,
    limit: limit ? parseInt(limit, 10) : 20
  });

  res.status(200).json({
    success: true,
    count: products.length,
    products
  });
})

// 🌟 GET /api/products/featured - Lấy sản phẩm nổi bật (có tag "featured")
export const getFeaturedProducts = asyncHandler(async (req, res) => {
  const products = await productService.getFeaturedProducts();

  res.status(200).json({
    success: true,
    count: products.length,
    products
  });
});

// 📦 GET /api/products/:id - Lấy chi tiết sản phẩm theo ID
export const getProductById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const product = await productService.getProductById(id);
  res.status(200).json({
    success: true,
    product
  });
});

