import express from 'express'
import {
  getAllUsers,
  updateUserStatus
} from '../../controllers/admin/userController.js'
import { verifyToken, restrictToRoles } from '../../middleware/authMiddleware.js'

const router = express.Router()

router.use(verifyToken, restrictToRoles(['ADMIN']))

// GET /api/admin/users - Get all users list
router.get('/', getAllUsers)

// PATCH /api/admin/users/:id/status - Update isActive status
router.patch('/:id/status', updateUserStatus)

export default router
