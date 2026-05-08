import 'dart:convert';
import 'api_service.dart';

/// 💳 Payment Service - Xử lý thanh toán VNPay
class PaymentService {
  /// Tạo URL thanh toán VNPay từ backend
  /// Backend sẽ tạo payment URL với VNPay Sandbox
  /// Trả về URL để app mở trình duyệt/WebView
  static Future<String?> createVnpayPaymentUrl(String orderId) async {
    try {
      print('💳 [Payment] Creating VNPay URL for order: $orderId');

      final response = await ApiService.post(
        '/payment/create_payment_url',
        {'orderId': orderId},
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        final data = jsonDecode(response.body);
        final paymentUrl = data['paymentUrl'] as String?;

        if (paymentUrl != null && paymentUrl.isNotEmpty) {
          print('✅ [Payment] URL created successfully');
          return paymentUrl;
        }
      }

      print('❌ [Payment] Create URL failed: ${response.statusCode}');
      return null;
    } catch (e) {
      print('❌ [Payment] Create URL error: $e');
      return null;
    }
  }

  /// Tạo thông tin thanh toán ZaloPay
  /// Trả về một Map chứa `zpTransToken` và `orderUrl`
  static Future<Map<String, dynamic>?> createZalopayPayment(String orderId) async {
    try {
      print('💳 [Payment] Creating ZaloPay URL for order: $orderId');

      final response = await ApiService.post(
        '/payment/create_zalopay_url',
        {'orderId': orderId},
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        final data = jsonDecode(response.body);
        if (data['success'] == true) {
          print('✅ [Payment] ZaloPay data created successfully');
          return {
            'orderUrl': data['orderUrl'],
            'zpTransToken': data['zpTransToken'],
          };
        }
      }

      print('❌ [Payment] Create ZaloPay failed: ${response.statusCode}');
      return null;
    } catch (e) {
      print('❌ [Payment] Create ZaloPay error: $e');
      return null;
    }
  }

  /// Kiểm tra trạng thái thanh toán của đơn hàng
  static Future<bool> checkPaymentStatus(String orderId) async {
    try {
      print('🔍 [Payment] Checking status for order: $orderId');

      final response = await ApiService.get('/payment/status/$orderId');

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final isPaid = data['isPaid'] == true;

        print('✅ [Payment] Status: isPaid = $isPaid');
        return isPaid;
      }

      print('❌ [Payment] Check status failed: ${response.statusCode}');
      return false;
    } catch (e) {
      print('❌ [Payment] Check status error: $e');
      return false;
    }
  }
}

