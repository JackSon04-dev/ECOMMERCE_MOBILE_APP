import 'dart:convert';
import 'package:http/http.dart' as http;
import 'api_service.dart';

/// 🛒 Cung cấp các thao tác API liên quan đến Giỏ hàng (Cart)
class CartService {
  static const String _endpoint = '/cart';

  /// 📥 [GET] Lấy giỏ hàng từ Server (Đã tự động tính toán Live Stock)
  /// Trả về chuỗi JSON thô để Provider tự parse
  static Future<Map<String, dynamic>> getCart() async {
    try {
      final response = await ApiService.get(_endpoint, withAuth: true);

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['success'] == true && data['cart'] != null) {
          return data['cart'];
        }
      }
      return {};
    } catch (e) {
      print('❌ [Cart] Fetch error: $e');
      throw Exception('Không thể lấy giỏ hàng');
    }
  }

  /// 📤 [POST] /update - Đồng bộ hóa giỏ hàng lên Server
  /// Có thể gửi 1 Array (để Sync hàng loạt sau 15s) hoặc truyền lẻ 1 Object
  /// Payload truyền vào:
  /// - Dạng Sync (Batch): { "items": [ { productId, color, size, quantity }, ... ] }
  /// - Dạng lẻ: { "productId": "...", "color": "...", "size": "...", "quantity": 1 }
  static Future<bool> updateCart(Map<String, dynamic> payload) async {
    try {
      final response = await ApiService.patch(
        '$_endpoint/update',
        payload,
        withAuth: true,
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['success'] == true) {
          return true; // Thành công -> Báo UI clear LocalStorage cartUpdate
        }
      }
      
      print('❌ [Cart] Sync error: ${response.body}');
      return false;

    } catch (e) {
      print('❌ [Cart] Update exception: $e');
      return false;
    }
  }
}
