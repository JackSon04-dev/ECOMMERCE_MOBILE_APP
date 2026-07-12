import 'dart:convert';
import '../models/voucher_model.dart';
import 'api_service.dart';

/// 🎫 Voucher Service - API calls for voucher
class VoucherService {
  static Future<VoucherModel?> applyVoucher(String voucherCode, double totalOrder) async {
    try {
      // ---> LOG: INFO
      print('🎫 [Voucher] Applying: $voucherCode');

      final response = await ApiService.post(
        '/vouchers/apply',
        {
          'voucherCode': voucherCode.toUpperCase(),
          'orderTotal': totalOrder,
        },
        withAuth: false, // No auth needed to check voucher
      );

      // ---> LOG: INFO
      print('🌐 [VoucherService] Response status: ${response.statusCode}');

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        // ---> LOG: SUCCESS
        print('✅ [Voucher] Valid - Discount: ${data['voucher']['discountAmount']}');
        return VoucherModel.fromJson(data['voucher']);
      } else {
        // Invalid voucher, get message from server
        final data = jsonDecode(response.body);
        final errorMessage = data['message'] ?? 'Invalid voucher code';
        // ---> LOG: FAILURE
        print('❌ [Voucher] Invalid: $errorMessage');
        throw Exception(errorMessage);
      }
    } catch (e) {
      // ---> LOG: FAILURE
      print('❌ [Voucher] Apply error: $e');
      rethrow; // Rethrow exception for UI to handle
    }
  }
}

