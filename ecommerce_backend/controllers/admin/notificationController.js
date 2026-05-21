import Notification from '../../models/notification.js'

// @desc    Tạo thông báo chung (GENERAL/PROMOTION) cho tất cả user
// @route   POST /api/admin/notifications
// @access  Admin
export const createNotification = async (req, res) => {
  try {
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
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi tạo thông báo',
      error: error.message
    })
  }
}

// @desc    Lấy tất cả thông báo (Admin xem toàn bộ)
// @route   GET /api/admin/notifications
// @access  Admin
export const getAllNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find().sort({ createdAt: -1 })
    res.status(200).json({
      success: true,
      count: notifications.length,
      notifications
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi lấy danh sách thông báo',
      error: error.message
    })
  }
}

// @desc    Xóa thông báo
// @route   DELETE /api/admin/notifications/:id
// @access  Admin
export const deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findByIdAndDelete(req.params.id)

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy thông báo'
      })
    }

    res.status(200).json({
      success: true,
      message: 'Xóa thông báo thành công'
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi xóa thông báo',
      error: error.message
    })
  }
}
