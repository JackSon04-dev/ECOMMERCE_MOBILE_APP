# Coding Conventions (Services Layer)

To maintain a clean, readable, and unified codebase across the `/services` layer, all developers must adhere to the following rules:

## 1. English Comments & Exceptions
All code comments, function descriptions (`///`), and thrown exception messages MUST be written in **English**. 
- ✅ **Correct**: `/// Create a new order`, `throw Exception('Login failed');`
- ❌ **Incorrect**: `/// Tạo đơn hàng mới`, `throw Exception('Đăng nhập thất bại');`

## 2. Log Highlighting Standard
Whenever logging information (via `print` or `debugPrint`), you must place a prominent
 `// ---> LOG: [TYPE]` marker directly above the log statement. This makes debugging and code reading significantly faster.

**Supported Log Markers:**
- `// ---> LOG: INFO` : General information or starting a process (e.g., sending a request, polling).
- `// ---> LOG: SUCCESS` : Successful API response or completed operation.
- `// ---> LOG: FAILURE` : Failed business logic or API error (e.g., HTTP 400, 404).
- `// ---> LOG: EXCEPTION` : System exceptions caught in `try-catch` blocks (e.g., Network drop, JSON parse error).

**Code Example:**
```dart
try {
  // ---> LOG: INFO
  print('📦 [Order] Creating order...');
  
  final response = await ApiService.post('/orders', body);
  
  if (response.statusCode == 200) {
    // ---> LOG: SUCCESS
    print('✅ [Order] Create success');
  } else {
    // ---> LOG: FAILURE
    print('❌ [Order] Create failed: ${response.statusCode}');
  }
} catch (e) {
  // ---> LOG: EXCEPTION
  debugPrint("❌ [Order] Create error: $e");
}
```


