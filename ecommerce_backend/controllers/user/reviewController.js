import Review from '../../models/reviewModel.js'
import Product from '../../models/productModel.js'
import Order from '../../models/orderModel.js'

// 📖 Lấy tất cả đánh giá theo sản phẩm (Không cần auth)
export const getReviewsByProduct = async (req, res) => {
  try {
    const { productId } = req.params
    //console.log('🔍 [GET REVIEWS] ProductId:', productId)

    const reviews = await Review.find({
      product: productId,
      isActive: true
    })
      .populate('user', 'username')
      .sort({ createdAt: -1 })

    //console.log('✅ [GET REVIEWS] Tìm thấy:', reviews.length, 'reviews')

    res.status(200).json({
      success: true,
      reviews
    })
  } catch (error) {
    console.error('❌ Get reviews by product error:', error)
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy danh sách đánh giá'
    })
  }
}

// 📦 Lấy tất cả đánh giá của một đơn hàng (Cần auth)
export const getReviewsByOrder = async (req, res) => {
  try {
    const { orderId } = req.params
    // console.log('🔍 [GET REVIEWS BY ORDER] OrderId:', orderId)

    const reviews = await Review.find({
      order: orderId
    })

    res.status(200).json({
      success: true,
      reviews
    })
  } catch (error) {
    console.error('❌ Get reviews by order error:', error)
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy danh sách đánh giá của đơn hàng'
    })
  }
}

// ✍️ Tạo đánh giá mới (Cần auth)
export const createReview = async (req, res) => {
  try {
    const { product, rating, comment, images, orderId } = req.body
    const userId = req.user.id

    console.log('📝 [CREATE REVIEW] Request body:', {
      product,
      rating,
      comment,
      images,
      orderId
    })
    console.log('👤 [CREATE REVIEW] UserId:', userId)

    // Kiểm tra dữ liệu đầu vào
    if (!product || !rating || !comment) {
      console.log('⚠️ [CREATE REVIEW] Thiếu thông tin đầu vào')
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp đầy đủ thông tin đánh giá'
      })
    }

    // Kiểm tra rating hợp lệ
    if (rating < 1 || rating > 5) {
      console.log('⚠️ [CREATE REVIEW] Rating không hợp lệ:', rating)
      return res.status(400).json({
        success: false,
        message: 'Đánh giá phải từ 1 đến 5 sao'
      })
    }

    // Kiểm tra sản phẩm có tồn tại không
    const productExists = await Product.findById(product)
    if (!productExists) {
      console.log('⚠️ [CREATE REVIEW] Không tìm thấy product:', product)
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy sản phẩm'
      })
    }
    console.log('✅ [CREATE REVIEW] Product tồn tại:', productExists.name)

    // Kiểm tra đơn hàng hợp lệ và chưa được đánh giá
    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp thông tin đơn hàng'
      })
    }

    const order = await Order.findOne({
      _id: orderId,
      user: userId,
      'orderItems.product': product,
      status: 'Thành công'
    })

    if (!order) {
      console.log('⚠️ [CREATE REVIEW] Không tìm thấy đơn hàng hợp lệ')
      return res.status(400).json({
        success: false,
        message: 'Không tìm thấy đơn hàng hợp lệ cho sản phẩm này'
      })
    }

    // Kiểm tra item cụ thể trong đơn hàng đã được đánh giá chưa
    const orderItem = order.orderItems.find(
      (item) => item.product.toString() === product
    )

    if (orderItem.isRated) {
      console.log('⚠️ [CREATE REVIEW] Sản phẩm này trong đơn hàng đã được đánh giá rồi')
      return res.status(400).json({
        success: false,
        message: 'Bạn đã đánh giá sản phẩm này trong đơn hàng rồi'
      })
    }

    // Xử lý ảnh upload (nếu có)
    const uploadedImages = req.files ? req.files.map((f) => f.path) : []
    const reviewImages =
      uploadedImages.length > 0 ? uploadedImages : images || []

    // Tạo review mới
    console.log('💾 [CREATE REVIEW] Đang tạo review mới...')
    const newReview = new Review({
      user: userId,
      product,
      order: orderId,
      rating,
      comment,
      images: reviewImages
    })

    await newReview.save()
    console.log('✅ [CREATE REVIEW] Review đã lưu, ID:', newReview._id)

    // Cập nhật isRated cho item sản phẩm tương ứng trong đơn hàng
    await Order.updateOne(
      { _id: orderId },
      { $set: { 'orderItems.$[elem].isRated': true } },
      { arrayFilters: [{ 'elem.product': orderItem.product }] }
    )
    console.log(
      `✅ [CREATE REVIEW] OrderItem product ${product} trong order ${orderId} đã được đánh dấu isRated = true`
    )

    // Cập nhật averageRating và reviewCount của product
    console.log('🔄 [CREATE REVIEW] Đang cập nhật rating cho product...')
    await updateProductRating(product)

    // Populate user info trước khi trả về
    const populatedReview = await Review.findById(newReview._id).populate(
      'user',
      'username avatar'
    )

    console.log('✅ [CREATE REVIEW] Hoàn tất tạo review thành công')
    res.status(201).json({
      success: true,
      message: 'Đánh giá thành công',
      review: populatedReview
    })
  } catch (error) {
    console.error('❌ Create review error:', error)
    res.status(500).json({
      success: false,
      message: 'Lỗi khi tạo đánh giá'
    })
  }
}

// 🔄 Hàm helper: Cập nhật rating và reviewCount của product
const updateProductRating = async (productId) => {
  try {
    console.log('📊 [UPDATE RATING] ProductId:', productId)
    const reviews = await Review.find({
      product: productId,
      isActive: true
    })

    const reviewCount = reviews.length
    console.log('📊 [UPDATE RATING] Số lượng reviews:', reviewCount)

    if (reviewCount === 0) {
      await Product.findByIdAndUpdate(productId, {
        averageRating: 0,
        reviewCount: 0
      })
      console.log('📊 [UPDATE RATING] Đặt lại rating = 0')
      return
    }

    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0)
    const averageRating = Math.round((totalRating / reviewCount) * 10) / 10 // Làm tròn 1 chữ số

    console.log('📊 [UPDATE RATING] Cập nhật:', { averageRating, reviewCount })
    await Product.findByIdAndUpdate(productId, {
      averageRating,
      reviewCount
    })
  } catch (error) {
    console.error('❌ Update product rating error:', error)
  }
}
