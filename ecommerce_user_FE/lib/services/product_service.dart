import 'dart:convert';
import '../models/product_model.dart';
import 'api_service.dart';

/// 🛍️ Product Service - API calls cho sản phẩm
class ProductService {
  /// Lấy tất cả sản phẩm
  static Future<List<Product>> getAllProducts({
    String? tag,
    String? sortBy,
    String? search,
    String? lastId,
    int? limit,
  }) async {
    try {
      String endpoint = '/products';
      List<String> queryParams = [];

      if (tag != null && tag.isNotEmpty) {
        queryParams.add('tag=$tag');
      }
      if (sortBy != null && sortBy.isNotEmpty) {
        queryParams.add('sortBy=$sortBy');
      }
      if (search != null && search.isNotEmpty) {
        queryParams.add('search=$search');
      }
      if (lastId != null && lastId.isNotEmpty) {
        queryParams.add('lastId=$lastId');
      }
      if (limit != null) {
        queryParams.add('limit=$limit');
      }

      if (queryParams.isNotEmpty) {
        endpoint += '?${queryParams.join('&')}';
      }

      final response = await ApiService.get(endpoint, withAuth: false);

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final List<dynamic> productsJson = data['products'] ?? data;
        final products = productsJson.map((json) => Product.fromJson(json)).toList();

        return products;
      }

      return [];
    } catch (e) {
      print('❌ [Product] Error: $e');
      return [];
    }
  }

  /// Lấy sản phẩm theo ID
  static Future<Product?> getProductById(String id) async {
    try {
      final response = await ApiService.get('/products/$id', withAuth: false);

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final product = Product.fromJson(data['product'] ?? data);
        return product;
      }
      return null;
    } catch (e) {
      print('❌ [Product] Error: $e');
      return null;
    }
  }

  /// Lấy sản phẩm nổi bật
  static Future<List<Product>> getFeaturedProducts() async {
    try {
      final response = await ApiService.get('/products/featured', withAuth: false);

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final List<dynamic> productsJson = data['products'] ?? data;
        final products = productsJson.map((json) => Product.fromJson(json)).toList();
        return products;
      }
      return [];
    } catch (e) {
      print('❌ [Product] Error: $e');
      return [];
    }
  }
}

