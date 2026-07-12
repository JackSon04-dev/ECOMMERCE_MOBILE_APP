import 'dart:convert';
import '../models/review_model.dart';
import 'api_service.dart';

/// ⭐ Review Service - API calls for reviews
class ReviewService {
  /// Decode userId from JWT access token (no signature verification needed)
  static Future<String?> _getCurrentUserId() async {
    try {
      final token = await ApiService.getAccessToken();
      if (token == null) return null;
      final parts = token.split('.');
      if (parts.length != 3) return null;
      // Base64 padding
      String payload = parts[1];
      payload += '=' * ((4 - payload.length % 4) % 4);
      final decoded = jsonDecode(utf8.decode(base64Url.decode(payload)));
      return decoded['id']?.toString() ?? decoded['_id']?.toString();
    } catch (_) {
      return null;
    }
  }

  /// Get reviews by product
  static Future<List<ReviewModel>> getReviewsByProduct(String productId) async {
    try {
      // ---> LOG: INFO
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
            // ---> LOG: FAILURE
            print('❌ [Review] Parse error at index $i: $e');
          }
        }

        // ---> LOG: SUCCESS
        print('✅ [Review] Loaded ${reviews.length} reviews');
        return reviews;
      }

      // ---> LOG: FAILURE
      print('❌ [Review] Fetch failed: ${response.statusCode}');
      return [];
    } catch (e) {
      // ---> LOG: FAILURE
      print('❌ [Review] Fetch error: $e');
      return [];
    }
  }

  /// 📦 Get all reviews for an order
  static Future<List<ReviewModel>> getReviewsByOrder(String orderId) async {
    try {
      // ---> LOG: INFO
      print('🔍 [Review] Fetching reviews for order: $orderId');

      final response = await ApiService.get(
        '/reviews/order/$orderId',
        withAuth: true,
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final List<dynamic> reviewsJson = data['reviews'] ?? [];
        final reviews = reviewsJson.map((e) => ReviewModel.fromJson(e)).toList();
        // ---> LOG: SUCCESS
        print('✅ [Review] Loaded ${reviews.length} order reviews');
        return reviews;
      }

      // ---> LOG: FAILURE
      print('❌ [Review] Order reviews failed: ${response.statusCode}');
      return [];
    } catch (e) {
      // ---> LOG: FAILURE
      print('❌ [Review] Order reviews error: $e');
      return [];
    }
  }

  /// Create new review
  static Future<ReviewModel?> createReview({
    required String productId,
    required int rating,
    required String comment,
    List<String>? imagePaths,
    String? orderId,
    String? orderItemId,
  }) async {
    try {
      // ---> LOG: INFO
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
          // ---> LOG: SUCCESS
          print('✅ [Review] Review created with images');
          return ReviewModel.fromJson(data['review'] ?? data);
        }

        try {
          final errorData = jsonDecode(responseBody);
          // ---> LOG: FAILURE
          print('❌ [Review] Create failed: ${errorData['message']}');
          throw Exception(errorData['message'] ?? 'Create review failed');
        } catch (e) {
          if (e is Exception) rethrow;
          throw Exception('Create review failed (${response.statusCode})');
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
          // ---> LOG: SUCCESS
          print('✅ [Review] Review created');
          return ReviewModel.fromJson(data['review'] ?? data);
        }

        try {
          final errorData = jsonDecode(response.body);
          // ---> LOG: FAILURE
          print('❌ [Review] Create failed: ${errorData['message']}');
          throw Exception(errorData['message'] ?? 'Create review failed');
        } catch (e) {
          if (e is Exception) rethrow;
          throw Exception('Create review failed (${response.statusCode})');
        }
      }
    } catch (e) {
      // ---> LOG: FAILURE
      print('❌ [Review] Create error: $e');
      rethrow;
    }
  }
}

