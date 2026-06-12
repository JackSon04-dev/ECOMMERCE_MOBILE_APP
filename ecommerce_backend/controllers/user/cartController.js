import * as cartService from '../../services/cartService.js';
import { asyncHandler } from '../../middleware/errorMiddleware.js';

/**
 * 🛒 [GET] /api/cart
 * Lấy giỏ hàng của User và tự động check Stock (Tồn kho thực tế)
 */
export const getCart = asyncHandler(async (req, res) => {
  const userId = req.user.id; // Lấy từ middleware verifyToken
  const cartData = await cartService.getCart(userId);

  return res.status(200).json({
    success: true,
    cart: cartData
  });
});

/**
 * 🛒 [PUT/POST] /api/cart/update
 * Cập nhật Giỏ hàng (Hỗ trợ đồng bộ Sync mảng Items từ LocalStorage sau 15s hoặc 1 item lẻ)
 */
export const updateCart = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  await cartService.updateCart(userId, req.body);

  return res.status(200).json({ success: true });
});
