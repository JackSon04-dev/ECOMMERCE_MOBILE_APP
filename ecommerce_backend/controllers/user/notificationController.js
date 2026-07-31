import * as notificationService from '../../services/notificationService.js';
import { asyncHandler } from '../../middleware/errorMiddleware.js';

// @desc    Get user's notifications (general + private)
// @route   GET /api/notifications
// @access  User (requires login)
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

// @desc    Delete (ORDER) or Mark as read (PROMOTION/SYSTEM) notification
// @route   DELETE /api/notifications/:id
// @access  User (requires login)
export const deleteNotification = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user?.id;

  const result = await notificationService.deleteOrReadNotification(id, userId);
  res.status(200).json(result);
});

// @desc    Count unread notifications (private + unread general)
// @route   GET /api/notifications/unread-count
// @access  User (requires login)
export const getUnreadCount = asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  const unreadCount = await notificationService.getUnreadCount(userId);

  res.status(200).json({
    success: true,
    unreadCount
  });
});

