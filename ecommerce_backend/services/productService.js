import Product from '../models/productModel.js';
import { getOrSetCache } from './redisService.js';

/**
 * 🛍️ Lấy tất cả sản phẩm (có filter, sort, search)
 * @param {object} queryParams - Đối tượng chứa các bộ lọc { tag, sortBy, search }
 * @param {string} queryParams.tag - Thẻ/Nhãn sản phẩm cần lọc
 * @param {string} queryParams.sortBy - Tiêu chí sắp xếp sản phẩm
 * @param {string} queryParams.search - Từ khóa tìm kiếm tên/mô tả sản phẩm
 * @returns {Promise<array>} Mảng chứa danh sách các sản phẩm thỏa mãn điều kiện
 */
export const getAllProducts = async ({ tag, sortBy, search }) => {
  // Tạo khóa Cache chứa đủ các trường lọc
  const cacheKey = `ecom:products:all:tag_${tag || 'all'}:sort_${sortBy || 'newest'}:search_${search || 'none'}`;

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

    // Build sort - 4 loại sắp xếp
    let sort = {};
    if (sortBy === 'newest') {
      sort.createdAt = -1; // Mới nhất
    } else if (sortBy === 'price_asc' || sortBy === 'price-asc') {
      sort.finalPrice = 1; // Giá thấp đến cao
    } else if (sortBy === 'price_desc' || sortBy === 'price-desc') {
      sort.finalPrice = -1; // Giá cao đến thấp
    } else if (sortBy === 'best_selling' || sortBy === 'best-selling') {
      sort.soldCount = -1; // Bán chạy nhất
      sort.createdAt = -1; // Nếu soldCount bằng nhau thì sắp theo mới nhất
    } else {
      sort.createdAt = -1; // Mặc định: Mới nhất
    }

    return await Product.find(query).sort(sort);
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
      .limit(10);
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
    throw new Error('Không tìm thấy sản phẩm');
  }

  return product;
};
