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
  // Exact-Date TTL: Equal to the expiration time of the original notification
  expireAt: {
    type: Date,
    required: true
  }
}, {
  timestamps: true
})

// Compound index to ensure uniqueness and fast lookup
notificationReadSchema.index({ userId: 1, notificationId: 1 }, { unique: true })

// Set TTL Index (Delete at the same time as the original notification)
notificationReadSchema.index({ expireAt: 1 }, { expireAfterSeconds: 0 })

const NotificationRead = mongoose.model('NotificationRead', notificationReadSchema)
export default NotificationRead
