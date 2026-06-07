import * as reviewService from '../../services/reviewService.js';

// 📖 Lấy tất cả đánh giá theo sản phẩm (Không cần auth)
export const getReviewsByProduct = async (req, res) => {
  try {
    const { productId } = req.params;

    const reviews = await reviewService.getReviewsByProduct(productId);

    res.status(200).json({
      success: true,
      reviews
    });
  } catch (error) {
    console.error('❌ Get reviews by product error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy danh sách đánh giá'
    });
  }
};

// 📦 Lấy tất cả đánh giá của một đơn hàng (Cần auth)
export const getReviewsByOrder = async (req, res) => {
  try {
    const { orderId } = req.params;

    const reviews = await reviewService.getReviewsByOrder(orderId);

    res.status(200).json({
      success: true,
      reviews
    });
  } catch (error) {
    console.error('❌ Get reviews by order error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy danh sách đánh giá của đơn hàng'
    });
  }
};

// ✍️ Tạo đánh giá mới (Cần auth)
export const createReview = async (req, res) => {
  try {
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
  } catch (error) {
    console.error('❌ Create review error:', error);
    const statusCode = error.message.includes('Không tìm thấy') ? 404 : 
                      (error.message.includes('Vui lòng') || error.message.includes('Đánh giá phải') || error.message.includes('đã đánh giá') || error.message.includes('hợp lệ') ? 400 : 500);
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Lỗi khi tạo đánh giá'
    });
  }
};
