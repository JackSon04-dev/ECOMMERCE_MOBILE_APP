import 'dart:convert';
import 'package:http/http.dart' as http;
import 'api_service.dart';

/// 🛒 Provides API operations related to the Cart
class CartService {
  static const String _endpoint = '/cart';

  /// 📥 [GET] Fetch cart from Server (Auto-calculated Live Stock)
  /// Returns raw JSON string for Provider to parse
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
      // ---> LOG: FAILURE
      print('❌ [Cart] Fetch error: $e');
      throw Exception('Cannot fetch cart');
    }
  }

  /// 📤 [POST] /update - Synchronize cart to Server
  /// Can send an Array (for bulk Sync after 15s) or a single Object
  /// Input payload:
  /// - Sync (Batch) format: { "items": [ { productId, color, size, quantity }, ... ] }
  /// - Single format: { "productId": "...", "color": "...", "size": "...", "quantity": 1 }
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
          return true; // Success -> Notify UI to clear LocalStorage cartUpdate
        }
      }
      
      // ---> LOG: FAILURE
      print('❌ [Cart] Sync error: ${response.body}');
      return false;

    } catch (e) {
      // ---> LOG: FAILURE
      print('❌ [Cart] Update exception: $e');
      return false;
    }
  }
}
