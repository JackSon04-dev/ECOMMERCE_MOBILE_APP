import Notification from '../../models/notification.js'

// Get all notifications for users (ordered by latest)
export const getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find().sort({ createdAt: -1 })
    res.status(200).json({
      success: true,
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
