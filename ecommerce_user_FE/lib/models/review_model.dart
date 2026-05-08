import '../utils/date_helper.dart';

class ReviewModel {
  final String id;
  final String userId;
  final String productId;
  final String? orderId;
  final int rating;
  final String comment;
  final List<String> images;
  final bool isActive;
  final DateTime? createdAt;
  final DateTime? updatedAt;
  // Populated fields
  final String? userName;
  final String? userAvatar;

  ReviewModel({
    required this.id,
    required this.userId,
    required this.productId,
    this.orderId,
    required this.rating,
    required this.comment,
    this.images = const [],
    this.isActive = true,
    this.createdAt,
    this.updatedAt,
    this.userName,
    this.userAvatar,
  });

  factory ReviewModel.fromJson(Map<String, dynamic> json) {
    try {
      // Parse userId và user info
      String userId = '';
      String? userName;
      String? userAvatar;

      if (json['user'] is Map) {
        final userMap = json['user'] as Map<String, dynamic>;
        // Nếu là populated object có username
        if (userMap.containsKey('username')) {
          userId = (userMap['_id'] ?? '').toString();
          userName = userMap['username']?.toString();
          // Server không có avatar field, để null
          userAvatar = null;
        } else {
          // Nếu là ObjectId format
          userId = (userMap['\$oid'] ?? '').toString();
        }
      } else if (json['user'] is String) {
        userId = json['user'];
      } else if (json['user'] != null) {
        userId = json['user'].toString();
      }

      // Parse id
      String id = '';
      if (json['_id'] is Map) {
        id = (json['_id']['\$oid'] ?? '').toString();
      } else if (json['_id'] != null) {
        id = json['_id'].toString();
      }

      // Parse productId
      String productId = '';
      if (json['product'] is Map) {
        productId = (json['product']['\$oid'] ?? '').toString();
      } else if (json['product'] is String) {
        productId = json['product'];
      } else if (json['product'] != null) {
        productId = json['product'].toString();
      }

      // Parse orderId
      String? orderId;
      if (json['order'] is Map) {
        orderId = (json['order']['\$oid'] ?? '').toString();
      } else if (json['order'] is String) {
        orderId = json['order'];
      } else if (json['order'] != null) {
        orderId = json['order'].toString();
      }

      return ReviewModel(
        id: id,
        userId: userId,
        productId: productId,
        orderId: orderId,
        rating: (json['rating'] ?? 0) is int ? json['rating'] : int.tryParse(json['rating'].toString()) ?? 0,
        comment: (json['comment'] ?? '').toString(),
        images: json['images'] != null
            ? List<String>.from(json['images'].map((e) => e.toString()))
            : [],
        isActive: json['isActive'] ?? true,
        createdAt: DateHelper.parseUtc(
            json['createdAt'] is Map
                ? (json['createdAt']['\$date'] ?? '').toString()
                : json['createdAt']?.toString()),
        updatedAt: DateHelper.parseUtc(
            json['updatedAt'] is Map
                ? (json['updatedAt']['\$date'] ?? '').toString()
                : json['updatedAt']?.toString()),
        userName: userName,
        userAvatar: userAvatar,
      );
    } catch (e) {
      print('❌ ReviewModel.fromJson error: $e');
      print('📦 JSON data: $json');
      rethrow;
    }
  }

  Map<String, dynamic> toJson() {
    return {
      '_id': id,
      'user': userId,
      'product': productId,
      if (orderId != null) 'order': orderId,
      'rating': rating,
      'comment': comment,
      'images': images,
      'isActive': isActive,
    };
  }
}

