import Notification from '../../models/notification.js'
import User from '../../models/userModel.js'
import { getChannel } from '../../config/rabbitmq.js'
import { asyncHandler, ApiError } from '../../middleware/errorMiddleware.js'

// @desc    Create general notification (GENERAL/PROMOTION) for all users
// @route   POST /api/admin/notifications
// @access  Admin
export const createNotification = asyncHandler(async (req, res) => {
  const { title, message, type } = req.body

  // Admin only creates general notifications (no userId attached)
  const validTypes = ['PROMOTION', 'SYSTEM']
  const notificationType = validTypes.includes(type?.toUpperCase())
    ? type.toUpperCase()
    : 'SYSTEM'

  const newNotification = new Notification({
    title,
    message,
    type: notificationType,
    userId: null // General notification for all users
  })
  await newNotification.save()

  // --- ADD FCM PUSH LOGIC VIA RABBITMQ ---
  const channel = getChannel()
  if (!channel) {
    // FAIL-FAST: Report error so Admin knows the system is down, even though message saved to DB
    throw new ApiError(500, 'Lưu thông báo thành công nhưng tính năng Push FCM tạm thời gián đoạn do lỗi hệ thống (RabbitMQ is down).')
  }

  // Get all user tokens
  const users = await User.find({}, 'fcmTokens.token').lean()

  // Flatten array of tokens
  let allTokens = []
  users.forEach(user => {
    if (user.fcmTokens && user.fcmTokens.length > 0) {
      user.fcmTokens.forEach(t => {
        if (t.token) allTokens.push(t.token)
      })
    }
  })

  // Remove duplicate tokens (if any)
  allTokens = [...new Set(allTokens)]

  if (allTokens.length > 0) {
    // Cut the array into chunks, max 400 tokens per chunk
    const chunkSize = 400
    for (let i = 0; i < allTokens.length; i += chunkSize) {
      const chunk = allTokens.slice(i, i + chunkSize)

      const payload = {
        tokens: chunk,
        title,
        message,
        data: { 
          type: notificationType,
          notificationId: newNotification._id.toString()
        }
      }

      channel.sendToQueue(
        'fcm_broadcast_queue',
        Buffer.from(JSON.stringify(payload)),
        { persistent: true }
      )
    }
    console.log(`📦 [FCM Broadcast] Đã đẩy ${Math.ceil(allTokens.length / chunkSize)} chunks (tổng ${allTokens.length} tokens) vào fcm_broadcast_queue`)
  }

  res.status(201).json({
    success: true,
    message: 'Tạo thông báo và gửi FCM đến tất cả user thành công',
    notification: newNotification
  })
})

// @desc    Get all notifications (Admin views all)
// @route   GET /api/admin/notifications
// @access  Admin
export const getAllNotifications = asyncHandler(async (req, res) => {
  const notifications = await Notification.find().sort({ createdAt: -1 })
  res.status(200).json({
    success: true,
    count: notifications.length,
    notifications
  })
})

// @desc    Delete notification
// @route   DELETE /api/admin/notifications/:id
// @access  Admin
export const deleteNotification = asyncHandler(async (req, res) => {
  const notification = await Notification.findByIdAndDelete(req.params.id)

  if (!notification) {
    throw new ApiError(404, 'Không tìm thấy thông báo')
  }

  res.status(200).json({
    success: true,
    message: 'Xóa thông báo thành công'
  })
})

