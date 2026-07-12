import Review from '../models/reviewModel.js';
import Product from '../models/productModel.js';
import Order from '../models/orderModel.js';
import { deleteCache } from './redisService.js';
import { ApiError } from '../middleware/errorMiddleware.js';

/**
 * 📖 Lấy tất cả đánh giá theo sản phẩm
 * @param {string} productId - ID của sản phẩm cần lấy danh sách đánh giá
 * @returns {Promise<array>} Mảng chứa danh sách các đánh giá của sản phẩm
 */
export const getReviewsByProduct = async (productId) => {
  return await Review.find({
    product: productId,
    isActive: true
  })
    .populate('user', 'username')
    .sort({ createdAt: -1 });
};

/**
 * 📦 Lấy tất cả đánh giá của một đơn hàng
 * @param {string} orderId - ID của đơn hàng cần lấy danh sách đánh giá
 * @param {string} userId - ID của người dùng sở hữu đơn hàng
 * @returns {Promise<array>} Mảng chứa danh sách các đánh giá thuộc đơn hàng
 */
export const getReviewsByOrder = async (orderId, userId) => {
  return await Review.find({
    user: userId,
    order: orderId
  });
};

/**
 * ✍️ Tạo đánh giá mới
 * @param {string} userId - ID của người dùng viết đánh giá
 * @param {object} reviewData - Đối tượng chứa thông tin đánh giá { product, rating, comment, images, orderId, files }
 * @returns {Promise<object>} Đối tượng thông tin review đã tạo thành công
 */
export const createReview = async (userId, { product, rating, comment, images, orderId, files }) => {
  console.log('📝 [CREATE REVIEW SERVICE] Payload:', {
    product,
    rating,
    comment,
    images,
    orderId
  });

  // Kiểm tra dữ liệu đầu vào
  if (!product || !rating || !comment) {
    throw new ApiError(400, 'Vui lòng cung cấp đầy đủ thông tin đánh giá');
  }

  // Kiểm tra rating hợp lệ
  if (rating < 1 || rating > 5) {
    throw new ApiError(400, 'Đánh giá phải từ 1 đến 5 sao');
  }

  // Kiểm tra sản phẩm có tồn tại không
  const productExists = await Product.findById(product);
  if (!productExists) {
    throw new ApiError(404, 'Không tìm thấy sản phẩm');
  }

  // Kiểm tra đơn hàng hợp lệ và chưa được đánh giá
  if (!orderId) {
    throw new ApiError(400, 'Vui lòng cung cấp thông tin đơn hàng');
  }

  const order = await Order.findOne({
    _id: orderId,
    user: userId,
    'orderItems.product': product,
    status: 'Thành công'
  });

  if (!order) {
    throw new ApiError(404, 'Không tìm thấy đơn hàng hợp lệ cho sản phẩm này');
  }

  // Kiểm tra item cụ thể trong đơn hàng đã được đánh giá chưa bằng cách tìm Review đã tồn tại
  const existingReview = await Review.findOne({
    order: orderId,
    product: product,
    user: userId
  });

  if (existingReview) {
    throw new ApiError(400, 'Bạn đã đánh giá sản phẩm này trong đơn hàng rồi');
  }

  // Xử lý ảnh upload (nếu có)
  const uploadedImages = files ? files.map((f) => f.path) : [];
  const reviewImages = uploadedImages.length > 0 ? uploadedImages : images || [];

  // Tạo review mới
  const newReview = new Review({
    user: userId,
    product,
    order: orderId,
    rating,
    comment,
    images: reviewImages
  });

  await newReview.save();

  // Kiểm tra xem tất cả sản phẩm trong đơn hàng đã được đánh giá chưa
  const reviewCountForOrder = await Review.countDocuments({ order: orderId });
  if (reviewCountForOrder >= order.orderItems.length) {
    await Order.updateOne({ _id: orderId }, { $set: { isRated: true } });
  }

  // Cập nhật averageRating và reviewCount của product
  await updateProductRating(product);

  // Populate user info trước khi trả về
  const populatedReview = await Review.findById(newReview._id).populate(
    'user',
    'username avatar'
  );

  return populatedReview;
};

/**
 * 🔄 Hàm helper: Cập nhật rating và reviewCount của product
 * @param {string} productId - ID của sản phẩm cần tính toán lại rating
 */
export const updateProductRating = async (productId) => {
  try {
    const reviews = await Review.find({
      product: productId,
      isActive: true
    });

    const reviewCount = reviews.length;

    if (reviewCount === 0) {
      await Product.findByIdAndUpdate(productId, {
        averageRating: 0,
        reviewCount: 0
      });
      return;
    }

    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
    const averageRating = Math.round((totalRating / reviewCount) * 10) / 10; // Làm tròn 1 chữ số

    await Product.findByIdAndUpdate(productId, {
      averageRating,
      reviewCount
    });

    // 🧹 Xóa cache sản phẩm cũ để cập nhật số sao và lượt đánh giá mới tức thì trên giao diện
    await deleteCache(`ecom:products:id_${productId}`);
  } catch (error) {
    console.error('❌ Update product rating error:', error);
  }
};
