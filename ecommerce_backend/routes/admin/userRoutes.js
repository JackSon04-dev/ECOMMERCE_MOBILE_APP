import express from 'express'
import {
  getAllUsers,
  updateUserStatus
} from '../../controllers/admin/userController.js'
import { verifyToken } from '../../middleware/authMiddleware.js'

const router = express.Router()

// GET /api/admin/users - Lấy danh sách tất cả users
router.get('/', getAllUsers)

// PATCH /api/admin/users/:id/status - Cập nhật trạng thái isActive
router.patch('/:id/status', updateUserStatus)

export default router
