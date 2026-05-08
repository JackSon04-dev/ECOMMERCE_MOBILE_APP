import Review from '../../models/reviewModel.js'

// 1. Lấy tất cả reviews
export const getAllReviews = async (req, res) => {
  try {
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
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

// 2. Lấy review theo ID
export const getReviewById = async (req, res) => {
  try {
    const { id } = req.params
    const review = await Review.findById(id)
      .populate('user', 'username email phoneNumber')
      .populate('product', 'name thumbnail price')

    if (!review) {
      return res
        .status(404)
        .json({ success: false, message: 'Không tìm thấy review' })
    }

    res.status(200).json({ success: true, data: review })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

// 3. Cập nhật trạng thái review (active/inactive)
export const updateReviewStatus = async (req, res) => {
  try {
    const { id } = req.params
    const { isActive } = req.body

    if (isActive === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp trạng thái isActive'
      })
    }

    const review = await Review.findByIdAndUpdate(
      id,
      { isActive },
      { new: true, runValidators: true }
    )
      .populate('user', 'username email')
      .populate('product', 'name thumbnail')

    if (!review) {
      return res
        .status(404)
        .json({ success: false, message: 'Không tìm thấy review' })
    }

    res.status(200).json({
      success: true,
      message: `Đã ${isActive ? 'kích hoạt' : 'vô hiệu hóa'} review thành công`,
      data: review
    })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

// 5. Lấy thống kê reviews
export const getReviewStats = async (req, res) => {
  try {
    const { productId } = req.query

    const filter = productId ? { product: productId } : {}

    // Tổng số reviews
    const totalReviews = await Review.countDocuments(filter)

    // Reviews theo rating
    const ratingStats = await Review.aggregate([
      ...(productId
        ? [{ $match: { product: mongoose.Types.ObjectId(productId) } }]
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
        ? [{ $match: { product: mongoose.Types.ObjectId(productId) } }]
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
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}
