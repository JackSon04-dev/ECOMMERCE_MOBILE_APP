import express from 'express';
import { getCart, updateCart } from '../../controllers/user/cartController.js';
import { verifyToken } from '../../middleware/authMiddleware.js';

const router = express.Router();

// Lấy giỏ hàng (Kèm tự động check và cập nhật Tồn kho/Stock)
router.get('/', verifyToken, getCart);

// Cập nhật/Thêm mới/Đồng bộ giỏ hàng
router.patch('/update', verifyToken, updateCart);

export default router;
