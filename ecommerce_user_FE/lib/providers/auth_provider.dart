import 'dart:async';
import 'package:flutter/material.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../services/auth_service.dart';
import '../services/api_service.dart';

class AuthState {
  final String? accessToken;
  final String? refreshToken;
  final Map<String, dynamic>? user;
  final bool isCheckingAuth;

  AuthState({
    this.accessToken,
    this.refreshToken,
    this.user,
    this.isCheckingAuth = false,
  });

  bool get isLoggedIn => user != null && accessToken != null;
  bool get isAdmin => user?['role'] == 'admin' ?? false;

  AuthState copyWith({
    String? accessToken,
    String? refreshToken,
    Map<String, dynamic>? user,
    bool? isCheckingAuth,
  }) {
    return AuthState(
      accessToken: accessToken ?? this.accessToken,
      refreshToken: refreshToken ?? this.refreshToken,
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
      // Đọc token từ storage (thông qua ApiService)
      final accessToken = await ApiService.getAccessToken();
      final refreshToken = await ApiService.getRefreshToken();

      if (accessToken != null) {
        // Lấy thông tin user (ApiService sẽ tự động refresh token nếu cần)
        final userData = await AuthService.getCurrentUser();
        if (userData != null) {
          // Cập nhật lại token mới nhất sau khi getCurrentUser (có thể đã được refresh)
          final latestToken = await ApiService.getAccessToken();
          state = state.copyWith(
            accessToken: latestToken,
            refreshToken: refreshToken,
            user: userData,
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
        accessToken: data['accessToken'],
        refreshToken: data['refreshToken'],
        user: data['user'],
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
        accessToken: data['accessToken'],
        refreshToken: data['refreshToken'],
        user: data['user'],
      );
    } catch (e) {
      rethrow;
    }
  }
}

final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  return AuthNotifier();
});
