import express from 'express'
import * as reviewController from '../../controllers/admin/reviewController.js'

const router = express.Router()

// Quản lý reviews:

// Lấy tất cả reviews
router.get('/', reviewController.getAllReviews)

// Lấy review theo ID
router.get('/:id', reviewController.getReviewById)

// Cập nhật trạng thái review (active/inactive)
router.put('/status/:id', reviewController.updateReviewStatus)

// Lấy thống kê reviews
router.get('/stats/overview', reviewController.getReviewStats)

export default router
