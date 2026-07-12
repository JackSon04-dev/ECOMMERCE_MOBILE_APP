import mongoose from 'mongoose'

const notificationReadSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  notificationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Notification',
    required: true
  },
  readAt: {
    type: Date,
    default: Date.now
  },
  // Exact-Date TTL: Bằng với thời gian hết hạn của thông báo gốc
  expireAt: {
    type: Date,
    required: true
  }
}, {
  timestamps: true
})

// Compound index to ensure uniqueness and fast lookup
notificationReadSchema.index({ userId: 1, notificationId: 1 }, { unique: true })

// Cài đặt TTL Index (Xóa cùng lúc với thông báo gốc)
notificationReadSchema.index({ expireAt: 1 }, { expireAfterSeconds: 0 })

const NotificationRead = mongoose.model('NotificationRead', notificationReadSchema)
export default NotificationRead
