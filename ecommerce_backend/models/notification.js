import mongoose from 'mongoose'

const notificationSchema = new mongoose.Schema({
  // Nếu userId = null -> Thông báo chung (GENERAL/PROMO) cho tất cả user
  // Nếu userId có giá trị -> Thông báo riêng cho user đó (ORDER)
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  title: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ['ORDER', 'PROMOTION', 'SYSTEM'],
    default: 'SYSTEM',
  },
  // Lưu ID đối tượng liên quan (ví dụ: orderId cho thông báo đơn hàng)
  referenceId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null
  },
  imageUrl: {
    type: String,
    default: null
  },
  // Exact-Date TTL: Thời điểm tự động xóa (Mặc định 30 ngày)
  expireAt: {
    type: Date,
    default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  }
}, {
  timestamps: true,
})

// Index để query nhanh: lấy thông báo chung (userId=null) + thông báo riêng của user
notificationSchema.index({ userId: 1, createdAt: -1 })

// Cài đặt TTL Index (Xóa chính xác tại mốc thời gian expireAt)
notificationSchema.index({ expireAt: 1 }, { expireAfterSeconds: 0 })

const Notification = mongoose.model('Notification', notificationSchema)
export default Notification
