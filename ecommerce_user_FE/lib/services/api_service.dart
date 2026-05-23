import 'dart:async';
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';

/// 🌐 API Service - Quản lý tất cả API calls
class ApiService {
  static final String baseUrl = dotenv.env['BASE_URL'] ?? 'http://10.0.2.2:5000/api';
  static final FlutterSecureStorage _storage = const FlutterSecureStorage();

  /// Lấy access token từ storage
  static Future<String?> getAccessToken() async {
    return await _storage.read(key: 'accessToken');
  }

  /// Lấy refresh token từ storage
  static Future<String?> getRefreshToken() async {
    return await _storage.read(key: 'refreshToken');
  }

  /// Lưu tokens
  static Future<void> saveTokens(String accessToken, String refreshToken) async {
    await _storage.write(key: 'accessToken', value: accessToken);
    await _storage.write(key: 'refreshToken', value: refreshToken);
  }

  /// Xóa tokens
  static Future<void> clearTokens() async {
    await _storage.delete(key: 'accessToken');
    await _storage.delete(key: 'refreshToken');
  }

  static Completer<bool>? _refreshCompleter;

  /// Headers mặc định với auth
  static Future<Map<String, String>> _getHeaders({bool withAuth = true}) async {
    final headers = {
      'Content-Type': 'application/json',
    };

    if (withAuth) {
      final token = await getAccessToken();
      if (token != null) {
        headers['Authorization'] = 'Bearer $token';
      }
    }

    return headers;
  }

  /// Refresh token khi hết hạn - Xử lý an toàn cho các request song song
  static Future<bool> refreshToken() async {
    // 1. Chống lặp (Concurrent request lock)
    if (_refreshCompleter != null) {
      print('⏳ [API] Waiting for concurrent refresh token...');
      return _refreshCompleter!.future;
    }
    _refreshCompleter = Completer<bool>();
    
    try {
      final rToken = await getRefreshToken();
      if (rToken == null) throw 'Missing Refresh Token';

      print('🔄 [API] Token expired, refreshing session...');
      final response = await http.post(
        Uri.parse('$baseUrl/auth/refresh'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'token': rToken}),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        await saveTokens(data['accessToken'], rToken);
        print('✅ [API] Refresh success!');
        _refreshCompleter!.complete(true);
        return true;
      }
      
      print('❌ [API] Refresh failed (${response.statusCode}): ${response.body}');
      _refreshCompleter!.complete(false);
      return false;
    } catch (e) {
      print('❌ [API] Refresh error: $e');
      _refreshCompleter?.complete(false);
      return false;
    } finally {
      _refreshCompleter = null;
    }
  }

  /// GET request với auto refresh token
  static Future<http.Response> get(String endpoint, {bool withAuth = true}) async {
    var headers = await _getHeaders(withAuth: withAuth);
    var response = await http.get(
      Uri.parse('$baseUrl$endpoint'),
      headers: headers,
    );

    print('🌐 [API] GET $endpoint → ${response.statusCode}');

    if (response.statusCode == 401 && withAuth) {
      final refreshed = await refreshToken();
      if (refreshed) {
        headers = await _getHeaders(withAuth: true);
        response = await http.get(
          Uri.parse('$baseUrl$endpoint'),
          headers: headers,
        );
        print('🔄 [API] GET $endpoint (Retry) → ${response.statusCode}');
      }
    }
    return response;
  }

  /// POST request với auto refresh token
  static Future<http.Response> post(
    String endpoint,
    Map<String, dynamic> body, {
    bool withAuth = true,
  }) async {
    var headers = await _getHeaders(withAuth: withAuth);
    var response = await http.post(
      Uri.parse('$baseUrl$endpoint'),
      headers: headers,
      body: jsonEncode(body),
    );

    print('🌐 [API] POST $endpoint → ${response.statusCode}');

    if (response.statusCode == 401 && withAuth) {
      final refreshed = await refreshToken();
      if (refreshed) {
        headers = await _getHeaders(withAuth: true);
        response = await http.post(
          Uri.parse('$baseUrl$endpoint'),
          headers: headers,
          body: jsonEncode(body),
        );
        print('🔄 [API] POST $endpoint (Retry) → ${response.statusCode}');
      }
    }

    return response;
  }

  /// PUT request với auto refresh token
  static Future<http.Response> put(
    String endpoint,
    Map<String, dynamic> body, {
    bool withAuth = true,
  }) async {
    var headers = await _getHeaders(withAuth: withAuth);
    var response = await http.put(
      Uri.parse('$baseUrl$endpoint'),
      headers: headers,
      body: jsonEncode(body),
    );

    print('🌐 [API] PUT $endpoint → ${response.statusCode}');

    if (response.statusCode == 401 && withAuth) {
      final refreshed = await refreshToken();
      if (refreshed) {
        headers = await _getHeaders(withAuth: true);
        response = await http.put(
          Uri.parse('$baseUrl$endpoint'),
          headers: headers,
          body: jsonEncode(body),
        );
        print('🔄 [API] PUT $endpoint (Retry) → ${response.statusCode}');
      }
    }

    return response;
  }

  /// DELETE request với auto refresh token
  static Future<http.Response> delete(String endpoint, {Map<String, dynamic>? body, bool withAuth = true}) async {
    var headers = await _getHeaders(withAuth: withAuth);
    var request = http.Request('DELETE', Uri.parse('$baseUrl$endpoint'))
      ..headers.addAll(headers);
    
    if (body != null) {
      request.body = jsonEncode(body);
    }
    
    var streamedResponse = await request.send();
    var response = await http.Response.fromStream(streamedResponse);

    print('🌐 [API] DELETE $endpoint → ${response.statusCode}');

    if (response.statusCode == 401 && withAuth) {
      final refreshed = await refreshToken();
      if (refreshed) {
        headers = await _getHeaders(withAuth: true);
        request = http.Request('DELETE', Uri.parse('$baseUrl$endpoint'))
          ..headers.addAll(headers);
        if (body != null) {
          request.body = jsonEncode(body);
        }
        streamedResponse = await request.send();
        response = await http.Response.fromStream(streamedResponse);
        print('🔄 [API] DELETE $endpoint (Retry) → ${response.statusCode}');
      }
    }

    return response;
  }

  /// PATCH request
  static Future<http.Response> patch(
    String endpoint, Map<String, dynamic> body, {
    bool withAuth = true,
  }) async {
    var headers = await _getHeaders(withAuth: withAuth);
    var response = await http.patch(
      Uri.parse('$baseUrl$endpoint'),
      headers: headers,
      body: jsonEncode(body),
    );

    print('🌐 [API] PATCH $endpoint → ${response.statusCode}');

    if (response.statusCode == 401 && withAuth) {
      final refreshed = await refreshToken();
      if (refreshed) {
        headers = await _getHeaders(withAuth: true);
        response = await http.patch(
          Uri.parse('$baseUrl$endpoint'),
          headers: headers,
          body: jsonEncode(body),
        );
        print('🔄 [API] PATCH $endpoint (Retry) → ${response.statusCode}');
      }
    }

    return response;
  }

  /// Multipart POST request (upload files) với auto refresh token
  /// [filePaths] là list các Map với key 'field' và 'path' để tạo lại MultipartFile mỗi lần gửi
  static Future<http.StreamedResponse> multipartPost(
    String endpoint, {
    Map<String, String>? fields,
    List<Map<String, String>>? filePaths, // [{'field': 'images', 'path': '/path/to/file'}]
    bool withAuth = true,
  }) async {
    Future<http.MultipartRequest> buildRequest() async {
      final request = http.MultipartRequest(
        'POST',
        Uri.parse('$baseUrl$endpoint'),
      );
      if (withAuth) {
        final token = await getAccessToken();
        if (token != null) {
          request.headers['Authorization'] = 'Bearer $token';
        }
      }
      if (fields != null) request.fields.addAll(fields);
      // Tạo mới MultipartFile mỗi lần build để tránh lỗi 'finalized'
      if (filePaths != null) {
        for (final fileInfo in filePaths) {
          final field = fileInfo['field'] ?? 'images';
          final path = fileInfo['path']!;
          request.files.add(await http.MultipartFile.fromPath(field, path));
        }
      }
      return request;
    }

    var request = await buildRequest();
    var response = await request.send();
    print('🌐 [API] MULTIPART POST $endpoint → ${response.statusCode}');

    if (response.statusCode == 401 && withAuth) {
      final refreshed = await refreshToken();
      if (refreshed) {
        request = await buildRequest();
        response = await request.send();
        print('🔄 [API] MULTIPART POST $endpoint (Retry) → Status: ${response.statusCode}');
      }
    }

    return response;
  }
}
