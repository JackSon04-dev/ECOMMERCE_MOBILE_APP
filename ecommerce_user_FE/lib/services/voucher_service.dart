import 'dart:convert';
import '../models/voucher_model.dart';
import 'api_service.dart';

/// 🎫 Voucher Service - API calls cho voucher
class VoucherService {
  static Future<VoucherModel?> applyVoucher(String voucherCode, double totalOrder) async {
    try {
      print('🎫 [Voucher] Applying: $voucherCode');

      final response = await ApiService.post(
        '/vouchers/apply',
        {
          'voucherCode': voucherCode.toUpperCase(),
          'orderTotal': totalOrder,
        },
        withAuth: false, // Không cần auth để check voucher
      );

      print('🌐 [VoucherService] Response status: ${response.statusCode}');

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        print('✅ [Voucher] Valid - Discount: ${data['voucher']['discountAmount']}');
        return VoucherModel.fromJson(data['voucher']);
      } else {
        // Voucher không hợp lệ, lấy message từ server
        final data = jsonDecode(response.body);
        final errorMessage = data['message'] ?? 'Mã giảm giá không hợp lệ';
        print('❌ [Voucher] Invalid: $errorMessage');
        throw Exception(errorMessage);
      }
    } catch (e) {
      print('❌ [Voucher] Apply error: $e');
      rethrow; // Ném lại exception để UI xử lý
    }
  }
}

