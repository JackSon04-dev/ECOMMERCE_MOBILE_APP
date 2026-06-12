import Review from '../../models/reviewModel.js'
import { asyncHandler, ApiError } from '../../middleware/errorMiddleware.js'
import mongoose from 'mongoose'

// 1. Lấy tất cả reviews
export const getAllReviews = asyncHandler(async (req, res) => {
  // Lấy reviews và populate thông tin user, product
  const reviews = await Review.find()
    .populate('user', 'username email')
    .populate('product', 'name thumbnail')
    .sort({ createdAt: -1 })

  res.status(200).json({
    success: true,
    count: reviews.length,
    data: reviews
  })
});

// 2. Lấy review theo ID
export const getReviewById = asyncHandler(async (req, res) => {
  const { id } = req.params
  const review = await Review.findById(id)
    .populate('user', 'username email phoneNumber')
    .populate('product', 'name thumbnail price')

  if (!review) {
    throw new ApiError(404, 'Không tìm thấy review')
  }

  res.status(200).json({ success: true, data: review })
});

// 3. Cập nhật trạng thái review (active/inactive)
export const updateReviewStatus = asyncHandler(async (req, res) => {
  const { id } = req.params
  const { isActive } = req.body

  if (isActive === undefined) {
    throw new ApiError(400, 'Vui lòng cung cấp trạng thái isActive')
  }

  const review = await Review.findByIdAndUpdate(
    id,
    { isActive },
    { new: true, runValidators: true }
  )
    .populate('user', 'username email')
    .populate('product', 'name thumbnail')

  if (!review) {
    throw new ApiError(404, 'Không tìm thấy review')
  }

  res.status(200).json({
    success: true,
    message: `Đã ${isActive ? 'kích hoạt' : 'vô hiệu hóa'} review thành công`,
    data: review
  })
});

// 5. Lấy thống kê reviews
export const getReviewStats = asyncHandler(async (req, res) => {
  const { productId } = req.query

  const filter = productId ? { product: new mongoose.Types.ObjectId(productId) } : {}

  // Tổng số reviews
  const totalReviews = await Review.countDocuments(filter)

  // Reviews theo rating
  const ratingStats = await Review.aggregate([
    ...(productId
      ? [{ $match: { product: new mongoose.Types.ObjectId(productId) } }]
      : []),
    {
      $group: {
        _id: '$rating',
        count: { $sum: 1 }
      }
    },
    { $sort: { _id: -1 } }
  ])

  // Trung bình rating
  const avgRating = await Review.aggregate([
    ...(productId
      ? [{ $match: { product: new mongoose.Types.ObjectId(productId) } }]
      : []),
    {
      $group: {
        _id: null,
        averageRating: { $avg: '$rating' }
      }
    }
  ])

  // Reviews active vs inactive
  const activeCount = await Review.countDocuments({
    ...filter,
    isActive: true
  })
  const inactiveCount = await Review.countDocuments({
    ...filter,
    isActive: false
  })

  res.status(200).json({
    success: true,
    data: {
      totalReviews,
      averageRating: avgRating[0]?.averageRating?.toFixed(1) || 0,
      ratingStats,
      activeCount,
      inactiveCount
    }
  })
});

