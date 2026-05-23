import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';
import 'package:http/http.dart' as http;
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:flutter/foundation.dart';
import 'package:provider/provider.dart' as legacy_provider;
import '../config/route_generator.dart';
import '../config/routes.dart';
import '../providers/notification_provider.dart';
import 'api_service.dart';
import 'auth_service.dart';

/// ===================================================================
/// 🔔 FCM Service - Quản lý toàn bộ Push Notification trên Flutter
/// ===================================================================
/// Xử lý 3 trạng thái nhận thông báo:
///   1. Foreground  (App đang mở)     → Dùng flutter_local_notifications hiện popup
///   2. Background  (App chạy ngầm)   → Android OS tự hiển thị
///   3. Terminated   (App tắt hẳn)    → Android OS tự hiển thị
/// ===================================================================

class FcmService {
  static final FirebaseMessaging _messaging = FirebaseMessaging.instance;
  static final FlutterLocalNotificationsPlugin _localNotifications =
      FlutterLocalNotificationsPlugin();

  // Callback khi user click vào thông báo (để navigate đến màn hình chi tiết)
  static Function(Map<String, dynamic> data)? onNotificationTapped;

  // Hàng đợi lưu thông báo khi app mở từ terminated và context chưa sẵn sàng
  static Map<String, dynamic>? pendingNotification;

  static void handleNotificationTap(Map<String, dynamic> data) {
    debugPrint('🔔 [FCM] Handling notification tap: $data');
    final context = RouteGenerator.navigatorKey.currentContext;
    if (context == null) {
      debugPrint('⚠️ [FCM] Navigator context is null, queueing notification');
      pendingNotification = data;
      return;
    }

    final type = data['type'];
    final referenceId = data['referenceId'];
    final notificationId = data['notificationId'];

    if (notificationId != null && notificationId.toString().isNotEmpty) {
      try {
        legacy_provider.Provider.of<NotificationProvider>(context, listen: false)
            .markAsRead(notificationId.toString());
      } catch (e) {
        debugPrint('❌ [FCM] Error marking notification as read: $e');
      }
    }

    if (type == 'ORDER' && referenceId != null && referenceId.toString().isNotEmpty) {
      RouteGenerator.navigatorKey.currentState?.pushNamed(
        AppRoutes.orderDetail,
        arguments: referenceId.toString(),
      );
    }
  }

  static void checkPendingNotification() {
    if (pendingNotification != null) {
      final data = pendingNotification!;
      pendingNotification = null;
      handleNotificationTap(data);
    }
  }

  /// ---------------------------------------------------------------
  /// BƯỚC 1: Khởi tạo toàn bộ hệ thống FCM (Gọi 1 lần duy nhất trong main.dart)
  /// ---------------------------------------------------------------
  static Future<void> initialize() async {
    // Đăng ký callback xử lý click dùng chung
    onNotificationTapped = handleNotificationTap;

    // 1.1. Xin quyền nhận thông báo từ user (Android 13+ bắt buộc)
    NotificationSettings settings = await _messaging.requestPermission(
      alert: true,
      badge: true,
      sound: true,
    );
    debugPrint('🔔 [FCM] Permission: ${settings.authorizationStatus}');

    // 1.3. Khởi tạo flutter_local_notifications (để hiện popup khi Foreground)
    const androidSettings = AndroidInitializationSettings('@mipmap/ic_launcher');
    const initSettings = InitializationSettings(android: androidSettings);

    await _localNotifications.initialize(
      initSettings,
      // Xử lý khi user click vào popup thông báo (Foreground)
      onDidReceiveNotificationResponse: (NotificationResponse response) {
        if (response.payload != null) {
          final data = jsonDecode(response.payload!);
          onNotificationTapped?.call(Map<String, dynamic>.from(data));
        }
      },
    );

    // 1.4. Tạo Notification Channel cho Android (Bắt buộc từ Android 8+)
    // Âm thanh custom từ file res/raw/notification_sound.mp3
    final androidChannel = AndroidNotificationChannel(
      'order_updates',           // Channel ID
      'Cập nhật đơn hàng',      // Channel Name (hiện trong Settings)
      description: 'Thông báo khi đơn hàng được cập nhật trạng thái',
      importance: Importance.high,
      sound: const RawResourceAndroidNotificationSound('notification_sound'),
      playSound: true,
    );

    await _localNotifications
        .resolvePlatformSpecificImplementation<
            AndroidFlutterLocalNotificationsPlugin>()
        ?.createNotificationChannel(androidChannel);

    // 1.5. Lắng nghe thông báo khi App đang mở (Foreground)
    FirebaseMessaging.onMessage.listen(_handleForegroundMessage);

    // 1.6. Lắng nghe khi user click vào thông báo (từ Background quay lại App)
    FirebaseMessaging.onMessageOpenedApp.listen(_handleMessageOpenedApp);

    // 1.7. Kiểm tra xem App có được mở từ thông báo khi tắt hẳn (Terminated) không
    final initialMessage = await _messaging.getInitialMessage();
    if (initialMessage != null) {
      _handleMessageOpenedApp(initialMessage);
    }
  }

  /// ---------------------------------------------------------------
  /// BƯỚC 2: Lấy FCM Token và gửi lên Backend (Gọi sau khi user login thành công)
  /// ---------------------------------------------------------------
  static Future<String?> getTokenAndRegister() async {
    try {
      // Lấy FCM Token từ Google Play Services
      final token = await _messaging.getToken();
      if (token == null) {
        debugPrint('⚠️ [FCM] Không lấy được FCM Token');
        return null;
      }
      debugPrint('🔑 [FCM] Token: ${token.substring(0, 20)}...');

      final deviceName = await AuthService.getDeviceName();

      // Gửi token lên Backend để lưu vào User.fcmTokens
      await ApiService.post('/auth/fcm-token', {
        'fcmToken': token,
        'deviceName': deviceName, 
      });
      debugPrint('✅ [FCM] Đã đăng ký token lên Backend ($deviceName)');

      // Lắng nghe khi token bị thay đổi (Google có thể refresh token bất cứ lúc nào)
      _messaging.onTokenRefresh.listen((newToken) async {
        debugPrint('🔄 [FCM] Token refreshed, re-registering...');
        await ApiService.post('/auth/fcm-token', {
          'fcmToken': newToken,
          'deviceName': deviceName,
        });
      });

      return token;
    } catch (e) {
      debugPrint('❌ [FCM] Lỗi đăng ký token: $e');
      return null;
    }
  }

  /// ---------------------------------------------------------------
  /// BƯỚC 3: Hủy đăng ký FCM Token (Gọi khi user logout)
  /// ---------------------------------------------------------------
  static Future<void> unregisterToken() async {
    try {
      final token = await _messaging.getToken();
      if (token != null) {
        await ApiService.delete('/auth/fcm-token', body: {'fcmToken': token});
        debugPrint('✅ [FCM] Đã hủy đăng ký token');
      }
    } catch (e) {
      debugPrint('❌ [FCM] Lỗi hủy token: $e');
    }
  }

  /// Tải file ảnh trực tiếp vào bộ nhớ dưới dạng Bytes (Uint8List)
  static Future<Uint8List?> _downloadImageBytes(String url) async {
    try {
      String finalUrl = url;
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        finalUrl = '${ApiService.baseUrl}$url';
      }
      final response = await http.get(Uri.parse(finalUrl)).timeout(const Duration(seconds: 5));
      if (response.statusCode == 200) {
        return response.bodyBytes;
      }
    } catch (e) {
      debugPrint('❌ [FCM] Error downloading image bytes: $e');
    }
    return null;
  }

  /// ---------------------------------------------------------------
  /// XỬ LÝ TRẠNG THÁI 1: Foreground (App đang mở)
  /// Firebase KHÔNG tự hiện popup → Phải dùng flutter_local_notifications
  /// ---------------------------------------------------------------
  static void _handleForegroundMessage(RemoteMessage message) async {
    debugPrint('🔔 [FCM] Foreground: ${message.notification?.title}');

    final notification = message.notification;
    if (notification == null) return;

    final String? imageUrl = message.data['imageUrl'] ?? message.notification?.android?.imageUrl;
    Uint8List? largeIconBytes;

    if (imageUrl != null && imageUrl.isNotEmpty) {
      largeIconBytes = await _downloadImageBytes(imageUrl);
    }

    // Luôn dùng BigTextStyle để văn bản dài không bị cắt thành dấu "..."
    final bigTextStyleInformation = BigTextStyleInformation(
      notification.body ?? '',
      contentTitle: notification.title,
      htmlFormatContentTitle: true,
      htmlFormatSummaryText: true,
    );

    final androidPlatformChannelSpecifics = AndroidNotificationDetails(
      'order_updates',
      'Cập nhật đơn hàng',
      icon: '@mipmap/ic_launcher',
      largeIcon: largeIconBytes != null ? ByteArrayAndroidBitmap(largeIconBytes) : null,
      styleInformation: bigTextStyleInformation,
      importance: Importance.high,
      priority: Priority.high,
      sound: const RawResourceAndroidNotificationSound('notification_sound'),
      playSound: true,
    );

    final platformChannelSpecifics = NotificationDetails(android: androidPlatformChannelSpecifics);

    await _localNotifications.show(
      notification.hashCode,
      notification.title,
      notification.body,
      platformChannelSpecifics,
      payload: jsonEncode(message.data),
    );
  }

  /// ---------------------------------------------------------------
  /// XỬ LÝ TRẠNG THÁI 2 & 3: Khi user click vào thông báo
  /// (Từ Background hoặc Terminated quay lại App)
  /// ---------------------------------------------------------------
  static void _handleMessageOpenedApp(RemoteMessage message) {
    debugPrint('🔔 [FCM] User tapped notification: ${message.data}');
    if (message.data.isNotEmpty) {
      onNotificationTapped?.call(message.data);
    }
  }
}
