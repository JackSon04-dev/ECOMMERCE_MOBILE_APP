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
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/auth_provider.dart';
import 'api_service.dart';
import 'auth_service.dart';

/// ===================================================================
/// 🔔 FCM Service - Manage all Push Notifications on Flutter
/// ===================================================================
/// Handle 3 notification receiving states:
///   1. Foreground  (App is open)     → Use flutter_local_notifications to show popup
///   2. Background  (App running in background)   → Android OS automatically displays
///   3. Terminated   (App fully closed)    → Android OS automatically displays
/// ===================================================================

class FcmService {
  static final FirebaseMessaging _messaging = FirebaseMessaging.instance;
  static final FlutterLocalNotificationsPlugin _localNotifications =
      FlutterLocalNotificationsPlugin();

  // Callback when user clicks on notification (to navigate to detail screen)
  static Function(Map<String, dynamic> data)? onNotificationTapped;

  // Queue to save notification when app opens from terminated and context is not ready
  static Map<String, dynamic>? pendingNotification;

  static void handleNotificationTap(Map<String, dynamic> data) async {
    // ---> LOG: INFO
    debugPrint('🔔 [FCM] Handling notification tap: $data');
    final context = RouteGenerator.navigatorKey.currentContext;
    if (context == null) {
      // ---> LOG: INFO
      debugPrint('⚠️ [FCM] Navigator context is null, queueing notification');
      pendingNotification = data;
      return;
    }

    final type = data['type'];
    final referenceId = data['referenceId'];
    final notificationId = data['notificationId'];

    // Load lại toàn bộ notification khi bấm vào thông báo
    try {
      legacy_provider.Provider.of<NotificationProvider>(context, listen: false).fetchNotifications();
    } catch (e) {
      debugPrint('❌ [FCM] Error fetching notifications on tap: $e');
    }

    // Check login before viewing details
    try {
      final container = ProviderScope.containerOf(context);
      final isLoggedIn = container.read(authProvider).isLoggedIn;
      
      if (!isLoggedIn) {
        // ---> LOG: INFO
        debugPrint('🔑 [FCM] User not logged in, redirecting to LoginScreen first');
        final loggedIn = await RouteGenerator.navigatorKey.currentState?.pushNamed(AppRoutes.login);
        if (loggedIn != true) {
          // ---> LOG: INFO
          debugPrint('🔑 [FCM] Login canceled, aborting navigation to details');
          return;
        }
        // Login successful -> Fetch notification list again to update UI
        try {
          legacy_provider.Provider.of<NotificationProvider>(context, listen: false).fetchNotifications();
        } catch (e) {
          // ---> LOG: EXCEPTION
          debugPrint('❌ [FCM] Error fetching notifications after login: $e');
        }
      }
    } catch (e) {
      // ---> LOG: EXCEPTION
      debugPrint('⚠️ [FCM] Error checking auth status or redirecting: $e');
    }

    if (notificationId != null && notificationId.toString().isNotEmpty) {
      try {
        legacy_provider.Provider.of<NotificationProvider>(context, listen: false)
            .markAsRead(notificationId.toString());
      } catch (e) {
        // ---> LOG: EXCEPTION
        debugPrint('❌ [FCM] Error marking notification as read: $e');
      }
    }

    if (type == 'ORDER' && referenceId != null && referenceId.toString().isNotEmpty) {
      RouteGenerator.navigatorKey.currentState?.pushNamed(
        AppRoutes.orderDetail,
        arguments: referenceId.toString(),
      );
    } else if (type == 'PROMOTION' || type == 'SYSTEM') {
      // Điều hướng mở màn hình Thông Báo và truyền type để mở sẵn thanh cuộn
      RouteGenerator.navigatorKey.currentState?.pushNamed(
        AppRoutes.notifications,
        arguments: type,
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
  /// STEP 1: Initialize entire FCM system (Call only once in main.dart)
  /// ---------------------------------------------------------------
  static Future<void> initialize() async {
    // Register shared click handling callback
    onNotificationTapped = handleNotificationTap;

    // 1.1. Request notification permission from user (Android 13+ required)
    NotificationSettings settings = await _messaging.requestPermission(
      alert: true,
      badge: true,
      sound: true,
    );
    // ---> LOG: INFO
    debugPrint('🔔 [FCM] Permission: ${settings.authorizationStatus}');

    // 1.3. Initialize flutter_local_notifications (to show popup when Foreground)
    const androidSettings = AndroidInitializationSettings('@mipmap/ic_launcher');
    const initSettings = InitializationSettings(android: androidSettings);

    await _localNotifications.initialize(
      initSettings,
      // Handle when user clicks on notification popup (Foreground)
      onDidReceiveNotificationResponse: (NotificationResponse response) {
        if (response.payload != null) {
          final data = jsonDecode(response.payload!);
          onNotificationTapped?.call(Map<String, dynamic>.from(data));
        }
      },
    );

    // 1.4. Create Notification Channel for Android (Required from Android 8+)
    // Custom sound from res/raw/notification_sound.mp3 file
    final androidChannel = AndroidNotificationChannel(
      'order_updates',           // Channel ID
      'Cập nhật đơn hàng',      // Channel Name (displayed in Settings)
      description: 'Thông báo khi đơn hàng được cập nhật trạng thái',
      importance: Importance.high,
      sound: const RawResourceAndroidNotificationSound('notification_sound'),
      playSound: true,
    );

    await _localNotifications
        .resolvePlatformSpecificImplementation<
            AndroidFlutterLocalNotificationsPlugin>()
        ?.createNotificationChannel(androidChannel);

    // 1.5. Listen to notification when App is open (Foreground)
    FirebaseMessaging.onMessage.listen(_handleForegroundMessage);

    // 1.6. Listen when user clicks on notification (from Background returning to App)
    FirebaseMessaging.onMessageOpenedApp.listen(_handleMessageOpenedApp);

    // 1.7. Check if App was opened from notification when fully closed (Terminated)
    final initialMessage = await _messaging.getInitialMessage();
    if (initialMessage != null) {
      _handleMessageOpenedApp(initialMessage);
    }
  }

  /// ---------------------------------------------------------------
  /// STEP 2: Get FCM Token and send to Backend (Call after user logs in successfully)
  /// ---------------------------------------------------------------
  static Future<String?> getTokenAndRegister() async {
    try {
      // Get FCM Token from Google Play Services
      final token = await _messaging.getToken();
      if (token == null) {
        // ---> LOG: INFO
        debugPrint('⚠️ [FCM] Không lấy được FCM Token');
        return null;
      }
      // ---> LOG: INFO
      debugPrint('🔑 [FCM] Token: ${token.substring(0, 20)}...');

      final deviceName = await AuthService.getDeviceName();

      // Send token to Backend to save in User.fcmTokens
      await ApiService.post('/auth/fcm-token', {
        'fcmToken': token,
        'deviceName': deviceName, 
      });
      // ---> LOG: SUCCESS
      debugPrint('✅ [FCM] Đã đăng ký token lên Backend ($deviceName)');

      // Listen when token changes (Google can refresh token at any time)
      _messaging.onTokenRefresh.listen((newToken) async {
        // ---> LOG: INFO
        debugPrint('🔄 [FCM] Token refreshed, re-registering...');
        await ApiService.post('/auth/fcm-token', {
          'fcmToken': newToken,
          'deviceName': deviceName,
        });
      });

      return token;
    } catch (e) {
      // ---> LOG: EXCEPTION
      debugPrint('❌ [FCM] Lỗi đăng ký token: $e');
      return null;
    }
  }

  /// ---------------------------------------------------------------
  /// STEP 3: Unregister FCM Token (Call when user logs out)
  /// ---------------------------------------------------------------
  static Future<void> unregisterToken() async {
    try {
      final token = await _messaging.getToken();
      if (token != null) {
        await ApiService.delete('/auth/fcm-token', body: {'fcmToken': token});
        // ---> LOG: SUCCESS
        debugPrint('✅ [FCM] Đã hủy đăng ký token');
      }
    } catch (e) {
      // ---> LOG: EXCEPTION
      debugPrint('❌ [FCM] Lỗi hủy token: $e');
    }
  }

  /// Download image file directly to memory as Bytes (Uint8List)
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
      // ---> LOG: FAILURE
      debugPrint('❌ [FCM] Error downloading image bytes: $e');
    }
    return null;
  }

  /// ---------------------------------------------------------------
  /// HANDLE STATE 1: Foreground (App is open)
  /// Firebase DOES NOT automatically show popup → Must use flutter_local_notifications
  /// ---------------------------------------------------------------
  static void _handleForegroundMessage(RemoteMessage message) async {
    // ---> LOG: INFO
    debugPrint('🔔 [FCM] Foreground: ${message.notification?.title}');

    // Load lại toàn bộ notification khi đang mở app mà có thông báo
    final context = RouteGenerator.navigatorKey.currentContext;
    if (context != null) {
      try {
        legacy_provider.Provider.of<NotificationProvider>(context, listen: false).fetchNotifications();
      } catch (e) {
        debugPrint('❌ [FCM] Error fetching notifications on foreground: $e');
      }
    }

    final notification = message.notification;
    if (notification == null) return;

    // Chỉ lấy URL ảnh chuẩn từ lõi OS gửi xuống (hỗ trợ cả Android và iOS)
    final String? imageUrl = notification.android?.imageUrl ?? notification.apple?.imageUrl;
    Uint8List? largeIconBytes;

    if (imageUrl != null && imageUrl.isNotEmpty) {
      largeIconBytes = await _downloadImageBytes(imageUrl);
    }

    // Always use BigTextStyle so long text is not cut off with "..."
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

    final uniqueId = DateTime.now().millisecondsSinceEpoch.remainder(100000);
    await _localNotifications.show(
      uniqueId,
      notification.title,
      notification.body,
      platformChannelSpecifics,
      payload: jsonEncode(message.data),
    );
  }

  /// ---------------------------------------------------------------
  /// HANDLE STATE 2 & 3: When user clicks on notification
  /// (From Background or Terminated returning to App)
  /// ---------------------------------------------------------------
  static void _handleMessageOpenedApp(RemoteMessage message) {
    // ---> LOG: INFO
    debugPrint('🔔 [FCM] User tapped notification: ${message.data}');
    if (message.data.isNotEmpty) {
      onNotificationTapped?.call(message.data);
    }
  }
}
