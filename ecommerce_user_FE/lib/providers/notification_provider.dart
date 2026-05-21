import 'package:flutter/material.dart';
import '../models/notification_model.dart';
import '../services/notification_service.dart';

class NotificationProvider extends ChangeNotifier {
  List<NotificationModel> _notifications = [];
  bool _isLoading = false;

  List<NotificationModel> get notifications => _notifications;
  bool get isLoading => _isLoading;

  int get unreadCount => _notifications.where((n) => !n.isRead).length;

  Future<void> fetchNotifications() async {
    _isLoading = true;
    notifyListeners();

    try {
      final results = await NotificationService.getNotifications();
      _notifications = results;
    } catch (e) {
      print('❌ [Notification] Fetch error: $e');
      _notifications = [];
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> markAsRead(String id) async {
    final index = _notifications.indexWhere((n) => n.id == id);
    if (index >= 0) {
      final notification = _notifications[index];
      // Chỉ gọi API nếu chưa đọc (hoặc là ORDER - ORDER luôn gọi xóa)
      if (!notification.isRead || notification.type == 'ORDER') {
        final success = await NotificationService.markAsRead(id);
        if (success) {
          if (notification.type == 'ORDER') {
            _notifications.removeAt(index);
          } else {
            _notifications[index] = notification.copyWith(isRead: true);
          }
          notifyListeners();
        }
      }
    } else {
      // Gọi API khi click từ FCM push notification nằm ngoài danh sách cục bộ
      await NotificationService.markAsRead(id);
    }
  }

  Future<void> markAllAsRead() async {
    final unreadNotifications = _notifications.where((n) => !n.isRead).toList();
    if (unreadNotifications.isEmpty) return;

    // Gọi API cho tất cả các thông báo chưa đọc song song
    final futures = unreadNotifications.map((n) => NotificationService.markAsRead(n.id));
    await Future.wait(futures);

    // Cập nhật state cục bộ:
    // - Lọc bỏ thông báo ORDER chưa đọc (vì đã bị xóa)
    // - Chuyển trạng thái các loại khác sang isRead = true
    _notifications = _notifications.map<NotificationModel?>((n) {
      if (n.isRead) return n;
      if (n.type == 'ORDER') return null;
      return n.copyWith(isRead: true);
    }).whereType<NotificationModel>().toList();

    notifyListeners();
  }
}
