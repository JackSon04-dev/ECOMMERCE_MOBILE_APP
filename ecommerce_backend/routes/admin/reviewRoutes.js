import express from 'express'
import * as reviewController from '../../controllers/admin/reviewController.js'
import { verifyToken, restrictToRoles } from '../../middleware/authMiddleware.js'

const router = express.Router()

router.use(verifyToken, restrictToRoles(['ADMIN']))

// Manage reviews:

// Get all reviews
router.get('/', reviewController.getAllReviews)

// Get review by ID
router.get('/:id', reviewController.getReviewById)

// Update review status (active/inactive)
router.put('/status/:id', reviewController.updateReviewStatus)

// Get review statistics
router.get('/stats/overview', reviewController.getReviewStats)

export default router
