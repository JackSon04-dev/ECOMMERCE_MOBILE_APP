import Product from '../models/productModel.js';
import { getOrSetCache } from './redisService.js';
import { ApiError } from '../middleware/errorMiddleware.js';

/**
 * 🛍️ Lấy tất cả sản phẩm (có filter, sort, search)
 * @param {object} queryParams - Đối tượng chứa các bộ lọc { tag, sortBy, search }
 * @param {string} queryParams.tag - Thẻ/Nhãn sản phẩm cần lọc
 * @param {string} queryParams.sortBy - Tiêu chí sắp xếp sản phẩm
 * @param {string} queryParams.search - Từ khóa tìm kiếm tên/mô tả sản phẩm
 * @returns {Promise<array>} Mảng chứa danh sách các sản phẩm thỏa mãn điều kiện
 */
export const getAllProducts = async ({ tag, sortBy, search, lastId, limit = 20 }) => {
  // Tạo khóa Cache chứa đủ các trường lọc, bao gồm cả lastId và limit để tránh cache collision giữa các trang
  const cacheKey = `ecom:products:all:tag_${tag || 'all'}:sort_${sortBy || 'newest'}:search_${search || 'none'}:lastId_${lastId || 'none'}:limit_${limit}`;

  // Dùng getOrSetCache thay vì gọi trực tiếp DB
  const products = await getOrSetCache(cacheKey, 600, async () => {
    // Build query
    let query = { isActive: true };

    // Filter by tag
    if (tag) {
      query.tags = tag;
    }

    // Search by name, description, or tags
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { shortDescription: { $regex: search, $options: 'i' } },
        { tags: { $regex: search, $options: 'i' } }
      ];
    }

    // Phân trang Cursor-based (Keyset pagination) dựa trên lastId
    if (lastId) {
      const lastProduct = await Product.findById(lastId);
      if (lastProduct) {
        const lastCreatedAt = lastProduct.createdAt;
        const lastPrice = lastProduct.finalPrice || lastProduct.price;
        const lastSoldCount = lastProduct.soldCount || 0;

        let paginationQuery = null;

        if (sortBy === 'price_asc' || sortBy === 'price-asc') {
          paginationQuery = {
            $or: [
              { finalPrice: { $gt: lastPrice } },
              { finalPrice: lastPrice, _id: { $gt: lastProduct._id } }
            ]
          };
        } else if (sortBy === 'price_desc' || sortBy === 'price-desc') {
          paginationQuery = {
            $or: [
              { finalPrice: { $lt: lastPrice } },
              { finalPrice: lastPrice, _id: { $lt: lastProduct._id } }
            ]
          };
        } else if (sortBy === 'best_selling' || sortBy === 'best-selling') {
          paginationQuery = {
            $or: [
              { soldCount: { $lt: lastSoldCount } },
              { soldCount: lastSoldCount, createdAt: { $lt: lastCreatedAt } },
              { soldCount: lastSoldCount, createdAt: lastCreatedAt, _id: { $lt: lastProduct._id } }
            ]
          };
        } else { // 'newest' hoặc mặc định
          paginationQuery = {
            $or: [
              { createdAt: { $lt: lastCreatedAt } },
              { createdAt: lastCreatedAt, _id: { $lt: lastProduct._id } }
            ]
          };
        }

        if (paginationQuery) {
          query = { $and: [query, paginationQuery] };
        }
      }
    }

    // Build sort
    let sort = {};
    if (sortBy === 'newest') {
      sort.createdAt = -1;
      sort._id = -1;
    } else if (sortBy === 'price_asc' || sortBy === 'price-asc') {
      sort.finalPrice = 1;
      sort._id = 1;
    } else if (sortBy === 'price_desc' || sortBy === 'price-desc') {
      sort.finalPrice = -1;
      sort._id = -1;
    } else if (sortBy === 'best_selling' || sortBy === 'best-selling') {
      sort.soldCount = -1;
      sort.createdAt = -1;
      sort._id = -1;
    } else {
      sort.createdAt = -1;
      sort._id = -1;
    }

    return await Product.find(query).sort(sort).limit(limit);
  });

  return products;
};

/**
 * 🌟 Lấy sản phẩm nổi bật (có tag "featured")
 * @returns {Promise<array>}
 */
export const getFeaturedProducts = async () => {
  const cacheKey = 'ecom:products:featured';
  const products = await getOrSetCache(cacheKey, 600, async () => {
    return await Product.find({
      isActive: true,
      tags: 'featured'
    })
      .sort({ createdAt: -1 })
      .limit(20);
  });

  return products;
};

/**
 * 📦 Lấy chi tiết sản phẩm theo ID
 * @param {string} id - ID của sản phẩm cần lấy chi tiết
 * @returns {Promise<object>} Đối tượng thông tin sản phẩm
 */
export const getProductById = async (id) => {
  const cacheKey = `ecom:products:id_${id}`;
  const product = await getOrSetCache(cacheKey, 600, async () => {
    return await Product.findOne({
      _id: id,
      isActive: true
    });
  });

  if (!product) {
    throw new ApiError(404, 'Không tìm thấy sản phẩm');
  }

  return product;
};
