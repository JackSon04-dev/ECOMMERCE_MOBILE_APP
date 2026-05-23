import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../providers/auth_provider.dart';
import '../../../config/routes.dart';
import '../../../models/user_model.dart';
import '../../../services/user_service.dart';


/// 👤 Profile Page - Trang tài khoản
class ProfilePage extends ConsumerStatefulWidget {
  const ProfilePage({super.key});

  @override
  ConsumerState<ProfilePage> createState() => _ProfilePageState();
}

class _ProfilePageState extends ConsumerState<ProfilePage> {
  UserModel? _user;
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
  }

  Future<void> _loadUserInfo() async {
    final auth = ref.read(authProvider);
    if (!auth.isLoggedIn) {
      setState(() {
        _user = null;
        _isLoading = false;
      });
      return;
    }

    setState(() => _isLoading = true);

    try {
      final user = await UserService.getMe();
      if (mounted) {
        setState(() {
          _user = user;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _user = null;
          _isLoading = false;
        });
      }
    }
  }

  Future<void> _logout() async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Đăng xuất'),
        content: const Text('Bạn có chắc chắn muốn đăng xuất?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Hủy'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text(
              'Đăng xuất',
              style: TextStyle(color: Colors.red),
            ),
          ),
        ],
      ),
    );

    if (confirm == true && mounted) {
      // Hiển thị loading
      showDialog(
        context: context,
        barrierDismissible: false,
        builder: (context) => const Center(
          child: Card(
            child: Padding(
              padding: EdgeInsets.all(24.0),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  CircularProgressIndicator(),
                  SizedBox(height: 16),
                  Text('Đang đăng xuất...'),
                ],
              ),
            ),
          ),
        ),
      );

      try {
        await ref.read(authProvider.notifier).logout();

        if (mounted) {
          // Đóng loading dialog
          Navigator.pop(context);

          // Cập nhật state → hiển thị "Chưa đăng nhập"
          setState(() => _user = null);

          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('✅ Đăng xuất thành công!'),
              backgroundColor: Colors.green,
              duration: Duration(seconds: 2),
            ),
          );
        }
      } catch (e) {
        if (mounted) {
          Navigator.pop(context);
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('❌ Lỗi khi đăng xuất: $e'),
              backgroundColor: Colors.red,
              duration: const Duration(seconds: 3),
            ),
          );
        }
      }
    }
  }

  /// Đăng nhập từ profile → mở LoginScreen, sau khi login xong reload user
  Future<void> _goToLogin() async {
    final result = await Navigator.pushNamed(context, AppRoutes.login);
    if (result == true && mounted) {
      _loadUserInfo();
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = ref.watch(authProvider);
    final isLoggedIn = auth.isLoggedIn;

    // Cập nhật _user từ auth state nếu cần (khi user vừa login)
    if (isLoggedIn && auth.user != null) {
      _user = UserModel.fromJson(auth.user!);
    } else if (!isLoggedIn) {
      _user = null;
    }

    return Scaffold(
      backgroundColor: Colors.grey[50],
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: Color(0xFFFF6B35)))
          : RefreshIndicator(
              onRefresh: _loadUserInfo,
              color: const Color(0xFFFF6B35),
              child: CustomScrollView(
                physics: const AlwaysScrollableScrollPhysics(), // Quan trọng để RefreshIndicator hoạt động với CustomScrollView
                slivers: [
                // App Bar with user info
                SliverAppBar(
                  expandedHeight: 200,
                  pinned: true,
                  backgroundColor: const Color(0xFFFF6B35),
                  flexibleSpace: FlexibleSpaceBar(
                    background: Container(
                      decoration: const BoxDecoration(
                        gradient: LinearGradient(
                          colors: [Color(0xFFFF6B35), Color(0xFFFF8F65)],
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                        ),
                      ),
                      child: SafeArea(
                        child: isLoggedIn
                            ? _buildLoggedInHeader()
                            : _buildGuestHeader(),
                      ),
                    ),
                  ),
                ),

                // Content
                SliverToBoxAdapter(
                  child: isLoggedIn
                      ? _buildLoggedInContent()
                      : _buildGuestContent(),
                ),
              ],
            ),
          ),
    );
  }

  /// Header khi đã đăng nhập
  Widget _buildLoggedInHeader() {
    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        const SizedBox(height: 20),
        CircleAvatar(
          radius: 45,
          backgroundColor: Colors.white,
          child: _buildDefaultAvatar(),
        ),
        const SizedBox(height: 12),
        Text(
          _user?.username ?? 'Người dùng',
          style: const TextStyle(
            color: Colors.white,
            fontSize: 20,
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          _user?.email ?? '',
          style: TextStyle(
            color: Colors.white.withOpacity(0.9),
            fontSize: 14,
          ),
        ),
      ],
    );
  }

  /// Header khi chưa đăng nhập
  Widget _buildGuestHeader() {
    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        const SizedBox(height: 20),
        CircleAvatar(
          radius: 45,
          backgroundColor: Colors.white.withOpacity(0.9),
          child: const Icon(
            Icons.person_outline,
            size: 50,
            color: Color(0xFFFF6B35),
          ),
        ),
        const SizedBox(height: 12),
        const Text(
          'Chưa đăng nhập',
          style: TextStyle(
            color: Colors.white,
            fontSize: 20,
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          'Đăng nhập để sử dụng đầy đủ tính năng',
          style: TextStyle(
            color: Colors.white.withOpacity(0.9),
            fontSize: 14,
          ),
        ),
      ],
    );
  }

  /// Content khi đã đăng nhập
  Widget _buildLoggedInContent() {
    return Column(
      children: [
        const SizedBox(height: 16),

        // Đơn hàng section
        _buildSectionTitle('Đơn hàng của tôi'),
        _buildMenuCard([
          _buildMenuItem(
            icon: Icons.receipt_long_outlined,
            title: 'Đơn hàng của tôi',
            subtitle: 'Xem tất cả đơn hàng',
            onTap: () => Navigator.pushNamed(context, '/orders'),
          ),
        ]),

        const SizedBox(height: 16),

        // Tài khoản section
        _buildSectionTitle('Tài khoản'),
        _buildMenuCard([
          _buildMenuItem(
            icon: Icons.person_outline,
            title: 'Thông tin cá nhân',
            onTap: () => Navigator.pushNamed(context, '/profile-info'),
          ),
          _buildMenuItem(
            icon: Icons.lock_outline,
            title: 'Đổi mật khẩu',
            onTap: () => Navigator.pushNamed(context, '/change-password'),
            showDivider: false,
          ),
        ]),

        const SizedBox(height: 16),

        // Hỗ trợ section
        _buildSectionTitle('Hỗ trợ'),
        _buildMenuCard([
          _buildMenuItem(
            icon: Icons.help_outline,
            title: 'Trung tâm trợ giúp',
            onTap: () {},
          ),
          _buildMenuItem(
            icon: Icons.chat_bubble_outline,
            title: 'Liên hệ hỗ trợ',
            onTap: () {},
          ),
          _buildMenuItem(
            icon: Icons.policy_outlined,
            title: 'Chính sách & Điều khoản',
            onTap: () {},
            showDivider: false,
          ),
        ]),

        const SizedBox(height: 24),

        // Logout button
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: SizedBox(
            width: double.infinity,
            child: OutlinedButton.icon(
              onPressed: _logout,
              icon: const Icon(Icons.logout, color: Colors.red),
              label: const Text(
                'Đăng xuất',
                style: TextStyle(color: Colors.red),
              ),
              style: OutlinedButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 14),
                side: const BorderSide(color: Colors.red),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
            ),
          ),
        ),

        const SizedBox(height: 32),
      ],
    );
  }

  /// Content khi chưa đăng nhập
  Widget _buildGuestContent() {
    return Column(
      children: [
        const SizedBox(height: 32),

        // Nút đăng nhập lớn
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              onPressed: _goToLogin,
              icon: const Icon(Icons.login, color: Colors.white),
              label: const Text(
                'Đăng nhập',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
              ),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFFFF6B35),
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
            ),
          ),
        ),

        const SizedBox(height: 12),

        // Nút đăng ký
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: SizedBox(
            width: double.infinity,
            child: OutlinedButton.icon(
              onPressed: () => Navigator.pushNamed(context, AppRoutes.register),
              icon: const Icon(Icons.person_add_outlined),
              label: const Text(
                'Đăng ký tài khoản mới',
                style: TextStyle(fontSize: 16),
              ),
              style: OutlinedButton.styleFrom(
                foregroundColor: const Color(0xFFFF6B35),
                side: const BorderSide(color: Color(0xFFFF6B35)),
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
            ),
          ),
        ),

        const SizedBox(height: 32),

        // Hỗ trợ section (vẫn hiện cho guest)
        _buildSectionTitle('Hỗ trợ'),
        _buildMenuCard([
          _buildMenuItem(
            icon: Icons.help_outline,
            title: 'Trung tâm trợ giúp',
            onTap: () {},
          ),
          _buildMenuItem(
            icon: Icons.chat_bubble_outline,
            title: 'Liên hệ hỗ trợ',
            onTap: () {},
          ),
          _buildMenuItem(
            icon: Icons.policy_outlined,
            title: 'Chính sách & Điều khoản',
            onTap: () {},
            showDivider: false,
          ),
        ]),

        const SizedBox(height: 32),
      ],
    );
  }

  Widget _buildDefaultAvatar() {
    return Text(
      _user?.username.isNotEmpty == true
          ? _user!.username[0].toUpperCase()
          : 'U',
      style: const TextStyle(
        fontSize: 36,
        fontWeight: FontWeight.bold,
        color: Color(0xFFFF6B35),
      ),
    );
  }

  Widget _buildSectionTitle(String title) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Align(
        alignment: Alignment.centerLeft,
        child: Text(
          title,
          style: const TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w600,
            color: Colors.black87,
          ),
        ),
      ),
    );
  }

  Widget _buildMenuCard(List<Widget> children) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.grey.withOpacity(0.1),
            spreadRadius: 1,
            blurRadius: 5,
          ),
        ],
      ),
      child: Column(children: children),
    );
  }

  Widget _buildMenuItem({
    required IconData icon,
    required String title,
    String? subtitle,
    required VoidCallback onTap,
    bool showDivider = true,
  }) {
    return Column(
      children: [
        ListTile(
          leading: Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: const Color(0xFFFF6B35).withOpacity(0.1),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, color: const Color(0xFFFF6B35), size: 22),
          ),
          title: Text(
            title,
            style: const TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w500,
            ),
          ),
          subtitle: subtitle != null
              ? Text(
                  subtitle,
                  style: TextStyle(
                    fontSize: 12,
                    color: Colors.grey[500],
                  ),
                )
              : null,
          trailing: const Icon(Icons.chevron_right, color: Colors.grey),
          onTap: onTap,
        ),
        if (showDivider)
          Divider(
            height: 1,
            indent: 70,
            endIndent: 16,
            color: Colors.grey[200],
          ),
      ],
    );
  }
}

