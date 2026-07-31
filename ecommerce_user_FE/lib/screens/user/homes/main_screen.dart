import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart' hide Provider;
import 'package:provider/provider.dart';
import '../../../providers/auth_provider.dart';
import '../../../providers/notification_provider.dart';
import '../../../services/fcm_service.dart';
import '../../../widgets/bottom_nav_bar.dart';
import '../../../widgets/chatbot_widget.dart';
import 'home_page.dart';
import '../products/products_page.dart';
import '../notifications/notifications_page.dart';
import '../profiles/profile_page.dart';

/// 🏠 Main Screen with Bottom Navigation
class MainScreen extends ConsumerStatefulWidget {
  const MainScreen({super.key});

  @override
  ConsumerState<MainScreen> createState() => _MainScreenState();
}

class _MainScreenState extends ConsumerState<MainScreen> {
  int _currentIndex = 0;

  // GlobalKey to access ProductsPage state from outside
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
    // Background check: load user if token exists, do not block UI
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _silentAuthCheck();
    });
  }

  /// 🔐 Silent authentication check — no redirect, no UI block
  Future<void> _silentAuthCheck() async {
    print('ℹ️ [Auth] Background checking login status...');
    
    // Call and WAIT for login check result
    await ref.read(authProvider.notifier).checkLoginStatus();
    
    final auth = ref.read(authProvider);
    if (mounted && auth.isLoggedIn) {
      print('✅ [Auth] Valid user: ${auth.user?.username}');
      
      Provider.of<NotificationProvider>(context, listen: false).fetchNotifications();
      
      // Check and release pending notifications (if any)
      WidgetsBinding.instance.addPostFrameCallback((_) {
        FcmService.checkPendingNotification();
      });
      
      // (CartProvider of Riverpod will auto reload thanks to ref.watch(isLoggedIn))
    } else {
      print('ℹ️ [Auth] Guest mode (not logged in)');
    }
  }

  /// Switch to Products tab and filter by tag (if any)
  void _navigateToProducts({String? tag}) {
    setState(() {
      _currentIndex = 1;
    });
    // Wait for next frame to ensure ProductsPage is built
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
          // Show Bottom Sheet containing Chatbot UI
          showModalBottomSheet(
            context: context,
            isScrollControlled: true,
            backgroundColor: Colors.transparent,
            builder: (context) => Padding(
              padding: EdgeInsets.only(
                // Ensure not covered by keyboard when typing
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

