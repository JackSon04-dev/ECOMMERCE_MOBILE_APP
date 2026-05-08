import 'dart:convert';
import '../models/notification_model.dart';
import 'api_service.dart';

/// 🔔 Notification Service - Đơn giản hóa chỉ lấy dữ liệu
class NotificationService {
  /// Lấy tất cả thông báo từ API
  static Future<List<NotificationModel>> getNotifications() async {
    try {
      final response = await ApiService.get('/notifications');

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final List<dynamic> notificationsJson = data['notifications'] ?? data;
        
        return notificationsJson.map((json) => NotificationModel.fromJson(json)).toList();
      }
      return [];
    } catch (e) {
      print('❌ Get notifications error: $e');
      return [];
    }
  }
}
