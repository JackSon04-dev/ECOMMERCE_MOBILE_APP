import * as notificationService from '../../services/notificationService.js';
import { asyncHandler } from '../../middleware/errorMiddleware.js';

// @desc    Lấy thông báo của user (thông báo chung + thông báo riêng)
// @route   GET /api/notifications
// @access  User (cần đăng nhập)
export const getNotifications = asyncHandler(async (req, res) => {
  const userId = req.user?.id || null;
  const { type } = req.query;

  const notifications = await notificationService.getNotifications(userId, type);

  res.status(200).json({
    success: true,
    count: notifications.length,
    notifications
  });
});

// @desc    Xóa (ORDER) hoặc Đánh dấu đã đọc (PROMOTION/SYSTEM) thông báo
// @route   DELETE /api/notifications/:id
// @access  User (cần đăng nhập)
export const deleteNotification = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user?.id;

  const result = await notificationService.deleteOrReadNotification(id, userId);
  res.status(200).json(result);
});

// @desc    Đếm số thông báo chưa đọc (thông báo riêng + thông báo chung chưa đọc)
// @route   GET /api/notifications/unread-count
// @access  User (cần đăng nhập)
export const getUnreadCount = asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  const unreadCount = await notificationService.getUnreadCount(userId);

  res.status(200).json({
    success: true,
    unreadCount
  });
});

