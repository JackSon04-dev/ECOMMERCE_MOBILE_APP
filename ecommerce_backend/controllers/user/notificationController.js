import * as notificationService from '../../services/notificationService.js';

// @desc    Lấy thông báo của user (thông báo chung + thông báo riêng)
// @route   GET /api/notifications
// @access  User (cần đăng nhập)
export const getNotifications = async (req, res) => {
  try {
    const userId = req.user?.id || null;
    const { type } = req.query;

    const notifications = await notificationService.getNotifications(userId, type);

    res.status(200).json({
      success: true,
      count: notifications.length,
      notifications
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi lấy danh sách thông báo',
      error: error.message
    });
  }
};

// @desc    Xóa (ORDER) hoặc Đánh dấu đã đọc (PROMOTION/SYSTEM) thông báo
// @route   DELETE /api/notifications/:id
// @access  User (cần đăng nhập)
export const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const result = await notificationService.deleteOrReadNotification(id, userId);

    res.status(200).json(result);
  } catch (error) {
    const statusCode = error.message.includes('quyền') ? 403 : (error.message.includes('tìm thấy') ? 404 : 500);
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Lỗi xử lý thông báo',
      error: error.message
    });
  }
};

// @desc    Đếm số thông báo chưa đọc (thông báo riêng + thông báo chung chưa đọc)
// @route   GET /api/notifications/unread-count
// @access  User (cần đăng nhập)
export const getUnreadCount = async (req, res) => {
  try {
    const userId = req.user?.id;
    const unreadCount = await notificationService.getUnreadCount(userId);

    res.status(200).json({
      success: true,
      unreadCount
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi đếm thông báo',
      error: error.message
    });
  }
};
