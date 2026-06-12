import Notification from '../../models/notification.js'
import { asyncHandler, ApiError } from '../../middleware/errorMiddleware.js'

// @desc    Tạo thông báo chung (GENERAL/PROMOTION) cho tất cả user
// @route   POST /api/admin/notifications
// @access  Admin
export const createNotification = asyncHandler(async (req, res) => {
  const { title, message, type } = req.body

  // Admin chỉ tạo thông báo chung (không gắn userId)
  const validTypes = ['GENERAL', 'PROMOTION']
  const notificationType = validTypes.includes(type?.toUpperCase())
    ? type.toUpperCase()
    : 'GENERAL'

  const newNotification = new Notification({
    title,
    message,
    type: notificationType,
    userId: null // Thông báo chung cho tất cả user
  })
  await newNotification.save()

  res.status(201).json({
    success: true,
    message: 'Tạo thông báo thành công',
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

