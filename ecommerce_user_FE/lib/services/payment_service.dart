import 'dart:convert';
import 'api_service.dart';

/// 💳 Payment Service - VNPay Payment Handling
class PaymentService {
  /// Create VNPay payment URL from backend
  /// Backend will create payment URL with VNPay Sandbox
  /// Return URL for app to open browser/WebView
  static Future<String?> createVnpayPaymentUrl(String orderId) async {
    try {
      // ---> LOG: INFO
      print('💳 [Payment] Creating VNPay URL for order: $orderId');

      final response = await ApiService.post(
        '/payment/create_payment_url',
        {'orderId': orderId},
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        final data = jsonDecode(response.body);
        final paymentUrl = data['paymentUrl'] as String?;

        if (paymentUrl != null && paymentUrl.isNotEmpty) {
          // ---> LOG: SUCCESS
          print('✅ [Payment] URL created successfully');
          return paymentUrl;
        }
      }

      // ---> LOG: FAILURE
      print('❌ [Payment] Create URL failed: ${response.statusCode}');
      return null;
    } catch (e) {
      // ---> LOG: FAILURE
      print('❌ [Payment] Create URL error: $e');
      return null;
    }
  }

  /// Create ZaloPay payment info
  /// Return a Map containing `zpTransToken` and `orderUrl`
  static Future<Map<String, dynamic>?> createZalopayPayment(String orderId) async {
    try {
      // ---> LOG: INFO
      print('💳 [Payment] Creating ZaloPay URL for order: $orderId');

      final response = await ApiService.post(
        '/payment/create_zalopay_url',
        {'orderId': orderId},
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        final data = jsonDecode(response.body);
        if (data['success'] == true) {
          // ---> LOG: SUCCESS
          print('✅ [Payment] ZaloPay data created successfully');
          return {
            'orderUrl': data['orderUrl'],
            'zpTransToken': data['zpTransToken'],
            'amount': data['amount'],
          };
        }
      }

      // ---> LOG: FAILURE
      print('❌ [Payment] Create ZaloPay failed: ${response.statusCode}');
      return null;
    } catch (e) {
      // ---> LOG: FAILURE
      print('❌ [Payment] Create ZaloPay error: $e');
      return null;
    }
  }

  /// Create PayOS (VietQR) payment info
  /// Return Map containing `qrCode`, `checkoutUrl` and transfer info
  static Future<Map<String, dynamic>?> createPayosPayment(String orderId) async {
    try {
      // ---> LOG: INFO
      print('💳 [Payment] Creating PayOS URL for order: $orderId');

      final response = await ApiService.post(
        '/payment/create_payos_url',
        {'orderId': orderId},
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        final data = jsonDecode(response.body);
        if (data['success'] == true) {
          // ---> LOG: SUCCESS
          print('✅ [Payment] PayOS data created successfully');
          return data; // Return full data from API
        }
      }

      // ---> LOG: FAILURE
      print('❌ [Payment] Create PayOS failed: ${response.statusCode}');
      return null;
    } catch (e) {
      // ---> LOG: FAILURE
      print('❌ [Payment] Create PayOS error: $e');
      return null;
    }
  }

  /// Check payment status of the order
  static Future<bool> checkPaymentStatus(String orderId) async {
    try {
      // ---> LOG: INFO
      print('🔍 [Payment] Checking status for order: $orderId');

      final response = await ApiService.get('/payment/status/$orderId');

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final isPaid = data['isPaid'] == true;

        // ---> LOG: SUCCESS
        print('✅ [Payment] Status: isPaid = $isPaid');
        return isPaid;
      }

      // ---> LOG: FAILURE
      print('❌ [Payment] Check status failed: ${response.statusCode}');
      return false;
    } catch (e) {
      // ---> LOG: FAILURE
      print('❌ [Payment] Check status error: $e');
      return false;
    }
  }
}

