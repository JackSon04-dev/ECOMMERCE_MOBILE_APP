import 'dart:convert';
import '../models/notification_model.dart';
import 'api_service.dart';

/// 🔔 Notification Service - Simplified for data fetching only
class NotificationService {
  /// Fetch all notifications from API
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
      // ---> LOG: FAILURE
      print('❌ Get notifications error: $e');
      return [];
    }
  } 

  // Mark notification as read or delete (call DELETE API)
  static Future<bool> markAsRead(String id) async {
    try {
      final response = await ApiService.delete('/notifications/$id');
      return response.statusCode == 200;
    } catch (e) {
      // ---> LOG: FAILURE
      print('❌ Mark notification read error: $e');
      return false;
    }
  }
}
