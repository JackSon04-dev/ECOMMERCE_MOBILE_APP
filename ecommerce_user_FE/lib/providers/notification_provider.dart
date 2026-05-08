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
      
      // Áp dụng logic: 2 thông báo đầu tiên mặc định là chưa đọc (index 0, 1)
      _notifications = results.asMap().entries.map<NotificationModel>((entry) {
        int index = entry.key;
        NotificationModel node = entry.value;
        return node.copyWith(isRead: index >= 1);
      }).toList();
    } catch (e) {
      print('❌ [Notification] Fetch error: $e');
      _notifications = [];
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  void markAsRead(String id) {
    final index = _notifications.indexWhere((n) => n.id == id);
    if (index >= 0 && !_notifications[index].isRead) {
      _notifications[index] = _notifications[index].copyWith(isRead: true);
      notifyListeners();
    }
  }

  void markAllAsRead() {
    bool changed = false;
    _notifications = _notifications.map<NotificationModel>((n) {
      if (!n.isRead) {
        changed = true;
        return n.copyWith(isRead: true);
      }
      return n;
    }).toList();
    
    if (changed) {
      notifyListeners();
    }
  }
}
