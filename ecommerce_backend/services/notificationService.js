import Notification from '../models/notification.js';
import NotificationRead from '../models/notificationRead.js';

/**
 * 🔔 Lấy thông báo của user (thông báo chung + thông báo riêng)
 * @param {string|null} userId - ID của người dùng (nếu có đăng nhập)
 * @param {string} type - Loại thông báo cần lọc (ví dụ: PROMOTION, ORDER...)
 * @returns {Promise<array>} Mảng chứa danh sách các thông báo
 */
export const getNotifications = async (userId, type) => {
  // Xây dựng điều kiện query
  const query = {};

  // Nếu có userId: lấy thông báo riêng (userId = userId) + thông báo chung (userId = null)
  // Nếu không có userId: chỉ lấy thông báo chung (userId = null)
  if (userId) {
    query.$or = [{ userId: userId }, { userId: null }];
  } else {
    query.userId = null;
  }

  // Lọc theo loại thông báo nếu có
  if (type) {
    query.type = type.toUpperCase();
  }

  // Lấy tối đa 50 thông báo mới nhất để phân trang tránh quá tải dữ liệu
  const notifications = await Notification.find(query)
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

  const notificationIds = notifications.map(n => n._id);

  // Chỉ truy vấn trạng thái đã đọc của các thông báo đang được trả về
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

  // Áp dụng trạng thái isRead bằng Set.has() với thời gian O(1)
  const mappedNotifications = notifications.map(notification => {
    let isRead = false;
    if (notification.userId) {
      // Thông báo cá nhân (ORDER): do cơ chế xóa khi đọc, mọi tin còn tồn tại đều là chưa đọc
      isRead = false;
    } else {
      // Thông báo chung (PROMOTION, SYSTEM, GENERAL): check trong Set
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
 * 🔔 Xóa (ORDER) hoặc Đánh dấu đã đọc (PROMOTION/SYSTEM) thông báo
 * @param {string} idOrIds - ID hoặc mảng các ID của thông báo cần xử lý
 * @param {string} userId - ID của người dùng thực hiện thao tác
 * @returns {Promise<object>} Đối tượng kết quả { success, message }
 */
export const deleteOrReadNotification = async (idOrIds, userId) => {
  // Nếu nhận vào chuỗi chứa dấu phẩy (từ URL Params của Controller), tự động chẻ thành mảng
  if (typeof idOrIds === 'string' && idOrIds.includes(',')) {
    idOrIds = idOrIds.split(',');
  }

  const isArray = Array.isArray(idOrIds);
  const ids = isArray ? idOrIds : [idOrIds];

  if (ids.length === 0) return { success: true, message: 'Không có thông báo nào được xử lý' };

  // 1. Phải Query DB để lấy type và expireAt chính xác (Bảo mật: Không tin tưởng Client)
  const notifications = await Notification.find({ _id: { $in: ids } });

  const orderIds = [];
  const bulkOps = [];

  for (const notification of notifications) {
    if (notification.type === 'ORDER') {
      // Bảo mật: Chỉ cho phép xóa ORDER nếu đúng là của User đó
      if (notification.userId && notification.userId.toString() === userId) {
        orderIds.push(notification._id);
      }
    } else {
      // Thông báo chung (PROMOTION, SYSTEM, GENERAL): Tạo lệnh Upsert vào bulkOps
      bulkOps.push({
        updateOne: {
          filter: { userId, notificationId: notification._id },
          update: { $setOnInsert: { readAt: new Date(), expireAt: notification.expireAt } },
          upsert: true
        }
      });
    }
  }

  // 2. Thực thi Bulk Operations song song (Chỉ mất 1 lần gọi DB)
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
 * 🔔 Đếm số thông báo chưa đọc (thông báo riêng + thông báo chung chưa đọc)
 * @param {string} userId - ID của người dùng cần đếm thông báo
 * @returns {Promise<number>} Số lượng thông báo chưa đọc
 */
export const getUnreadCount = async (userId) => {
  // 1. Đếm thông báo riêng của user (chưa bị xóa = chưa đọc)
  const personalUnreadCount = await Notification.countDocuments({
    userId: userId
  });

  // 2. Đếm thông báo chung (userId = null) chưa được đọc
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
