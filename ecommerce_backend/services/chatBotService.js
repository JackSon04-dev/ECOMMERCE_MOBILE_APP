import { GoogleGenerativeAI } from '@google/generative-ai';
import crypto from 'crypto';
import Product from '../models/productModel.js';
import { getCache, setCache } from './redisService.js';
import { ApiError } from '../middleware/errorMiddleware.js';

// Initialize Gemini AI SDK
const getGeminiModel = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('⚠️ GEMINI_API_KEY chưa được cấu hình trong .env');
    return null;
  }
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({ model: 'gemini-3.5-flash-lite' });
};

/**
 * Parse User's chat message using Gemini AI to extract search filters
 */
const parseIntentWithGemini = async (userMessage) => {
  const model = getGeminiModel();
  if (!model) {
    return {
      openingMessage: `Dạ shop em tìm thấy các sản phẩm phù hợp với từ khóa "${userMessage}":`,
      searchKeyword: userMessage,
      tag: null,
      minPrice: null,
      maxPrice: null,
      minDiscount: null,
      minRating: null,
      color: null,
      size: null,
      sortBy: null
    };
  }

  const prompt = `
Bạn là trợ lý tư vấn tìm kiếm sản phẩm cho cửa hàng E-Commerce quần áo thời trang S-Shop.
Nhiệm vụ: Phân tích câu thoại của khách hàng và trích xuất tham số tìm kiếm dưới dạng định dạng JSON thuần túy (JSON object), KHÔNG chứa markdown (\`\`\`json) hay văn bản thừa nào khác.

💡 RÀNG BUỘC DỮ LIỆU CỦA SHOP (BẮT BUỘC TUÂN THỦ):
- Màu sắc hiện có: Đen, Trắng, Đỏ, Xanh Rêu, Xám, Be, Xám Nâu, Xanh Đen, Kem.
- Kích cỡ (size) hiện có: Áo/Quần (M, L, XL), Giày (39, 40, 41).
- Khoảng giá: 150.000 VNĐ đến 450.000 VNĐ.
- Giảm giá tối đa: 0 - 30%, nếu khách hàng yêu cầu không giảm giá hay giảm 0% thì set minDiscount = 0.
- Danh mục sản phẩm (tag): 'aothun', 'aosomi', 'quan', 'giay'.

⚠️ QUY TẮC XỬ LÝ KHI KHÁCH YÊU CẦU NGOÀI RÀNG BUỘC:
Nếu khách yêu cầu 1 thuộc tính KHÔNG CÓ trong danh sách trên (ví dụ: màu Vàng, size XXL, giá dưới 100k, giảm 50%):
1. Đặt thuộc tính đó là null trong JSON (để không bị lỗi query).
2. Trong "openingMessage", gửi lời xin lỗi khéo léo và đề xuất các giá trị hợp lệ có sẵn. (VD: "Dạ xin lỗi bạn, shop hiện không có màu Vàng và size XXL. Shop đang có sẵn các màu Đen, Trắng... size M, L, XL. Bạn tham khảo các mẫu dưới đây nhé:")

Cấu trúc JSON bắt buộc:
{
  "openingMessage": "Một câu mở lời lịch sự, thân thiện bằng tiếng Việt (kèm xin lỗi/đề xuất nếu khách yêu cầu ngoài lề)",
  "tag": "Xác định LOẠI SẢN PHẨM để map vào tag. Phải là 1 trong các giá trị: 'aothun', 'aosomi', 'quan', 'giay' hoặc null",
  "searchKeyword": "Từ khóa tìm kiếm TÊN RIÊNG của sản phẩm, hoặc ĐẶC ĐIỂM (VD: 'cổ tàu', 'jeans', 'short'). KHÔNG GHI LẠI loại sản phẩm (như áo sơ mi, áo thun, giày, quần). BỎ QUA các từ chung chung (như rẻ, đẹp, cao cấp). Ghi null nếu không có",
  "minPrice": Số nguyên thể hiện giá thấp nhất (VNĐ) hoặc null,
  "maxPrice": Số nguyên thể hiện giá cao nhất (VNĐ) (VD: 200k -> 200000) hoặc null,
  "minDiscount": Số phần trăm giảm giá tối thiểu (VD: giảm trên 30% -> 30) hoặc null,
  "minRating": Số thực đánh giá tối thiểu (VD: đánh giá tốt/cao -> 4.0) hoặc null,
  "color": "Màu sắc (chỉ lấy trong danh sách có sẵn) hoặc null",
  "size": "Kích cỡ (chỉ lấy trong danh sách có sẵn) hoặc null",
  "sortBy": "Tiêu chí sắp xếp: 'price_asc', 'price_desc', 'discount_desc', 'rating_desc', 'best_selling', 'newest' hoặc null"
}

Ví dụ 1 (Hợp lệ):
Khách chat: "Áo thun đen cổ tròn giảm trên 30% giá dưới 200k"
JSON:
{
  "openingMessage": "Dạ shop em có các mẫu áo thun màu đen cổ tròn đang giảm giá lớn, giá dưới 200k đây ạ:",
  "tag": "aothun",
  "searchKeyword": "cổ tròn",
  "minPrice": null,
  "maxPrice": 200000,
  "minDiscount": 30,
  "minRating": null,
  "color": "Đen",
  "size": null,
  "sortBy": "discount_desc"
}

Ví dụ 2 (Ngoài ràng buộc):
Khách chat: "Tôi muốn mua giày màu Hồng size 43"
JSON:
{
  "openingMessage": "Dạ xin lỗi bạn, shop hiện không có giày màu Hồng và size 43 ạ. Shop xin đề xuất các mẫu giày có màu Trắng, Đen, Be... với size 39, 40, 41 cho bạn tham khảo nhé:",
  "tag": "giay",
  "searchKeyword": null,
  "minPrice": null,
  "maxPrice": null,
  "minDiscount": null,
  "minRating": null,
  "color": null,
  "size": null,
  "sortBy": null
}

Câu thoại của khách hàng: "${userMessage}"
Hãy xuất ra đúng JSON:
`;

  try {
    const result = await model.generateContent(prompt);
    const textResponse = result.response.text().trim();

    const cleanedText = textResponse.replace(new RegExp('^`{3}json\\s*', 'i'), '').replace(new RegExp('`{3}$', 'i'), '').trim();
    const parsed = JSON.parse(cleanedText);
    return parsed;
  } catch (error) {
    console.error('❌ Lỗi khi phân tích bằng Gemini AI:', error.message);

    // If error due to Quota exceeded (429) or Gemini server down (503)
    if (error.message.includes('429') || error.message.includes('quota') || error.message.includes('503')) {
      return {
        openingMessage: `Dạ hệ thống AI tư vấn của shop đang quá tải (hoặc hết lượt). Shop đang tạm chuyển sang chế độ tìm kiếm cơ bản cho từ khóa "${userMessage}":`,
        searchKeyword: userMessage,
        tag: null,
        minPrice: null,
        maxPrice: null,
        minDiscount: null,
        minRating: null,
        color: null,
        size: null,
        sortBy: null
      };
    }

    // Other errors (e.g. JSON parse failed)
    return {
      openingMessage: `Dạ shop tìm thấy các sản phẩm gần giống với yêu cầu của bạn đây ạ:`,
      searchKeyword: userMessage,
      tag: null,
      minPrice: null,
      maxPrice: null,
      minDiscount: null,
      minRating: null,
      color: null,
      size: null,
      sortBy: null
    };
  }
};

/**
 * Build Mongoose Query & Sort from extracted data
 */
const buildMongooseQuery = (extracted) => {
  const query = { isActive: true };

  if (extracted.searchKeyword) {
    query.$or = [
      { name: { $regex: extracted.searchKeyword, $options: 'i' } },
      { shortDescription: { $regex: extracted.searchKeyword, $options: 'i' } }
    ];
  }

  if (extracted.tag) {
    query.tags = extracted.tag;
  }

  if (extracted.minPrice !== null || extracted.maxPrice !== null) {
    query.finalPrice = {};
    if (extracted.minPrice !== null && extracted.minPrice !== undefined) {
      query.finalPrice.$gte = Number(extracted.minPrice);
    }
    if (extracted.maxPrice !== null && extracted.maxPrice !== undefined) {
      query.finalPrice.$lte = Number(extracted.maxPrice);
    }
  }

  if (extracted.minDiscount) {
    query.discount = { $gte: Number(extracted.minDiscount) };
  }

  if (extracted.minRating) {
    query.averageRating = { $gte: Number(extracted.minRating) };
  }

  if (extracted.color) {
    query['colorVariants.color'] = { $regex: extracted.color, $options: 'i' };
  }

  if (extracted.size) {
    query['colorVariants.sizes.size'] = { $regex: new RegExp(`^${extracted.size}$`, 'i') };
  }

  let sort = { createdAt: -1 };
  if (extracted.sortBy === 'price_asc') sort = { finalPrice: 1 };
  if (extracted.sortBy === 'price_desc') sort = { finalPrice: -1 };
  if (extracted.sortBy === 'discount_desc') sort = { discount: -1 };
  if (extracted.sortBy === 'rating_desc') sort = { averageRating: -1 };
  if (extracted.sortBy === 'best_selling') sort = { soldCount: -1 };

  return { query, sort };
};

/**
 * Format product Card info to optimize bandwidth
 */
const formatProductCard = (p) => ({
  id: p._id.toString(),
  name: p.name,
  price: p.price,
  discount: p.discount,
  finalPrice: p.finalPrice,
  thumbnail: p.thumbnail,
  averageRating: p.averageRating
});

/**
 * 🔍 API 1: Chatbot Search (Uses Global Intent Cache)
 */
export const searchChatbot = async ({ message }) => {
  if (!message || !message.trim()) {
    throw new ApiError(400, 'Vui lòng nhập tin nhắn tìm kiếm.');
  }
  const cleanMsg = message.trim();

  // 1. Get extracted parameters from Gemini
  const extracted = await parseIntentWithGemini(cleanMsg);

  // 2. Create core Intent object (Omit openingMessage since greeting might differ)
  const intentParams = {
    tag: extracted.tag,
    searchKeyword: extracted.searchKeyword,
    minPrice: extracted.minPrice,
    maxPrice: extracted.maxPrice,
    minDiscount: extracted.minDiscount,
    minRating: extracted.minRating,
    color: extracted.color,
    size: extracted.size,
    sortBy: extracted.sortBy
  };

  // 3. Encode to Base64 to create safe sessionId for URL
  const intentString = JSON.stringify(intentParams);
  const sessionId = Buffer.from(intentString).toString('base64url');

  // 4. Create Global Cache Key from Hash of intentParams (Shared among users with same intent)
  const redisKey = `chat_intent:${crypto.createHash('md5').update(intentString).digest('hex')}`;

  let sessionData = await getCache(redisKey);

  // 5. If no Cache exists then Query Database and save Cache
  if (!sessionData) {
    const { query, sort } = buildMongooseQuery(intentParams);

    const products = await Product.find(query)
      .sort(sort)
      .select('_id name price discount finalPrice thumbnail averageRating')
      .limit(100)
      .lean();

    const formattedProducts = products.map(formatProductCard);

    sessionData = {
      items: formattedProducts,
      totalFetched: formattedProducts.length,
      hasMore: formattedProducts.length >= 100
    };

    await setCache(redisKey, sessionData, 1200); // 20 minutes TTL
  }

  const firstBatch = sessionData.items.slice(0, 20);

  return {
    sessionId, // Return base64 sessionId for client to call loadmore
    reply: extracted.openingMessage,
    products: firstBatch,
    page: 1,
    pageSize: 20,
    hasMore: sessionData.items.length > 20 || sessionData.hasMore,
  };
};

/**
 * 🔄 API 2: Paginate Load More products based on SessionId (Self-recovers without Gemini)
 */
export const loadMoreChatbot = async ({ sessionId, page = 2 }) => {
  if (!sessionId) {
    throw new ApiError(400, 'Thiếu sessionId để tải thêm dữ liệu.');
  }

  // 1. Restore intentParams from sessionId
  let intentParams;
  let intentString;
  try {
    intentString = Buffer.from(sessionId, 'base64url').toString('utf8');
    intentParams = JSON.parse(intentString);
  } catch (error) {
    throw new ApiError(400, 'SessionId không hợp lệ.');
  }

  // 2. Find Cache
  const redisKey = `chat_intent:${crypto.createHash('md5').update(intentString).digest('hex')}`;
  let sessionData = await getCache(redisKey);

  const pageNum = Number(page);
  const startIndex = (pageNum - 1) * 20;
  const endIndex = pageNum * 20;

  // 3. If Redis dies or Session expires -> Restore from MongoDB without Gemini!
  if (!sessionData) {
    console.log(`🔄 Tái tạo in-memory cache cho intent: ${intentString}`);
    const { query, sort } = buildMongooseQuery(intentParams);

    if (pageNum <= 10) {
      // Optimization tip: Restore first 100 or 200 items to satisfy current page
      const limitToFetch = pageNum <= 5 ? 100 : 200;
      const products = await Product.find(query)
        .sort(sort)
        .select('_id name price discount finalPrice thumbnail averageRating')
        .limit(limitToFetch)
        .lean();

      const formattedProducts = products.map(formatProductCard);

      sessionData = {
        items: formattedProducts,
        totalFetched: formattedProducts.length,
        hasMore: formattedProducts.length >= limitToFetch
      };

      await setCache(redisKey, sessionData, 1200);
    } else {
      // If calling page too deep (> 10), scrape exactly 20 items from DB and return, bypass Cache to save RAM
      const products = await Product.find(query)
        .sort(sort)
        .skip(startIndex)
        .limit(20)
        .select('_id name price discount finalPrice thumbnail averageRating')
        .lean();

      const batch = products.map(formatProductCard);
      return {
        sessionId,
        reply: batch.length > 0
          ? `Danh sách sản phẩm (Trang ${pageNum}):`
          : 'Đã hiển thị hết toàn bộ sản phẩm phù hợp. Bạn có thể mô tả chi tiết hơn để shop tìm lại nhé!',
        products: batch,
        page: pageNum,
        pageSize: 20,
        totalInSession: startIndex + batch.length,
        hasMore: batch.length === 20,
        suggestRefine: batch.length === 0
      };
    }
  }

  // 5. If Redis doesn't have enough items for this page and DB still has data (hasMore = true)
  if (sessionData.items.length < endIndex && sessionData.hasMore) {
    const { query, sort } = buildMongooseQuery(intentParams);

    const newProducts = await Product.find(query)
      .sort(sort)
      .skip(sessionData.totalFetched)
      .limit(100)
      .select('_id name price discount finalPrice thumbnail averageRating')
      .lean();

    const formattedNew = newProducts.map(formatProductCard);
    sessionData.items.push(...formattedNew);
    sessionData.totalFetched += formattedNew.length;

    if (newProducts.length < 100) {
      sessionData.hasMore = false;
    }

    await setCache(redisKey, sessionData, 1800);
  }

  const batch = sessionData.items.slice(startIndex, endIndex);
  const hasMore = sessionData.items.length > endIndex || sessionData.hasMore;

  return {
    sessionId, // Keep sessionId unchanged
    reply: batch.length > 0
      ? `Danh sách sản phẩm (Trang ${pageNum}):`
      : 'Đã hiển thị hết toàn bộ sản phẩm phù hợp. Bạn có thể mô tả chi tiết hơn để shop tìm lại nhé!',
    products: batch,
    page: pageNum,
    pageSize: 20,
    totalInSession: sessionData.items.length,
    hasMore: hasMore,
    suggestRefine: !hasMore && batch.length === 0
  };
};
