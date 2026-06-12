import * as reviewService from '../../services/reviewService.js';
import { asyncHandler, ApiError } from '../../middleware/errorMiddleware.js';

// 📖 Lấy tất cả đánh giá theo sản phẩm (Không cần auth)
export const getReviewsByProduct = asyncHandler(async (req, res) => {
  const { productId } = req.params;

  const reviews = await reviewService.getReviewsByProduct(productId);

  res.status(200).json({
    success: true,
    reviews
  });
});

// 📦 Lấy tất cả đánh giá của một đơn hàng (Cần auth)
export const getReviewsByOrder = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const userId = req.user.id;

  const reviews = await reviewService.getReviewsByOrder(orderId, userId);

  res.status(200).json({
    success: true,
    reviews
  });
});

// ✍️ Tạo đánh giá mới (Cần auth)
export const createReview = asyncHandler(async (req, res) => {
  const { product, rating, comment, images, orderId } = req.body;
  const userId = req.user.id;

  const review = await reviewService.createReview(userId, {
    product,
    rating,
    comment,
    images,
    orderId,
    files: req.files
  });

  res.status(201).json({
    success: true,
    message: 'Đánh giá thành công',
    review
  });
});

