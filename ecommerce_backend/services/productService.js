import Product from '../models/productModel.js';
import { getOrSetCache } from './redisService.js';
import { ApiError } from '../middleware/errorMiddleware.js';

/**
 * 🛍️ Get all products (with filter, sort, search)
 * @param {object} queryParams - Object containing filters { tag, sortBy, search }
 * @param {string} queryParams.tag - Product tag/label to filter
 * @param {string} queryParams.sortBy - Sort criteria
 * @param {string} queryParams.search - Keyword to search product name/description
 * @returns {Promise<array>} Array containing filtered product list
 */
export const getAllProducts = async ({ tag, sortBy, search, lastId, lastSoldCount, lastFinalPrice, page = 1 }) => {
  const limit = 20;

  const fetchProducts = async () => {
    // Build query
    let query = { isActive: true };

    // Filter by tag
    if (tag) {
      query.tags = tag;
    }

    // Cursor-based Keyset pagination based on lastId (Skip if Searching)
    if (lastId && !search) {
      let lPrice = lastFinalPrice;
      let lSoldCount = lastSoldCount;

      // Fallback: if older client hasn't sent these fields, have to query DB
      if (lPrice === undefined || lSoldCount === undefined) {
        const lastProduct = await Product.findById(lastId);
        if (lastProduct) {
          lPrice = lastProduct.finalPrice;
          lSoldCount = lastProduct.soldCount || 0;
        }
      }

      if (true) { // Always runs because lastId exists
        let paginationQuery = null;

        if (sortBy === 'price_asc' || sortBy === 'price-asc') {
          paginationQuery = {
            $or: [
              { finalPrice: { $gt: lPrice } },
              { finalPrice: lPrice, _id: { $gt: lastId } }
            ]
          };
        } else if (sortBy === 'price_desc' || sortBy === 'price-desc') {
          paginationQuery = {
            $or: [
              { finalPrice: { $lt: lPrice } },
              { finalPrice: lPrice, _id: { $gt: lastId } }
            ]
          };
        } else if (sortBy === 'best_selling' || sortBy === 'best-selling') {
          paginationQuery = {
            $or: [
              { soldCount: { $lt: lSoldCount } },
              { soldCount: lSoldCount, _id: { $gt: lastId } }
            ]
          };
        } else { // 'newest' or default
          if (search) {
            // When search exists, sort by _id = -1 (newest), so use $lt (less than) for lastId
            paginationQuery = { _id: { $lt: lastId } };
          } else {
            // Other APIs sort by _id = 1 (oldest), so use $gt (greater than)
            paginationQuery = { _id: { $gt: lastId } };
          }
        }

        if (paginationQuery) {
          query = { $and: [query, paginationQuery] };
        }
      }
    }

    // Build sort
    let sort = {};
    if (sortBy === 'newest') {
      sort._id = 1; // Fixed as user requested: created first appears first (oldest)
    } else if (sortBy === 'price_asc' || sortBy === 'price-asc') {
      sort.finalPrice = 1;
      sort._id = 1;
    } else if (sortBy === 'price_desc' || sortBy === 'price-desc') {
      sort.finalPrice = -1;
      sort._id = 1;
    } else if (sortBy === 'best_selling' || sortBy === 'best-selling') {
      sort.soldCount = -1;
      sort._id = 1;
    } else {
      if (!search) {
        sort._id = 1;  // Keep created first appears first for other APIs
      }
      // If search exists without specific sortBy -> sort = {} -> DB autosorts by Relevance
    }

    if (search) {
      // Force keywords to appear simultaneously (AND logic) to avoid junk results
      const andQuery = search.trim().split(/\\s+/).join(' AND ');

      // Use Atlas Search
      const pipeline = [
        {
          $search: {
            index: 'default',
            queryString: {
              defaultPath: 'name',
              query: andQuery
            }
          }
        },
        { $match: query },
        {
          $addFields: {
            score: { $meta: 'searchScore' }
          }
        }
      ];

      if (Object.keys(sort).length > 0) {
        pipeline.push({ $sort: sort });
      } else {
        // Tie-breaker: Prioritize highest accuracy score (score: -1). If tied, pick newest (_id: -1)
        pipeline.push({ $sort: { score: -1, _id: -1 } });
      }

      const skip = (page - 1) * limit;
      if (skip > 0) {
        pipeline.push({ $skip: skip });
      }
      pipeline.push({ $limit: Number(limit) });

      return await Product.aggregate(pipeline);
    } else {
      return await Product.find(query).sort(sort).limit(limit);
    }
  };

  if (search) {
    // Do not use Cache for Search because keywords vary greatly, low cache hit rate
    return await fetchProducts();
  }

  // Create Cache key (only cache normal paginated list, ignore limit as it is always 20)
  const cacheKey = `ecom:products:all:tag_${tag || 'all'}:sort_${sortBy || 'newest'}:lastId_${lastId || 'none'}`;
  return await getOrSetCache(cacheKey, 600, fetchProducts);
};

/**
 * 🌟 Get featured products (tagged "featured")
 * @returns {Promise<array>}
 */
export const getFeaturedProducts = async () => {
  const cacheKey = 'ecom:products:featured';
  const products = await getOrSetCache(cacheKey, 600, async () => {
    return await Product.find({
      isActive: true,
      tags: 'featured'
    })
      .sort({ _id: 1 }) // Changed createdAt to _id as requested earlier
      .limit(20);
  });

  return products;
};

/**
 * 📦 Get product details by ID
 * @param {string} id - ID of product to get details
 * @returns {Promise<object>} Product info object
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

/**
 * 🔍 Get keyword suggestions (Autocomplete) via Atlas Search
 * @param {string} keyword - Keyword typed by user
 * @param {number} limit - Number of suggestions
 * @returns {Promise<array>} Array containing product names
 */
export const getAutocompleteSuggestions = async (keyword, limit = 10) => {
  if (!keyword || keyword.length < 2) return [];

  const pipeline = [
    {
      $search: {
        index: 'autocomplete_index',
        autocomplete: {
          query: keyword,
          path: 'name'
        }
      }
    },
    { $match: { isActive: true } },
    { $limit: limit },
    { $project: { _id: 1, name: 1, thumbnail: 1 } }
  ];

  return await Product.aggregate(pipeline);
};
