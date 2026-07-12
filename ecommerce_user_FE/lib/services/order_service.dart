import 'dart:convert';
import '../models/order_model.dart';
import 'api_service.dart';

/// 📦 Order Service - API calls for orders
class OrderService {
  /// Get all user's orders
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

        // ---> LOG: SUCCESS
        print('✅ [Order] Loaded ${orders.length} orders');
        return orders;
      }

      // ---> LOG: FAILURE
      print('❌ [Order] Fetch failed: ${response.statusCode}');
      return [];
    } catch (e) {
      // ---> LOG: EXCEPTION
      print('❌ [Order] Fetch error: $e');
      return [];
    }
  }

  /// Get order details
  static Future<Order> getOrderById(String id) async {
    try {
      final response = await ApiService.get('/orders/$id');

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final order = Order.fromJson(data['order'] ?? data);

        // ---> LOG: SUCCESS
        print('✅ [Order] Loaded detail: ${order.id}');
        return order;
      }

      // ---> LOG: FAILURE
      print('❌ [Order] Detail failed: ${response.statusCode}');
      throw Exception('Order not found');
    } catch (e) {
      // ---> LOG: EXCEPTION
      print('❌ [Order] Detail error: $e');
      rethrow;
    }
  }

  /// Create a new order
  static Future<String?> createOrder({
    required List<Map<String, dynamic>> orderItems,
    required String paymentMethod,
    required Map<String, dynamic> userInfo,
    String? voucherCode,
  }) async {
    try {
      // ---> LOG: INFO
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

      // If Server returns 202 Accepted (Asynchronous processing via RabbitMQ)
      if (response.statusCode == 202) {
        final data = jsonDecode(response.body);
        final trackingId = data['trackingId'] as String;
        
        // ---> LOG: INFO
        print('⏳ [Order] Server accepted asynchronously. Polling status for trackingId: $trackingId');

        // Poll maximum 10 times, 1 second apart
        for (int i = 0; i < 10; i++) {
          await Future.delayed(const Duration(seconds: 1));
          
          // ---> LOG: INFO
          print('🔍 [Order] Polling attempt ${i + 1}/10...');
          
          final statusRes = await ApiService.get('/orders/status/$trackingId');
          
          if (statusRes.statusCode == 200) {
            final statusData = jsonDecode(statusRes.body);
            final status = statusData['status'] as String;

            if (status == 'success') {
              // ---> LOG: SUCCESS
              print('✅ [Order] Polled success: $trackingId');
              return trackingId;
            } else if (status == 'failed') {
              final errorMessage = statusData['message'] ?? 'Order failed';
              // ---> LOG: FAILURE
              print('❌ [Order] Polled failed: $errorMessage');
              throw Exception(errorMessage);
            }
          }
        }
        throw Exception('PROCESSING:$trackingId');
      }

      // Fallback: If returns 201 or 200 directly (Synchronous processing)
      if (response.statusCode == 201 || response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final orderId = data['order']?['_id'] ?? data['order']?['id'] ?? data['orderId'];

        // ---> LOG: SUCCESS
        print('✅ [Order] Create success (sync): $orderId');
        return orderId;
      } else {
        try {
          final data = jsonDecode(response.body);
          final errorMessage = data['message'] ?? 'Order failed';
          
          // ---> LOG: FAILURE
          print('❌ [Order] Create failed: $errorMessage');
          throw Exception(errorMessage);
        } catch (e) {
          // ---> LOG: EXCEPTION
          print('❌ [Order] Create parse error: $e');
          throw Exception('Order failed. Please try again.');
        }
      }
    } catch (e) {
      // ---> LOG: EXCEPTION
      print('❌ [OrderService] createOrder error: $e');
      rethrow; // Throw exception to UI for proper error handling
    }
  }

  /// Cancel order
  static Future<Order?> cancelOrder(String orderId) async {
    try {
      final response = await ApiService.patch(
        '/orders/$orderId/cancel',
        {},
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final updatedOrder = Order.fromJson(data['order'] ?? data);
        
        // ---> LOG: SUCCESS
        print('✅ [Order] Cancelled: $orderId');
        return updatedOrder;
      }

      // ---> LOG: FAILURE
      print('❌ [Order] Cancel failed: ${response.statusCode}');
      return null;
    } catch (e) {
      // ---> LOG: EXCEPTION
      print('❌ [Order] Cancel error: $e');
      return null;
    }
  }

  /// Confirm order received → update status to "Completed"
  static Future<Order?> confirmReceived(String orderId) async {
    try {
      // ---> LOG: INFO
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

      // ---> LOG: FAILURE
      print('❌ [OrderService] confirmReceived - Failed: ${response.statusCode}');
      print('📄 Response: ${response.body}');
      return null;
    } catch (e) {
      // ---> LOG: EXCEPTION
      print('❌ [Order] ConfirmReceived error: $e');
      return null;
    }
  }

  /// Get orders by status
  static Future<List<Order>> getOrdersByStatus(String status) async {
    return getMyOrders(status: status);
  }
}

