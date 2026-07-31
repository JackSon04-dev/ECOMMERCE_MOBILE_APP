import 'dart:async';
import 'dart:convert';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:http/http.dart' as http;

class ChatProduct {
  final String id;
  final String name;
  final double price;
  final double discount;
  final double finalPrice;
  final String thumbnail;
  final double averageRating;

  ChatProduct({
    required this.id,
    required this.name,
    required this.price,
    required this.discount,
    required this.finalPrice,
    required this.thumbnail,
    required this.averageRating,
  });

  factory ChatProduct.fromJson(Map<String, dynamic> json) {
    return ChatProduct(
      id: json['id']?.toString() ?? '',
      name: json['name'] ?? '',
      price: (json['price'] ?? 0).toDouble(),
      discount: (json['discount'] ?? 0).toDouble(),
      finalPrice: (json['finalPrice'] ?? json['price'] ?? 0).toDouble(),
      thumbnail: json['thumbnail'] ?? '',
      averageRating: (json['averageRating'] ?? 5.0).toDouble(),
    );
  }
}

class ChatResponse {
  final String sessionId;
  final String reply;
  final List<ChatProduct> products;
  final int page;
  final bool hasMore;
  final bool suggestRefine;

  ChatResponse({
    required this.sessionId,
    required this.reply,
    required this.products,
    required this.page,
    required this.hasMore,
    required this.suggestRefine,
  });
}

class ChatMessage {
  final String text;
  final bool isUser;
  final List<ChatProduct> products;
  final String? sessionId;
  final String? queryMessage;
  final int page;
  final bool hasMore;
  final bool isLoadingMore;

  ChatMessage({
    required this.text,
    required this.isUser,
    this.products = const [],
    this.sessionId,
    this.queryMessage,
    this.page = 1,
    this.hasMore = false,
    this.isLoadingMore = false,
  });

  ChatMessage copyWith({
    String? text,
    bool? isUser,
    List<ChatProduct>? products,
    String? sessionId,
    String? queryMessage,
    int? page,
    bool? hasMore,
    bool? isLoadingMore,
  }) {
    return ChatMessage(
      text: text ?? this.text,
      isUser: isUser ?? this.isUser,
      products: products ?? this.products,
      sessionId: sessionId ?? this.sessionId,
      queryMessage: queryMessage ?? this.queryMessage,
      page: page ?? this.page,
      hasMore: hasMore ?? this.hasMore,
      isLoadingMore: isLoadingMore ?? this.isLoadingMore,
    );
  }
}

class ChatbotService {
  static final String baseUrl = dotenv.env['BASE_URL'] ?? 'http://10.0.2.2:5000/api';

  static Future<ChatResponse?> sendMessage(String message, {String? userId}) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/chatbot/search'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'message': message,
          if (userId != null) 'userId': userId,
        }),
      ).timeout(const Duration(seconds: 15));

      if (response.statusCode == 200) {
        final body = jsonDecode(utf8.decode(response.bodyBytes));
        if (body['success'] == true && body['data'] != null) {
          final data = body['data'];
          final List<dynamic> productsJson = data['products'] ?? [];
          final products = productsJson.map((p) => ChatProduct.fromJson(p)).toList();

          return ChatResponse(
            sessionId: data['sessionId'] ?? '',
            reply: data['reply'] ?? '',
            products: products,
            page: data['page'] ?? 1,
            hasMore: data['hasMore'] ?? false,
            suggestRefine: data['suggestRefine'] ?? false,
          );
        }
      }
      return null;
    } catch (e) {
      print('❌ Chatbot API Error: $e');
      return null;
    }
  }

  static Future<ChatResponse?> loadMore({required String sessionId, required int page, String? queryMessage}) async {
    try {
      var url = '$baseUrl/chatbot/loadmore?sessionId=$sessionId&page=$page';
      if (queryMessage != null && queryMessage.isNotEmpty) {
        url += '&queryMessage=${Uri.encodeComponent(queryMessage)}';
      }

      final response = await http.get(Uri.parse(url)).timeout(const Duration(seconds: 15));

      if (response.statusCode == 200) {
        final body = jsonDecode(utf8.decode(response.bodyBytes));
        if (body['success'] == true && body['data'] != null) {
          final data = body['data'];
          final List<dynamic> productsJson = data['products'] ?? [];
          final products = productsJson.map((p) => ChatProduct.fromJson(p)).toList();

          return ChatResponse(
            sessionId: data['sessionId'] ?? sessionId,
            reply: data['reply'] ?? '',
            products: products,
            page: data['page'] ?? page,
            hasMore: data['hasMore'] ?? false,
            suggestRefine: data['suggestRefine'] ?? false,
          );
        }
      }
      return null;
    } catch (e) {
      print('❌ Chatbot LoadMore Error: $e');
      return null;
    }
  }
}
