import 'dart:async';
import 'dart:convert';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:http/http.dart' as http;

class ChatProduct {
  final String id;
  final String name;
  final double price;
  final String thumbnail;

  ChatProduct({required this.id, required this.name, required this.price, required this.thumbnail});

  factory ChatProduct.fromJson(Map<String, dynamic> json) {
    return ChatProduct(
      id: json['id'].toString(),
      name: json['name'] ?? '',
      price: (json['price'] ?? 0).toDouble(),
      thumbnail: json['thumbnail'] ?? '',
    );
  }
}

class ChatMessage {
  final String text;
  final bool isUser;
  final List<ChatProduct> products;

  ChatMessage({required this.text, required this.isUser, this.products = const []});
}

class ChatbotService {
  static final String baseUrl = dotenv.env['CHATBOT_URL'] ?? '';
  static final String apiUrl = '$baseUrl/api/chat'; 

  static Future<ChatMessage> sendMessage(String message) async {
    try {
      final response = await http.post(
        Uri.parse(apiUrl),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'message': message}),
      ).timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        final data = jsonDecode(utf8.decode(response.bodyBytes));
        final List<dynamic> productsJson = data['products'] ?? [];
        final products = productsJson.map((p) => ChatProduct.fromJson(p)).toList();

        return ChatMessage(text: data['reply'], isUser: false, products: products);
      } else {
        return ChatMessage(text: 'Lỗi kết nối đến server.', isUser: false);
      }
    } on TimeoutException {
      return ChatMessage(text: 'Máy chủ phản hồi quá chậm (Timeout). Vui lòng thử lại sau.', isUser: false);
    } catch (e) {
      return ChatMessage(text: 'Không thể kết nối. Đảm bảo server AI đang chạy.', isUser: false);
    }
  }
}
