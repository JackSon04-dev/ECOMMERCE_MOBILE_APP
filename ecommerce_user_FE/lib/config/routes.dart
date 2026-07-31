/// 🛣️ Routes - Define all routes in the application
class AppRoutes {
  // Auth routes
  static const String login = '/login';
  static const String register = '/register';
  static const String forgotPassword = '/forgot-password';

  // Main routes
  static const String splash = '/';
  static const String home = '/homes';

  // Product routes
  static const String products = '/products';
  static const String productDetail = '/product-detail';
  static const String search = '/search';

  // Cart & Checkout routes
  static const String cart = '/cart';
  static const String checkout = '/checkout';

  // Order routes
  static const String orders = '/orders';
  static const String orderDetail = '/order-detail';
  static const String createReview = '/create-review';

  // Profile routes
  static const String profile = '/profile';
  static const String profileInfo = '/profile-info';
  static const String changePassword = '/change-password';

  // Notification routes
  static const String notifications = '/notifications';

  // Payment routes
  static const String vnpayPayment = '/vnpay-payment';
  static const String zalopayPayment = '/zalopay-payment';
  static const String payosPayment = '/payos-payment';

  // Error routes
  static const String notFound = '/404';
}
