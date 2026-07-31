import Notification from '../models/notification.js';
import NotificationRead from '../models/notificationRead.js';

/**
 * 🔔 Get user's notifications (general + private)
 * @param {string|null} userId - User ID (if logged in)
 * @param {string} type - Notification type to filter (e.g.: PROMOTION, ORDER...)
 * @returns {Promise<array>} Array containing notification list
 */
export const getNotifications = async (userId, type) => {
  // Build query conditions
  const query = {};

  // If userId exists: get private (userId = userId) + general notifications (userId = null)
  // If no userId: get only general notifications (userId = null)
  if (userId) {
    query.$or = [{ userId: userId }, { userId: null }];
  } else {
    query.userId = null;
  }

  // Filter by notification type if any
  if (type) {
    query.type = type.toUpperCase();
  }

  // Get max 50 newest notifications to paginate and avoid data overload
  const notifications = await Notification.find(query)
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

  const notificationIds = notifications.map(n => n._id);

  // Only query read status of the returning notifications
  let readNotificationSet = new Set();
  if (userId && notificationIds.length > 0) {
    const readNotifications = await NotificationRead.find({
      userId,
      notificationId: { $in: notificationIds }
    })
      .select('notificationId')
      .lean();
    readNotificationSet = new Set(readNotifications.map(item => item.notificationId.toString()));
  }

  // Apply isRead status using Set.has() in O(1) time
  const mappedNotifications = notifications.map(notification => {
    let isRead = false;
    if (notification.userId) {
      // Private notifications (ORDER): due to delete-on-read mechanism, all existing ones are unread
      isRead = false;
    } else {
      // General notifications (PROMOTION, SYSTEM, GENERAL): check in Set
      isRead = readNotificationSet.has(notification._id.toString());
    }
    return {
      ...notification,
      id: notification._id.toString(),
      isRead
    };
  });

  return mappedNotifications;
};

/**
 * 🔔 Delete (ORDER) or Mark as read (PROMOTION/SYSTEM) notification
 * @param {string} idOrIds - ID or array of IDs of notifications to process
 * @param {string} userId - ID of the user performing the action
 * @returns {Promise<object>} Result object { success, message }
 */
export const deleteOrReadNotification = async (idOrIds, userId) => {
  // If comma-separated string received (from Controller URL Params), auto split into array
  if (typeof idOrIds === 'string' && idOrIds.includes(',')) {
    idOrIds = idOrIds.split(',');
  }

  const isArray = Array.isArray(idOrIds);
  const ids = isArray ? idOrIds : [idOrIds];

  if (ids.length === 0) return { success: true, message: 'Không có thông báo nào được xử lý' };

  // 1. Must Query DB to get exact type and expireAt (Security: Do not trust Client)
  const notifications = await Notification.find({ _id: { $in: ids } });

  const orderIds = [];
  const bulkOps = [];

  for (const notification of notifications) {
    if (notification.type === 'ORDER') {
      // Security: Only allow deleting ORDER if it truly belongs to the User
      if (notification.userId && notification.userId.toString() === userId) {
        orderIds.push(notification._id);
      }
    } else {
      // General notifications (PROMOTION, SYSTEM, GENERAL): Create Upsert command in bulkOps
      bulkOps.push({
        updateOne: {
          filter: { userId, notificationId: notification._id },
          update: { $setOnInsert: { readAt: new Date(), expireAt: notification.expireAt } },
          upsert: true
        }
      });
    }
  }

  // 2. Execute Bulk Operations concurrently (Only takes 1 DB call)
  const promises = [];

  if (orderIds.length > 0) {
    promises.push(Notification.deleteMany({ _id: { $in: orderIds }, userId }));
  }

  if (bulkOps.length > 0) {
    promises.push(NotificationRead.bulkWrite(bulkOps));
  }

  await Promise.all(promises);

  return {
    success: true,
    message: isArray ? 'Đã xử lý hàng loạt thông báo thành công' : 'Đã xử lý thông báo thành công'
  };
};

/**
 * 🔔 Count unread notifications (private + unread general notifications)
 * @param {string} userId - ID of the user to count notifications for
 * @returns {Promise<number>} Number of unread notifications
 */
export const getUnreadCount = async (userId) => {
  // 1. Count user's private notifications (not deleted = unread)
  const personalUnreadCount = await Notification.countDocuments({
    userId: userId
  });

  // 2. Count general notifications (userId = null) not yet read
  const globalNotifications = await Notification.find({ userId: null })
    .select('_id')
    .lean();
  const globalNotificationIds = globalNotifications.map(n => n._id.toString());

  const readGlobalCount = await NotificationRead.countDocuments({
    userId: userId,
    notificationId: { $in: globalNotificationIds }
  });

  const globalUnreadCount = globalNotificationIds.length - readGlobalCount;

  return personalUnreadCount + globalUnreadCount;
};
