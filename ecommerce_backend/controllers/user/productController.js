import * as productService from '../../services/productService.js';
import { asyncHandler } from '../../middleware/errorMiddleware.js';

// 🛍️ GET /api/products - Get all products (with filter, sort, search)
export const getAllProducts = asyncHandler(async (req, res) => {
  const { tag, sortBy, search, lastId, lastSoldCount, lastFinalPrice, limit } = req.query;

  const products = await productService.getAllProducts({
    tag,
    sortBy,
    search,
    lastId,
    lastSoldCount: lastSoldCount ? parseInt(lastSoldCount, 10) : null,
    lastFinalPrice: lastFinalPrice ? parseFloat(lastFinalPrice) : null,
    page: req.query.page ? parseInt(req.query.page, 10) : 1
  });

  res.status(200).json({
    success: true,
    count: products.length,
    products
  });
})

// 🌟 GET /api/products/featured - Get featured products (tagged "featured")
export const getFeaturedProducts = asyncHandler(async (req, res) => {
  const products = await productService.getFeaturedProducts();

  res.status(200).json({
    success: true,
    count: products.length,
    products
  });
});

// 📦 GET /api/products/:id - Get product details by ID
export const getProductById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const product = await productService.getProductById(id);
  res.status(200).json({
    success: true,
    product
  });
});

// 🔍 GET /api/products/autocomplete - Get keyword autocomplete suggestions
export const getAutocompleteSuggestions = asyncHandler(async (req, res) => {
  const { q } = req.query;
  const suggestions = await productService.getAutocompleteSuggestions(q);

  res.status(200).json({
    success: true,
    suggestions
  });
});

