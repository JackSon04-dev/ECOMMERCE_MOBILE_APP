import express from 'express'
import { getNotifications, deleteNotification, getUnreadCount } from '../../controllers/user/notificationController.js'
import { verifyToken } from '../../middleware/authMiddleware.js'

const router = express.Router()

// Route: GET /api/notifications - Lấy thông báo (chung + riêng)
router.get('/', verifyToken, getNotifications)

// Route: GET /api/notifications/unread-count - Đếm thông báo chưa đọc
router.get('/unread-count', verifyToken, getUnreadCount)

// Route: DELETE /api/notifications/:id - Xóa thông báo khi user đã đọc
router.delete('/:id', verifyToken, deleteNotification)

export default router
