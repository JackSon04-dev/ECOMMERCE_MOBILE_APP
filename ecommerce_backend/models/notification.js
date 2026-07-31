import mongoose from 'mongoose'

const notificationSchema = new mongoose.Schema({
  // If userId = null -> General notification (GENERAL/PROMO) for all users
  // If userId has value -> Private notification for that user (ORDER)
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
  // Save related object ID (e.g., orderId for order notifications)
  referenceId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null
  },
  imageUrl: {
    type: String,
    default: null
  },
  // Exact-Date TTL: Auto-delete time (Default 30 days)
  expireAt: {
    type: Date,
    default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  }
}, {
  timestamps: true,
})

// Index for fast querying: get general notifications (userId=null) + user's private notifications
notificationSchema.index({ userId: 1, createdAt: -1 })

// Set TTL Index (Delete exactly at expireAt timestamp)
notificationSchema.index({ expireAt: 1 }, { expireAfterSeconds: 0 })

const Notification = mongoose.model('Notification', notificationSchema)
export default Notification
