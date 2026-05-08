import Notification from '../../models/notification.js'

// Create new notification
export const createNotification = async (req, res) => {
  try {
    const { title, message, type } = req.body
    const newNotification = new Notification({ title, message, type })
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

// Get all notifications for admin
export const getAllNotifications = async (req, res) => {
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

// Delete notification
export const deleteNotification = async (req, res) => {
  try {
    await Notification.findByIdAndDelete(req.params.id)
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
