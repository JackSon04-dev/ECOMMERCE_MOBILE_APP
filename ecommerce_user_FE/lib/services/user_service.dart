import 'dart:convert';
import '../models/user_model.dart';
import 'api_service.dart';

/// 👤 User Service - API calls cho user
class UserService {
  /// Lấy thông tin user hiện tại
  static Future<UserModel?> getMe() async {
    try {
      final response = await ApiService.get('/auth/me');

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return UserModel.fromJson(data['user'] ?? data);
      }
      return null;
    } catch (e) {
      print('❌ [Auth] Get me error: $e');
      return null;
    }
  }

  /// Cập nhật thông tin user
  static Future<UserModel?> updateProfile({
    String? username,
    String? address,
    String? phoneNumber,
  }) async {
    try {
      final body = <String, dynamic>{};
      if (username != null) body['username'] = username;
      if (address != null) body['address'] = address;
      if (phoneNumber != null) body['phoneNumber'] = phoneNumber;

      final response = await ApiService.put('/auth/update-profile', body);

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return UserModel.fromJson(data['user'] ?? data);
      }
      return null;
    } catch (e) {
      print('❌ [Auth] Update profile error: $e');
      return null;
    }
  }

  /// Đổi mật khẩu
  static Future<bool> changePassword({
    required String currentPassword,
    required String newPassword,
  }) async {
    try {
      final response = await ApiService.put('/auth/change-password', {
        'currentPassword': currentPassword,
        'newPassword': newPassword,
      });

      return response.statusCode == 200;
    } catch (e) {
      print('❌ [Auth] Change password error: $e');
      return false;
    }
  }
}

