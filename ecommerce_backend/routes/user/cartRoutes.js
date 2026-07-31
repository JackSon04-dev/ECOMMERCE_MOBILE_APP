import express from 'express';
import { getCart, updateCart } from '../../controllers/user/cartController.js';
import { verifyToken } from '../../middleware/authMiddleware.js';
import { validate } from '../../middleware/validationMiddleware.js';
import { updateCartSchema } from '../../validations/userValidation.js';

const router = express.Router();

// Get cart (With auto check and update Inventory/Stock)
router.get('/', verifyToken, getCart);

// Update/Add new/Sync cart
router.patch('/update', verifyToken, validate(updateCartSchema), updateCart);

export default router;
