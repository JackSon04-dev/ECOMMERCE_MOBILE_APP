import 'package:flutter/material.dart';
import '../models/notification_model.dart';
import '../services/notification_service.dart';

class NotificationProvider extends ChangeNotifier {
  List<NotificationModel> _notifications = [];
  bool _isLoading = false;

  List<NotificationModel> get notifications => _notifications;
  bool get isLoading => _isLoading;

  int get unreadCount => _notifications.where((n) => !n.isRead).length;

  void clearNotifications() {
    _notifications = [];
    _isLoading = false;
    notifyListeners();
  }

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

    // Nối tất cả ID chưa đọc bằng dấu phẩy
    final idsString = unreadNotifications.map((n) => n.id).join(',');

    // Gọi 1 API duy nhất cho hàng loạt ID
    final success = await NotificationService.markAsRead(idsString);

    if (success) {
      _notifications = _notifications.map<NotificationModel?>((n) {
        if (n.isRead) return n;
        if (n.type == 'ORDER') return null; // ORDER bị xóa
        return n.copyWith(isRead: true); // SYSTEM/PROMOTION được đánh dấu đã đọc
      }).whereType<NotificationModel>().toList();

      notifyListeners();
    }
  }
}
