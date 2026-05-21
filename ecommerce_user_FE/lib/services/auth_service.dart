import 'dart:convert';
import 'dart:io';
import 'package:device_info_plus/device_info_plus.dart';
import 'package:flutter/foundation.dart';
import 'api_service.dart';
import 'fcm_service.dart';

/// 🔐 Auth Service - Xử lý logic networking cho Authentication
/// Sử dụng ApiService để hưởng lợi từ logic Auto Refresh Token
class AuthService {
  static const String _endpoint = '/auth';

  /// Lấy tên thiết bị (Helper)
  static Future<String> getDeviceName() async {
    DeviceInfoPlugin deviceInfo = DeviceInfoPlugin();
    try {
      if (kIsWeb) return "Web Browser";
      if (Platform.isAndroid) {
        AndroidDeviceInfo androidInfo = await deviceInfo.androidInfo;
        return "${androidInfo.manufacturer} ${androidInfo.model}";
      } else if (Platform.isIOS) {
        IosDeviceInfo iosInfo = await deviceInfo.iosInfo;
        return iosInfo.name;
      }
    } catch (e) {
      debugPrint("❌ [Auth] Device info error: $e");
    }
    return "Unknown Device";
  }

  /// Đăng nhập bằng email và mật khẩu
  static Future<Map<String, dynamic>> login({
    required String email,
    required String password,
  }) async {
    final deviceName = await getDeviceName();
    
    final response = await ApiService.post(
      '$_endpoint/login',
      {
        'email': email,
        'password': password,
        'deviceName': deviceName,
      },
      withAuth: false, // Login không cần Auth header
    );

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      // Lưu token vào storage ngay khi login thành công
      await ApiService.saveTokens(data['accessToken'], data['refreshToken']);
      // Đăng ký FCM Token ngay sau khi login thành công
      await FcmService.getTokenAndRegister();
      return data;
    } else {
      final errorData = jsonDecode(response.body);
      throw errorData['msg'] ?? 'Đăng nhập thất bại';
    }
  }

  /// Đăng xuất - Xóa token cả trên server và client
  static Future<void> logout() async {
    try {
      // Hủy đăng ký FCM Token TRƯỚC khi logout (vì cần Auth header)
      await FcmService.unregisterToken();
      final refreshToken = await ApiService.getRefreshToken();
      if (refreshToken != null) {
        await ApiService.post(
          '$_endpoint/logout',
          {'token': refreshToken},
        );
      }
    } catch (e) {
      debugPrint("Error during API logout: $e");
    } finally {
      // Luôn xóa token ở client bất kể API có thành công hay không
      await ApiService.clearTokens();
    }
  }

  /// Lấy thông tin user hiện tại (Sử dụng API /me)
  /// ApiService sẽ tự động refresh token nếu cần
  static Future<Map<String, dynamic>?> getCurrentUser() async {
    final response = await ApiService.get('$_endpoint/me');
    
    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      return data['user'];
    }
    return null;
  }

  /// Đăng ký tài khoản mới
  static Future<void> register({
    required String username,
    required String email,
    required String password,
  }) async {
    final response = await ApiService.post(
      '$_endpoint/register',
      {
        'username': username,
        'email': email,
        'password': password,
      },
      withAuth: false,
    );

    if (response.statusCode != 201) {
      final errorData = jsonDecode(response.body);
      throw errorData['msg'] ?? 'Đăng ký thất bại';
    }
  }

  /// Đăng nhập bằng Google
  static Future<Map<String, dynamic>> googleLogin({
    required String idToken,
  }) async {
    final deviceName = await getDeviceName();
    
    final response = await ApiService.post(
      '$_endpoint/google-login',
      {
        'idToken': idToken,
        'deviceName': deviceName,
      },
      withAuth: false,
    );

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      await ApiService.saveTokens(data['accessToken'], data['refreshToken']);
      // Đăng ký FCM Token ngay sau khi Google login thành công
      await FcmService.getTokenAndRegister();
      return data;
    } else {
      final errorData = jsonDecode(response.body);
      throw errorData['msg'] ?? 'Đăng nhập Google thất bại';
    }
  }
}
