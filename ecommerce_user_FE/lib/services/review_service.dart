import 'dart:convert';
import '../models/review_model.dart';
import 'api_service.dart';

/// ⭐ Review Service - API calls cho đánh giá
class ReviewService {
  /// Decode userId từ JWT access token (không cần verify signature)
  static Future<String?> _getCurrentUserId() async {
    try {
      final token = await ApiService.getAccessToken();
      if (token == null) return null;
      final parts = token.split('.');
      if (parts.length != 3) return null;
      // Padding base64
      String payload = parts[1];
      payload += '=' * ((4 - payload.length % 4) % 4);
      final decoded = jsonDecode(utf8.decode(base64Url.decode(payload)));
      return decoded['id']?.toString() ?? decoded['_id']?.toString();
    } catch (_) {
      return null;
    }
  }

  /// Lấy đánh giá theo sản phẩm
  static Future<List<ReviewModel>> getReviewsByProduct(String productId) async {
    try {
      print('🔍 [Review] Fetching reviews for: $productId');

      final response = await ApiService.get(
        '/reviews/product/$productId',
        withAuth: false,
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final List<dynamic> reviewsJson = data['reviews'] ?? data;
        
        final reviews = <ReviewModel>[];
        for (var i = 0; i < reviewsJson.length; i++) {
          try {
            reviews.add(ReviewModel.fromJson(reviewsJson[i]));
          } catch (e) {
            print('❌ [Review] Parse error at index $i: $e');
          }
        }

        print('✅ [Review] Loaded ${reviews.length} reviews');
        return reviews;
      }

      print('❌ [Review] Fetch failed: ${response.statusCode}');
      return [];
    } catch (e) {
      print('❌ [Review] Fetch error: $e');
      return [];
    }
  }

  /// 📦 Lấy tất cả đánh giá của một đơn hàng
  static Future<List<ReviewModel>> getReviewsByOrder(String orderId) async {
    try {
      print('🔍 [Review] Fetching reviews for order: $orderId');

      final response = await ApiService.get(
        '/reviews/order/$orderId',
        withAuth: true,
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final List<dynamic> reviewsJson = data['reviews'] ?? [];
        final reviews = reviewsJson.map((e) => ReviewModel.fromJson(e)).toList();
        print('✅ [Review] Loaded ${reviews.length} order reviews');
        return reviews;
      }

      print('❌ [Review] Order reviews failed: ${response.statusCode}');
      return [];
    } catch (e) {
      print('❌ [Review] Order reviews error: $e');
      return [];
    }
  }

  /// Tạo đánh giá mới
  static Future<ReviewModel?> createReview({
    required String productId,
    required int rating,
    required String comment,
    List<String>? imagePaths,
    String? orderId,
    String? orderItemId,
  }) async {
    try {
      print('📝 [Review] Creating review for product: $productId');

      if (imagePaths != null && imagePaths.isNotEmpty) {
        final fields = {
          'product': productId,
          'rating': rating.toString(),
          'comment': comment,
          if (orderId != null) 'orderId': orderId,
          if (orderItemId != null) 'orderItemId': orderItemId,
        };

        final fileInfos = imagePaths
            .map((path) => {'field': 'images', 'path': path})
            .toList();

        final response = await ApiService.multipartPost(
          '/reviews',
          fields: fields,
          filePaths: fileInfos,
        );

        final responseBody = await response.stream.bytesToString();

        if (response.statusCode == 201 || response.statusCode == 200) {
          final data = jsonDecode(responseBody);
          print('✅ [Review] Review created with images');
          return ReviewModel.fromJson(data['review'] ?? data);
        }

        try {
          final errorData = jsonDecode(responseBody);
          print('❌ [Review] Create failed: ${errorData['message']}');
          throw Exception(errorData['message'] ?? 'Tạo đánh giá thất bại');
        } catch (e) {
          if (e is Exception) rethrow;
          throw Exception('Tạo đánh giá thất bại (${response.statusCode})');
        }
      } else {
        final body = <String, dynamic>{
          'product': productId,
          'rating': rating,
          'comment': comment,
          if (orderId != null) 'orderId': orderId,
          if (orderItemId != null) 'orderItemId': orderItemId,
        };

        final response = await ApiService.post('/reviews', body);

        if (response.statusCode == 201 || response.statusCode == 200) {
          final data = jsonDecode(response.body);
          print('✅ [Review] Review created');
          return ReviewModel.fromJson(data['review'] ?? data);
        }

        try {
          final errorData = jsonDecode(response.body);
          print('❌ [Review] Create failed: ${errorData['message']}');
          throw Exception(errorData['message'] ?? 'Tạo đánh giá thất bại');
        } catch (e) {
          if (e is Exception) rethrow;
          throw Exception('Tạo đánh giá thất bại (${response.statusCode})');
        }
      }
    } catch (e) {
      print('❌ [Review] Create error: $e');
      rethrow;
    }
  }
}

