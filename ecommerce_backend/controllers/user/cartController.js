import * as cartService from '../../services/cartService.js';

/**
 * 🛒 [GET] /api/cart
 * Lấy giỏ hàng của User và tự động check Stock (Tồn kho thực tế)
 */
export const getCart = async (req, res) => {
  try {
    const userId = req.user.id; // Lấy từ middleware verifyToken
    const cartData = await cartService.getCart(userId);

    return res.status(200).json({
      success: true,
      cart: cartData
    });
  } catch (error) {
    console.error('❌ Lỗi lấy giỏ hàng:', error);
    return res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

/**
 * 🛒 [PUT/POST] /api/cart/update
 * Cập nhật Giỏ hàng (Hỗ trợ đồng bộ Sync mảng Items từ LocalStorage sau 15s hoặc 1 item lẻ)
 */
export const updateCart = async (req, res) => {
  try {
    const userId = req.user.id;
    await cartService.updateCart(userId, req.body);

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('❌ Lỗi cập nhật giỏ hàng:', error);
    const statusCode = error.message.includes('không hợp lệ') ? 400 : 500;
    return res.status(statusCode).json({ success: false, message: error.message || 'Lỗi server' });
  }
};
