import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart' hide Provider;
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../providers/notification_provider.dart';
import '../../services/fcm_service.dart';
import '../../widgets/bottom_nav_bar.dart';
import '../../widgets/chatbot_widget.dart';
import 'home_page.dart';
import 'products_page.dart';
import 'notifications_page.dart';
import 'profile_page.dart';

/// 🏠 Main Screen - Màn hình chính với Bottom Navigation
class MainScreen extends ConsumerStatefulWidget {
  const MainScreen({super.key});

  @override
  ConsumerState<MainScreen> createState() => _MainScreenState();
}

class _MainScreenState extends ConsumerState<MainScreen> {
  int _currentIndex = 0;

  // GlobalKey để truy cập ProductsPage state từ bên ngoài
  final GlobalKey<ProductsPageState> _productsPageKey = GlobalKey<ProductsPageState>();

  late final List<Widget> _pages;

  @override
  void initState() {
    super.initState();
    _pages = [
      HomePage(onNavigateToProducts: _navigateToProducts),
      ProductsPage(key: _productsPageKey),
      const NotificationsPage(),
      const ProfilePage(),
    ];
    // Background check: load user nếu có token, không block UI
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _silentAuthCheck();
    });
  }

  /// 🔐 Kiểm tra authentication im lặng — không redirect, không block UI
  Future<void> _silentAuthCheck() async {
    print('ℹ️ [Auth] Background checking login status...');
    
    // Gọi và ĐỢI kết quả kiểm tra đăng nhập
    await ref.read(authProvider.notifier).checkLoginStatus();
    
    final auth = ref.read(authProvider);
    if (mounted && auth.isLoggedIn) {
      print('✅ [Auth] Valid user: ${auth.user?['username']}');
      
      Provider.of<NotificationProvider>(context, listen: false).fetchNotifications();
      
      // Kiểm tra và giải phóng thông báo chờ (nếu có)
      WidgetsBinding.instance.addPostFrameCallback((_) {
        FcmService.checkPendingNotification();
      });
      
      // (CartProvider của Riverpod sẽ tự động reload nhờ ref.watch(isLoggedIn))
    } else {
      print('ℹ️ [Auth] Guest mode (not logged in)');
    }
  }

  /// Chuyển sang tab Products và filter theo tag (nếu có)
  void _navigateToProducts({String? tag}) {
    setState(() {
      _currentIndex = 1;
    });
    // Đợi frame tiếp theo để đảm bảo ProductsPage đã build
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _productsPageKey.currentState?.filterByTag(tag);
    });
  }

  void _onTabSelected(int index) {
    setState(() {
      _currentIndex = index;
    });
  }

  @override
  Widget build(BuildContext context) {

    return Scaffold(
      body: IndexedStack(
        index: _currentIndex,
        children: _pages,
      ),
      bottomNavigationBar: BottomNavBar(
        currentIndex: _currentIndex,
        onTap: _onTabSelected,
      ),
       floatingActionButton: FloatingActionButton(
        onPressed: () {
          // Hiển thị Bottom Sheet chứa giao diện Chatbot
          showModalBottomSheet(
            context: context,
            isScrollControlled: true,
            backgroundColor: Colors.transparent,
            builder: (context) => Padding(
              padding: EdgeInsets.only(
                // Đảm bảo không bị bàn phím che đi khi gõ chữ
                bottom: MediaQuery.of(context).viewInsets.bottom,
              ),
              child: const ChatbotWidget(),
            ),
          );
        },
        backgroundColor: const Color(0xFFFF6B35),
        child: const Icon(Icons.smart_toy, color: Colors.white),
      ),
    );
  }
}

