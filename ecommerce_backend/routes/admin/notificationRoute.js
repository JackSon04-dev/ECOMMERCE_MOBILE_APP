import express from 'express'
import { createNotification, getAllNotifications, deleteNotification } from '../../controllers/admin/notificationController.js'
import { verifyToken, restrictToRoles } from '../../middleware/authMiddleware.js'

const router = express.Router()

router.use(verifyToken, restrictToRoles(['ADMIN']))

// Route: POST /api/admin/notifications
router.post('/', createNotification)

// Route: GET /api/admin/notifications
router.get('/', getAllNotifications)

// Route: DELETE /api/admin/notifications/:id
router.delete('/:id', deleteNotification)

export default router
