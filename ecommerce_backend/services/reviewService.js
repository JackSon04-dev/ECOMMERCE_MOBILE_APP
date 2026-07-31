import Review from '../models/reviewModel.js';
import Product from '../models/productModel.js';
import Order from '../models/orderModel.js';
import { deleteCache } from './redisService.js';
import { ApiError } from '../middleware/errorMiddleware.js';

/**
 * 📖 Get all reviews by product
 * @param {string} productId - Product ID to get review list
 * @returns {Promise<array>} Array containing product reviews
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
 * 📦 Get all reviews of an order
 * @param {string} orderId - Order ID to get review list
 * @param {string} userId - ID of user owning the order
 * @returns {Promise<array>} Array containing reviews belonging to the order
 */
export const getReviewsByOrder = async (orderId, userId) => {
  return await Review.find({
    user: userId,
    order: orderId
  });
};

/**
 * ✍️ Create new review
 * @param {string} userId - ID of user writing review
 * @param {object} reviewData - Object containing review info { product, rating, comment, images, orderId, files }
 * @returns {Promise<object>} Successfully created review info object
 */
export const createReview = async (userId, { product, rating, comment, images, orderId, files }) => {
  console.log('📝 [CREATE REVIEW SERVICE] Payload:', {
    product,
    rating,
    comment,
    images,
    orderId
  });

  // Check input data
  if (!product || !rating || !comment) {
    throw new ApiError(400, 'Vui lòng cung cấp đầy đủ thông tin đánh giá');
  }

  // Check valid rating
  if (rating < 1 || rating > 5) {
    throw new ApiError(400, 'Đánh giá phải từ 1 đến 5 sao');
  }

  // Check if product exists
  const productExists = await Product.findById(product);
  if (!productExists) {
    throw new ApiError(404, 'Không tìm thấy sản phẩm');
  }

  // Check if valid order and not yet reviewed
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

  // Check if specific order item is reviewed by finding existing Review
  const existingReview = await Review.findOne({
    order: orderId,
    product: product,
    user: userId
  });

  if (existingReview) {
    throw new ApiError(400, 'Bạn đã đánh giá sản phẩm này trong đơn hàng rồi');
  }

  // Handle image upload (if any)
  const uploadedImages = files ? files.map((f) => f.path) : [];
  const reviewImages = uploadedImages.length > 0 ? uploadedImages : images || [];

  // Create new review
  const newReview = new Review({
    user: userId,
    product,
    order: orderId,
    rating,
    comment,
    images: reviewImages
  });

  await newReview.save();

  // Check if all products in order have been reviewed
  const reviewCountForOrder = await Review.countDocuments({ order: orderId });
  if (reviewCountForOrder >= order.orderItems.length) {
    await Order.updateOne({ _id: orderId }, { $set: { isRated: true } });
  }

  // Update averageRating and reviewCount of product
  await updateProductRating(product);

  // Populate user info before returning
  const populatedReview = await Review.findById(newReview._id).populate(
    'user',
    'username avatar'
  );

  return populatedReview;
};

/**
 * 🔄 Helper function: Update product rating and reviewCount
 * @param {string} productId - Product ID to recalculate rating
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
    const averageRating = Math.round((totalRating / reviewCount) * 10) / 10; // Round to 1 decimal place

    await Product.findByIdAndUpdate(productId, {
      averageRating,
      reviewCount
    });

    // 🧹 Delete old product cache to update star rating and review count instantly on UI
    await deleteCache(`ecom:products:id_${productId}`);
  } catch (error) {
    console.error('❌ Update product rating error:', error);
  }
};
