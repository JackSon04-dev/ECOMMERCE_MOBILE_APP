import Notification from '../../models/notification.js'
import NotificationRead from '../../models/notificationRead.js'

// @desc    Lấy thông báo của user (thông báo chung + thông báo riêng)
// @route   GET /api/notifications
// @access  User (cần đăng nhập)
export const getNotifications = async (req, res) => {
  try {
    const userId = req.user?.id || null
    const { type } = req.query

    // Xây dựng điều kiện query
    const query = {}

    // Nếu có userId: lấy thông báo riêng (userId = userId) + thông báo chung (userId = null)
    // Nếu không có userId: chỉ lấy thông báo chung (userId = null)
    if (userId) {
      query.$or = [{ userId: userId }, { userId: null }]
    } else {
      query.userId = null
    }

    // Lọc theo loại thông báo nếu có
    if (type) {
      query.type = type.toUpperCase()
    }

    // Lấy tối đa 50 thông báo mới nhất để phân trang tránh quá tải dữ liệu
    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(50)
      .lean()

    const notificationIds = notifications.map(n => n._id)

    // Chỉ truy vấn trạng thái đã đọc của các thông báo đang được trả về
    let readNotificationSet = new Set()
    if (userId && notificationIds.length > 0) {
      const readNotifications = await NotificationRead.find({
        userId,
        notificationId: { $in: notificationIds }
      })
        .select('notificationId')
        .lean()
      readNotificationSet = new Set(readNotifications.map(item => item.notificationId.toString()))
    }

    // Áp dụng trạng thái isRead bằng Set.has() với thời gian O(1)
    const mappedNotifications = notifications.map(notification => {
      let isRead = false
      if (notification.userId) {
        // Thông báo cá nhân (ORDER): do cơ chế xóa khi đọc, mọi tin còn tồn tại đều là chưa đọc
        isRead = false
      } else {
        // Thông báo chung (PROMOTION, SYSTEM, GENERAL): check trong Set
        isRead = readNotificationSet.has(notification._id.toString())
      }
      return {
        ...notification,
        isRead
      }
    })

    res.status(200).json({
      success: true,
      count: mappedNotifications.length,
      notifications: mappedNotifications
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi lấy danh sách thông báo',
      error: error.message
    })
  }
}

// @desc    Xóa (ORDER) hoặc Đánh dấu đã đọc (PROMOTION/SYSTEM) thông báo
// @route   DELETE /api/notifications/:id
// @access  User (cần đăng nhập)
export const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.user?.id

    const notification = await Notification.findById(id)

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy thông báo'
      })
    }

    if (notification.userId) {
      // Thông báo cá nhân (ORDER): Đảm bảo đúng user mới được xóa
      if (notification.userId.toString() !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Bạn không có quyền xóa thông báo này'
        })
      }
      await Notification.findByIdAndDelete(id)
      return res.status(200).json({
        success: true,
        message: 'Đã xóa thông báo đơn hàng thành công'
      })
    } else {
      // Thông báo chung (PROMOTION, SYSTEM, GENERAL): Ghi nhận đã đọc
      await NotificationRead.updateOne(
        { userId, notificationId: id },
        { $setOnInsert: { readAt: new Date() } },
        { upsert: true }
      )
      return res.status(200).json({
        success: true,
        message: 'Đã đánh dấu đã đọc thông báo chung thành công'
      })
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi xử lý thông báo',
      error: error.message
    })
  }
}

// @desc    Đếm số thông báo chưa đọc (thông báo riêng + thông báo chung chưa đọc)
// @route   GET /api/notifications/unread-count
// @access  User (cần đăng nhập)
export const getUnreadCount = async (req, res) => {
  try {
    const userId = req.user?.id

    // 1. Đếm thông báo riêng của user (chưa bị xóa = chưa đọc)
    const personalUnreadCount = await Notification.countDocuments({
      userId: userId
    })

    // 2. Đếm thông báo chung (userId = null) chưa được đọc
    const globalNotifications = await Notification.find({ userId: null })
      .select('_id')
      .lean()
    const globalNotificationIds = globalNotifications.map(n => n._id.toString())

    const readGlobalCount = await NotificationRead.countDocuments({
      userId: userId,
      notificationId: { $in: globalNotificationIds }
    })

    const globalUnreadCount = globalNotificationIds.length - readGlobalCount

    res.status(200).json({
      success: true,
      unreadCount: personalUnreadCount + globalUnreadCount
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi đếm thông báo',
      error: error.message
    })
  }
}
