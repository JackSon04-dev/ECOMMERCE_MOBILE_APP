import 'package:flutter/material.dart';
import 'routes.dart';

// Import screens
import '../screens/auth/login_screen.dart';
import '../screens/auth/register_screen.dart';
import '../screens/user/homes/main_screen.dart';
import '../screens/user/products/products_page.dart';
import '../screens/user/products/product_detail_page.dart';
import '../screens/user/carts/cart_page.dart';
import '../screens/user/payments/checkout_page.dart';
import '../screens/user/orders/orders_page.dart';
import '../screens/user/orders/order_detail_page.dart';
import '../screens/user/notifications/notifications_page.dart';
import '../screens/user/profiles/profile_page.dart';
import '../screens/user/profiles/address_page.dart';
import '../screens/user/homes/search_page.dart';
import '../screens/user/profiles/change_password_page.dart';
import '../screens/user/payments/vnpay_payment_page.dart';
import '../screens/user/payments/zalopay_payment_page.dart';
import '../screens/user/payments/payos_payment_page.dart';
import '../screens/user/orders/create_review_page.dart';
import '../models/order_model.dart';

/// 🚀 Route Generator - Xử lý route generation và guards
/// Hiện tại support: login, register, homes (và các tab bên trong)
/// Thêm routes mới khi tạo screens mới
class RouteGenerator {
  static final GlobalKey<NavigatorState> navigatorKey = GlobalKey<NavigatorState>();

  /// ⭐ Main function - Được gọi mỗi khi navigate
  /// settings.name = route name (e.g., '/homes')
  static Route<dynamic> generateRoute(RouteSettings settings) {
    print('🔀 Navigate: ${settings.name}');

    switch (settings.name) {
      // ============ AUTH ROUTES ============

      case AppRoutes.login:
        return _buildRoute(const LoginScreen());

      case AppRoutes.register:
        return _buildRoute(const RegisterScreen());

      // ============ MAIN ROUTES ============
      case AppRoutes.splash:
      case AppRoutes.home:
        return _buildRoute(const MainScreen());

      // ============ PRODUCT ROUTES ============
      case AppRoutes.products:
        final args = settings.arguments;
        String? initialTag;
        if (args is Map<String, dynamic>) {
          initialTag = args['tag'] as String?;
        }
        return _buildRoute(ProductsPage(initialTag: initialTag));

      case AppRoutes.productDetail:
        final args = settings.arguments;
        if (args is String) {
          return _buildRoute(ProductDetailPage(productId: args));
        }
        return _buildRoute(const ProductDetailPage());

      case AppRoutes.search:
        return _buildRoute(const SearchPage());

      // ============ CART & CHECKOUT ROUTES ============
      case AppRoutes.cart:
        return _buildRoute(const CartPage());

      case AppRoutes.checkout:
        final args = settings.arguments;
        Map<String, dynamic>? checkoutArgs;
        if (args is Map<String, dynamic>) {
          checkoutArgs = args;
        }
        return _buildRoute(CheckoutPage(args: checkoutArgs));

      // ============ ORDER ROUTES ============
      case AppRoutes.orders:
        final args = settings.arguments;
        String? initialStatus;
        if (args is String) {
          initialStatus = args;
        }
        return _buildRoute(OrdersPage(initialStatus: initialStatus));

      case AppRoutes.orderDetail:
        final args = settings.arguments;
        if (args is Order) {
          return _buildRoute(OrderDetailPage(order: args));
        } else if (args is String) {
          return _buildRoute(OrderDetailPage(orderId: args));
        }
        return _buildRoute(const OrderDetailPage());

      case AppRoutes.createReview:
        final args = settings.arguments;
        if (args is Order) {
          return _buildRoute(CreateReviewPage(order: args));
        }
        return _buildRoute(_notFoundPage());

      // ============ PROFILE ROUTES ============
      case AppRoutes.profile:
        return _buildRoute(const ProfilePage());

      case AppRoutes.profileInfo:
        return _buildRoute(const AddressPage());

      case AppRoutes.changePassword:
        return _buildRoute(const ChangePasswordPage());

      case AppRoutes.vnpayPayment:
        final args = settings.arguments as Map<String, dynamic>;
        return _buildRoute(VnpayPaymentPage(
          orderId: args['orderId'] as String,
          paymentUrl: args['paymentUrl'] as String,
        ));
        
      case AppRoutes.zalopayPayment:
        final args = settings.arguments as Map<String, dynamic>;
        return _buildRoute(ZalopayPaymentPage(
          orderId: args['orderId'] as String,
          orderUrl: args['orderUrl'] as String,
          amount: (args['amount'] as num).toDouble(),
          zpTransToken: args['zpTransToken'] as String?,
        ));

      case AppRoutes.payosPayment:
        final args = settings.arguments as Map<String, dynamic>;
        return _buildRoute(PayosPaymentPage(
          orderId: args['orderId'] as String,
          qrCode: args['qrCode'] as String,
          checkoutUrl: args['checkoutUrl'] as String,
          amount: (args['amount'] as num).toDouble(),
          accountNumber: args['accountNumber'] as String,
          accountName: args['accountName'] as String,
          description: args['description'] as String,
        ));

      // ============ NOTIFICATION ROUTES ============
      case AppRoutes.notifications:
        final args = settings.arguments;
        String? initialType;
        if (args is String) {
          initialType = args;
        }
        return _buildRoute(NotificationsPage(initialType: initialType));

      // ============ ERROR ROUTES ============
      default:
        return _buildRoute(_notFoundPage());
    }
  }

  /// 🛣️ Helper 1: Build route với Material animation
  static MaterialPageRoute<dynamic> _buildRoute(Widget screen) {
    return MaterialPageRoute(builder: (_) => screen);
  }

  /// Trang 404 - Not Found
  static Widget _notFoundPage() {
    return Scaffold(
      appBar: AppBar(title: const Text('Không tìm thấy')),
      body: const Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.error_outline, size: 80, color: Colors.grey),
            SizedBox(height: 16),
            Text(
              'Trang không tồn tại',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600),
            ),
            SizedBox(height: 8),
            Text(
              'Vui lòng quay lại trang trước',
              style: TextStyle(color: Colors.grey),
            ),
          ],
        ),
      ),
    );
  }
}


