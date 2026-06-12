import mongoose from 'mongoose'

const reviewSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5
    },
    comment: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500
    },
    images: [
      {
        type: String
      }
    ],
    isActive: {
      type: Boolean,
      default: true
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true
    }
  },
  { timestamps: true }
)

// Index để tăng hiệu suất truy vấn
reviewSchema.index({ product: 1, createdAt: -1 })

// Đảm bảo một user chỉ review một product một lần trên mỗi đơn hàng
reviewSchema.index({ user: 1, product: 1, order: 1 }, { unique: true })

const Review = mongoose.model('Review', reviewSchema)
export default Review
