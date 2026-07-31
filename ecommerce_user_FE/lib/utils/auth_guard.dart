import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/auth_provider.dart';
import '../config/routes.dart';

/// 🔐 Auth Guard - Check login before taking action
/// Return true if logged in, false if not (showed dialog/navigate)
class AuthGuard {
  /// Check login. If not -> open LoginScreen in modal mode
  /// Return true if logged in (or just logged in)
  static Future<bool> requireAuth(BuildContext context, WidgetRef ref) async {
    final auth = ref.read(authProvider);

    if (auth.isLoggedIn) return true;

    // Not logged in -> open LoginScreen, wait for result
    final result = await Navigator.pushNamed(context, AppRoutes.login);

    // After returning, check status again
    if (result == true) {
      // Login successful (LoginScreen pop(true))
      return true;
    }

    // User cancel / back
    return ref.read(authProvider).isLoggedIn;
  }


  /// Show SnackBar requesting login
  static void showLoginRequired(BuildContext context, {String? message}) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message ?? 'Vui lòng đăng nhập để sử dụng tính năng này'),
        backgroundColor: Colors.orange,
        action: SnackBarAction(
          label: 'Đăng nhập',
          textColor: Colors.white,
          onPressed: () => Navigator.pushNamed(context, AppRoutes.login),
        ),
        duration: const Duration(seconds: 3),
      ),
    );
  }
}

