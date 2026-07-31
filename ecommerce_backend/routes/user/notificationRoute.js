import express from 'express'
import { getNotifications, deleteNotification, getUnreadCount } from '../../controllers/user/notificationController.js'
import { verifyToken } from '../../middleware/authMiddleware.js'
import { validate } from '../../middleware/validationMiddleware.js'
import { getNotificationsSchema, deleteNotificationSchema } from '../../validations/userValidation.js'

const router = express.Router()

// Route: GET /api/notifications - Get notifications (general + private)
router.get('/', verifyToken, validate(getNotificationsSchema), getNotifications)

// Route: GET /api/notifications/unread-count - Count unread notifications
router.get('/unread-count', verifyToken, getUnreadCount)

// Route: DELETE /api/notifications/:id - Delete notification when user read it
router.delete('/:id', verifyToken, validate(deleteNotificationSchema), deleteNotification)

export default router
