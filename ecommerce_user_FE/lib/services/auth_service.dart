import 'dart:convert';
import 'dart:io';
import 'package:device_info_plus/device_info_plus.dart';
import 'package:flutter/foundation.dart';
import 'api_service.dart';
import 'fcm_service.dart';

/// 🔐 Auth Service - Handles networking logic for Authentication
/// Uses ApiService to leverage the Auto Refresh Token logic
class AuthService {
  static const String _endpoint = '/auth';

  /// Get device name (Helper)
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
      // ---> LOG: EXCEPTION
      debugPrint("❌ [Auth] Device info error: $e");
    }
    return "Unknown Device";
  }

  /// Login using email and password
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
      withAuth: false, // Login doesn't require Auth header
    );

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      // Save tokens to storage immediately after successful login
      await ApiService.saveTokens(data['accessToken'], data['refreshToken']);
      // Register FCM Token immediately after successful login
      await FcmService.getTokenAndRegister();
      return data;
    } else {
      final errorData = jsonDecode(response.body);
      throw errorData['msg'] ?? 'Login failed';
    }
  }

  /// Logout - Delete tokens on both server and client
  static Future<void> logout() async {
    try {
      // Unregister FCM Token BEFORE logout (requires Auth header)
      await FcmService.unregisterToken();
      final refreshToken = await ApiService.getRefreshToken();
      if (refreshToken != null) {
        await ApiService.post(
          '$_endpoint/logout',
          {'token': refreshToken},
        );
      }
    } catch (e) {
      // ---> LOG: EXCEPTION
      debugPrint("❌ [Auth] API logout error: $e");
    } finally {
      // Always clear tokens on client regardless of API success
      await ApiService.clearTokens();
    }
  }

  /// Get current user information (Uses /me API)
  /// ApiService will automatically refresh token if needed
  static Future<Map<String, dynamic>?> getCurrentUser() async {
    final response = await ApiService.get('$_endpoint/me');
    
    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      return data['user'];
    }
    return null;
  }

  /// Register a new account
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
      throw errorData['msg'] ?? 'Registration failed';
    }
  }

  /// Login with Google
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
      // Register FCM Token immediately after successful Google login
      await FcmService.getTokenAndRegister();
      return data;
    } else {
      final errorData = jsonDecode(response.body);
      throw errorData['msg'] ?? 'Google login failed';
    }
  }
}
