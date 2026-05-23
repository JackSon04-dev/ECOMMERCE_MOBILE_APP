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
    enum: ['GENERAL', 'ORDER', 'PROMOTION', 'SYSTEM'],
    default: 'GENERAL',
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
}, {
  timestamps: true,
})

// Index để query nhanh: lấy thông báo chung (userId=null) + thông báo riêng của user
notificationSchema.index({ userId: 1, createdAt: -1 })

const Notification = mongoose.model('Notification', notificationSchema)
export default Notification
