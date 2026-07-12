import Notification from '../../models/notification.js'
import User from '../../models/userModel.js'
import { getChannel } from '../../config/rabbitmq.js'
import { asyncHandler, ApiError } from '../../middleware/errorMiddleware.js'

// @desc    Tạo thông báo chung (GENERAL/PROMOTION) cho tất cả user
// @route   POST /api/admin/notifications
// @access  Admin
export const createNotification = asyncHandler(async (req, res) => {
  const { title, message, type } = req.body

  // Admin chỉ tạo thông báo chung (không gắn userId)
  const validTypes = ['PROMOTION', 'SYSTEM']
  const notificationType = validTypes.includes(type?.toUpperCase())
    ? type.toUpperCase()
    : 'SYSTEM'

  const newNotification = new Notification({
    title,
    message,
    type: notificationType,
    userId: null // Thông báo chung cho tất cả user
  })
  await newNotification.save()

  // --- THÊM LOGIC PUSH FCM QUA RABBITMQ ---
  const channel = getChannel()
  if (!channel) {
    // FAIL-FAST: Báo lỗi để Admin biết hệ thống đang lỗi, mặc dù tin nhắn đã lưu DB
    throw new ApiError(500, 'Lưu thông báo thành công nhưng tính năng Push FCM tạm thời gián đoạn do lỗi hệ thống (RabbitMQ is down).')
  }

  // Lấy toàn bộ token của người dùng
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

  // Loại bỏ token trùng lặp (nếu có)
  allTokens = [...new Set(allTokens)]

  if (allTokens.length > 0) {
    // Cắt mảng thành các cục (chunks), mỗi cục tối đa 400 tokens
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

// @desc    Lấy tất cả thông báo (Admin xem toàn bộ)
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

// @desc    Xóa thông báo
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

