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

  /// ✅ Check login status when opening app
  Future<void> checkLoginStatus() async {
    if (state.isCheckingAuth) return;
    
    state = state.copyWith(isCheckingAuth: true);

    try {
      // Read token from storage for quick check (avoid redundant API calls if not logged in)
      final accessToken = await ApiService.getAccessToken();

      if (accessToken != null) {
        // Get user info (ApiService will auto refresh token if needed)
        final userData = await AuthService.getCurrentUser();
        if (userData != null) {
          state = state.copyWith(
            user: UserModel.fromJson(userData),
          );
        } else {
          // If user cannot be fetched (401 twice or other error), clear state
          await logout();
        }
      }
    } catch (e) {
      debugPrint("❌ [Auth] Check login error: $e");
    } finally {
      state = state.copyWith(isCheckingAuth: false);
    }
  }

  /// 🔑 Login
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

  /// 🚪 Logout
  Future<void> logout() async {
    try {
      await AuthService.logout();
    } catch (error) {
      debugPrint("Error logging out: $error");
    } finally {
      state = AuthState(); // Reset to default

      // Cleanup Notification State by borrowing context from global NavigatorKey
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

  /// 📝 Register
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

  /// 🌐 Google Login
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
