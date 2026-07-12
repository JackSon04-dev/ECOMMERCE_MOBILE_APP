import 'dart:async';
import 'package:flutter/material.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../services/auth_service.dart';
import '../services/api_service.dart';
import '../models/user_model.dart';
import '../config/route_generator.dart';
import 'package:provider/provider.dart' as legacy_provider;
import '../providers/notification_provider.dart';

class AuthState {
  final UserModel? user;
  final bool isCheckingAuth;

  AuthState({
    this.user,
    this.isCheckingAuth = false,
  });

  bool get isLoggedIn => user != null;
  bool get isAdmin => user?.role == 'admin';

  AuthState copyWith({
    UserModel? user,
    bool? isCheckingAuth,
  }) {
    return AuthState(
      user: user ?? this.user,
      isCheckingAuth: isCheckingAuth ?? this.isCheckingAuth,
    );
  }
}

class AuthNotifier extends StateNotifier<AuthState> {
  AuthNotifier() : super(AuthState());

  /// ✅ Kiểm tra trạng thái đăng nhập khi mở app
  Future<void> checkLoginStatus() async {
    if (state.isCheckingAuth) return;
    
    state = state.copyWith(isCheckingAuth: true);

    try {
      // Đọc token từ storage để kiểm tra nhanh (tránh gọi API thừa nếu chưa đăng nhập)
      final accessToken = await ApiService.getAccessToken();

      if (accessToken != null) {
        // Lấy thông tin user (ApiService sẽ tự động refresh token nếu cần)
        final userData = await AuthService.getCurrentUser();
        if (userData != null) {
          state = state.copyWith(
            user: UserModel.fromJson(userData),
          );
        } else {
          // Nếu không lấy được user (401 lần 2 hoặc lỗi khác), clear state
          await logout();
        }
      }
    } catch (e) {
      debugPrint("❌ [Auth] Check login error: $e");
    } finally {
      state = state.copyWith(isCheckingAuth: false);
    }
  }

  /// 🔑 Đăng nhập
  Future<void> login({required String email, required String password}) async {
    try {
      final data = await AuthService.login(email: email, password: password);
      
      state = state.copyWith(
        user: UserModel.fromJson(data['user']),
      );
    } catch (error) {
      rethrow;
    }
  }

  /// 🚪 Đăng xuất
  Future<void> logout() async {
    try {
      await AuthService.logout();
    } catch (error) {
      debugPrint("Error logging out: $error");
    } finally {
      state = AuthState(); // Reset về mặc định

      // Dọn dẹp Notification State bằng cách mượn context từ NavigatorKey toàn cục
      try {
        final context = RouteGenerator.navigatorKey.currentContext;
        if (context != null) {
          legacy_provider.Provider.of<NotificationProvider>(context, listen: false).clearNotifications();
        }
      } catch (e) {
        debugPrint("❌ [Auth] Error clearing notifications: $e");
      }
    }
  }

  /// 📝 Đăng ký
  Future<void> register({
    required String username,
    required String email,
    required String password,
  }) async {
    try {
      await AuthService.register(
        username: username,
        email: email,
        password: password,
      );
    } catch (e) {
      rethrow;
    }
  }

  /// 🌐 Đăng nhập Google
  Future<void> googleLogin() async {
    final GoogleSignIn googleSignIn = GoogleSignIn(
      scopes: ['email', 'profile'],
      serverClientId: dotenv.env['SERVER_CLIENT_ID'],
    );

    try {
      await googleSignIn.signOut();
      final GoogleSignInAccount? account = await googleSignIn.signIn();
      
      if (account == null) throw 'Đăng nhập Google đã bị hủy.';

      final GoogleSignInAuthentication auth = await account.authentication;
      final String? idToken = auth.idToken;
      
      if (idToken == null) throw 'Không lấy được Google ID Token.';

      final data = await AuthService.googleLogin(idToken: idToken);

      state = state.copyWith(
        user: UserModel.fromJson(data['user']),
      );
    } catch (e) {
      rethrow;
    }
  }
}

final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  return AuthNotifier();
});
