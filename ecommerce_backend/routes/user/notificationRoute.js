import express from 'express'
import { getNotifications } from '../../controllers/user/notificationController.js'

const router = express.Router()

// Route: GET /api/notifications
router.get('/', getNotifications)

export default router
