import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:provider/provider.dart' as legacy_provider;
import 'package:firebase_core/firebase_core.dart';
import 'config/route_generator.dart';
import 'config/routes.dart';
import 'providers/notification_provider.dart';
import 'services/fcm_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await dotenv.load(fileName: ".env");
  // Khởi tạo SharedPreferences trước để CartProvider load cart ngay lập tức
  await SharedPreferences.getInstance();
  // Khởi tạo Firebase (BẮT BUỘC trước khi dùng bất kỳ dịch vụ Firebase nào)
  await Firebase.initializeApp();
  // Khởi tạo FCM (Đăng ký listeners cho 3 trạng thái nhận thông báo)
  await FcmService.initialize();
  runApp( 
    const ProviderScope( 
      child: MyApp(),
    ),
  );
}


class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return legacy_provider.MultiProvider(
      providers: [
        legacy_provider.ChangeNotifierProvider(create: (_) => NotificationProvider()),
      ],
      child: MaterialApp(
      title: 'E-Commerce App',
      debugShowCheckedModeBanner: false,
      navigatorKey: RouteGenerator.navigatorKey,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFFFF6B35),
          primary: const Color(0xFFFF6B35),
        ),
        useMaterial3: true,
        fontFamily: 'Roboto',
        appBarTheme: const AppBarTheme(
          backgroundColor: Colors.white,
          foregroundColor: Colors.black87,
          elevation: 0,
          centerTitle: true,
        ),
        scaffoldBackgroundColor: Colors.grey[50],
        elevatedButtonTheme: ElevatedButtonThemeData(
          style: ElevatedButton.styleFrom(
            backgroundColor: const Color(0xFFFF6B35),
            foregroundColor: Colors.white,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
            ),
          ),
        ),
      ),
      initialRoute: AppRoutes.splash,
      onGenerateRoute: RouteGenerator.generateRoute,
    ),
  );
  }
}
