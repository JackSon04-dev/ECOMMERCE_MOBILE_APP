import * as cartService from '../../services/cartService.js';
import { asyncHandler } from '../../middleware/errorMiddleware.js';

/**
 * 🛒 [GET] /api/cart
 * Get User's cart and auto check Stock (Actual inventory)
 */
export const getCart = asyncHandler(async (req, res) => {
  const userId = req.user.id; // Get from verifyToken middleware
  const cartData = await cartService.getCart(userId);

  return res.status(200).json({
    success: true,
    cart: cartData
  });
});

/**
 * 🛒 [PUT/POST] /api/cart/update
 * Update Cart (Supports syncing Items array from LocalStorage after 15s or 1 single item)
 */
export const updateCart = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  await cartService.updateCart(userId, req.body);

  return res.status(200).json({ success: true });
});
