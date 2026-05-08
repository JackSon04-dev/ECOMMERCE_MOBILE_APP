import 'dart:convert';
import '../models/order_model.dart';
import 'api_service.dart';

/// 📦 Order Service - API calls cho đơn hàng
class OrderService {
  /// Lấy tất cả đơn hàng của user
  static Future<List<Order>> getMyOrders({int page = 1, int limit = 10, String? status}) async {
    try {
      String endpoint = '/orders/my-orders?page=$page&limit=$limit';
      if (status != null && status.isNotEmpty) {
        endpoint += '&status=$status';
      }

      final response = await ApiService.get(endpoint);

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final List<dynamic> ordersJson = data['orders'] ?? data;
        final orders = ordersJson.map((json) => Order.fromJson(json)).toList();

        print('✅ [Order] Loaded ${orders.length} orders');
        return orders;
      }

      print('❌ [Order] Fetch failed: ${response.statusCode}');
      return [];
    } catch (e) {
      print('❌ [Order] Fetch error: $e');
      return [];
    }
  }

  /// Lấy chi tiết đơn hàng
  static Future<Order> getOrderById(String id) async {
    try {
      final response = await ApiService.get('/orders/$id');

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final order = Order.fromJson(data['order'] ?? data);

        print('✅ [Order] Loaded detail: ${order.id}');
        return order;
      }

      print('❌ [Order] Detail failed: ${response.statusCode}');
      throw Exception('Không tìm thấy đơn hàng');
    } catch (e) {
      print('❌ [Order] Detail error: $e');
      rethrow;
    }
  }

  /// Tạo đơn hàng mới
  static Future<Order?> createOrder({
    required List<Map<String, dynamic>> orderItems,
    required String paymentMethod,
    required Map<String, dynamic> userInfo,
    String? voucherCode,
  }) async {
    try {
      print('📦 [Order] Creating order: ${orderItems.length} items');

      final body = {
        'orderItems': orderItems,
        'paymentMethod': paymentMethod,
        'userInfo': userInfo,
      };

      if (voucherCode != null && voucherCode.isNotEmpty) {
        body['voucherCode'] = voucherCode;
      }

      final response = await ApiService.post('/orders', body);

      if (response.statusCode == 201 || response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final order = Order.fromJson(data['order'] ?? data);

        print('✅ [Order] Create success: ${order.id}');
        return order;
      } else {
        try {
          final data = jsonDecode(response.body);
          final errorMessage = data['message'] ?? 'Đặt hàng thất bại';
          print('❌ [Order] Create failed: $errorMessage');
          throw Exception(errorMessage);
        } catch (e) {
          print('❌ [Order] Create parse error: $e');
          throw Exception('Đặt hàng thất bại. Vui lòng thử lại.');
        }
      }
    } catch (e) {
      print('❌ [OrderService] createOrder error: $e');
      rethrow; // Throw exception to UI for proper error handling
    }
  }

  /// Hủy đơn hàng
  static Future<Order?> cancelOrder(String orderId) async {
    try {
      final response = await ApiService.patch(
        '/orders/$orderId/cancel',
        {},
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final updatedOrder = Order.fromJson(data['order'] ?? data);
        print('✅ [Order] Cancelled: $orderId');
        return updatedOrder;
      }

      print('❌ [Order] Cancel failed: ${response.statusCode}');
      return null;
    } catch (e) {
      print('❌ [Order] Cancel error: $e');
      return null;
    }
  }

  /// Xác nhận đã nhận hàng → cập nhật status thành "Thành công"
  static Future<Order?> confirmReceived(String orderId) async {
    try {
      print('📦 [OrderService] confirmReceived - OrderID: $orderId');
      final response = await ApiService.patch(
        '/orders/$orderId/confirm-received',
        {},
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final updatedOrder = Order.fromJson(data['order'] ?? data);
        return updatedOrder;
      }

      print('❌ [OrderService] confirmReceived - Failed: ${response.statusCode}');
      print('📄 Response: ${response.body}');
      return null;
    } catch (e) {
      print('❌ [Order] ConfirmReceived error: $e');
      return null;
    }
  }

  /// Lấy đơn hàng theo trạng thái
  static Future<List<Order>> getOrdersByStatus(String status) async {
    return getMyOrders(status: status);
  }
}

