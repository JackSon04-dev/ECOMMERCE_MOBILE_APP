import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/auth_provider.dart';
import '../config/routes.dart';

/// 🔐 Auth Guard - Kiểm tra đăng nhập trước khi thực hiện hành động
/// Trả về true nếu đã đăng nhập, false nếu chưa (đã hiển thị dialog/navigate)
class AuthGuard {
  /// Kiểm tra đăng nhập. Nếu chưa → mở LoginScreen dạng modal
  /// Trả về true nếu đã đăng nhập (hoặc vừa đăng nhập xong)
  static Future<bool> requireAuth(BuildContext context, WidgetRef ref) async {
    final auth = ref.read(authProvider);

    if (auth.isLoggedIn) return true;

    // Chưa đăng nhập → mở LoginScreen, chờ kết quả
    final result = await Navigator.pushNamed(context, AppRoutes.login);

    // Sau khi quay lại, check lại trạng thái
    if (result == true) {
      // Login thành công (LoginScreen pop(true))
      return true;
    }

    // User cancel / back
    return ref.read(authProvider).isLoggedIn;
  }


  /// Hiển thị SnackBar yêu cầu đăng nhập
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

