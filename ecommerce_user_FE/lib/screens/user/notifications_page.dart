import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../../models/notification_model.dart';
import '../../providers/notification_provider.dart';
import '../../widgets/common_widgets.dart';
import 'order/order_detail_page.dart';

/// 🔔 Notifications Page - Trang thông báo (Sử dụng Provider)
class NotificationsPage extends StatefulWidget {
  const NotificationsPage({super.key});

  @override
  State<NotificationsPage> createState() => _NotificationsPageState();
}

class _NotificationsPageState extends State<NotificationsPage> {
  bool? _isOrderExpanded;
  bool _isPromoExpanded = false;
  bool _isSystemExpanded = false;

  IconData _getNotificationIcon(String type) {
    switch (type) {
      case 'PROMOTION':
        return Icons.local_offer_outlined;
      case 'SYSTEM':
      case 'GENERAL':
        return Icons.campaign_outlined;
      case 'ORDER':
        return Icons.local_shipping_outlined;
      default:
        return Icons.notifications_outlined;
    }
  }

  Color _getNotificationColor(String type) {
    switch (type) {
      case 'PROMOTION':
        return Colors.orange;
      case 'SYSTEM':
      case 'GENERAL':
        return Colors.blue;
      case 'ORDER':
        return Colors.green;
      default:
        return Colors.grey;
    }
  }

  String _formatTime(DateTime? dateTime) {
    if (dateTime == null) return '';
    final now = DateTime.now();
    final diff = now.difference(dateTime);

    if (diff.inMinutes < 60) {
      return '${diff.inMinutes} phút trước';
    } else if (diff.inHours < 24) {
      return '${diff.inHours} giờ trước';
    } else if (diff.inDays < 7) {
      return '${diff.inDays} ngày trước';
    } else {
      return DateFormat('dd/MM/yyyy').format(dateTime);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<NotificationProvider>(
      builder: (context, provider, child) {
        final notifications = provider.notifications;

        // Group notifications
        final orderNotifications = notifications.where((n) => n.type == 'ORDER').toList();
        final promoNotifications = notifications.where((n) => n.type == 'PROMOTION').toList();
        final systemNotifications = notifications.where((n) => n.type == 'SYSTEM' || n.type == 'GENERAL').toList();

        // Calculate unread counts
        final unreadOrders = orderNotifications.where((n) => !n.isRead).length;
        final unreadPromos = promoNotifications.where((n) => !n.isRead).length;
        final unreadSystems = systemNotifications.where((n) => !n.isRead).length;

        // Auto-expand ORDER if there are unread notifications and user hasn't interacted
        if (_isOrderExpanded == null && notifications.isNotEmpty) {
          _isOrderExpanded = unreadOrders > 0;
        }

        final bool orderExpanded = _isOrderExpanded ?? false;

        return Scaffold(
          backgroundColor: Colors.grey[50],
          appBar: AppBar(
            backgroundColor: Colors.white,
            elevation: 0,
            title: const Text(
              'Thông báo',
              style: TextStyle(
                color: Colors.black87,
                fontSize: 18,
                fontWeight: FontWeight.w600,
              ),
            ),
            actions: [
              if (provider.unreadCount > 0)
                TextButton(
                  onPressed: () => provider.markAllAsRead(),
                  child: const Text(
                    'Đọc tất cả',
                    style: TextStyle(color: Color(0xFFFF6B35), fontWeight: FontWeight.w600),
                  ),
                ),
            ],
          ),
          body: provider.isLoading && notifications.isEmpty
              ? const LoadingWidget()
              : notifications.isEmpty
                  ? const EmptyStateWidget(
                      icon: Icons.notifications_off_outlined,
                      title: 'Chưa có thông báo',
                      subtitle: 'Bạn sẽ nhận được thông báo về khuyến mãi tại đây',
                    )
                  : RefreshIndicator(
                      onRefresh: () => provider.fetchNotifications(),
                      child: ListView(
                        physics: const AlwaysScrollableScrollPhysics(),
                        padding: const EdgeInsets.symmetric(vertical: 8),
                        children: [
                          // --- MỤC 1: ĐƠN HÀNG ---
                          _buildCategorySection(
                            title: 'Đơn hàng',
                            icon: Icons.local_shipping_outlined,
                            color: Colors.green,
                            unreadCount: unreadOrders,
                            isExpanded: orderExpanded,
                            items: orderNotifications,
                            provider: provider,
                            onTapHeader: () {
                              setState(() {
                                _isOrderExpanded = !orderExpanded;
                              });
                            },
                          ),

                          // --- MỤC 2: KHUYẾN MÃI ---
                          _buildCategorySection(
                            title: 'Khuyến mãi',
                            icon: Icons.local_offer_outlined,
                            color: Colors.orange,
                            unreadCount: unreadPromos,
                            isExpanded: _isPromoExpanded,
                            items: promoNotifications,
                            provider: provider,
                            onTapHeader: () {
                              setState(() {
                                _isPromoExpanded = !_isPromoExpanded;
                              });
                            },
                          ),

                          // --- MỤC 3: HỆ THỐNG ---
                          _buildCategorySection(
                            title: 'Hệ thống',
                            icon: Icons.campaign_outlined,
                            color: Colors.blue,
                            unreadCount: unreadSystems,
                            isExpanded: _isSystemExpanded,
                            items: systemNotifications,
                            provider: provider,
                            onTapHeader: () {
                              setState(() {
                                _isSystemExpanded = !_isSystemExpanded;
                              });
                            },
                          ),
                        ],
                      ),
                    ),
        );
      },
    );
  }

  Widget _buildCategorySection({
    required String title,
    required IconData icon,
    required Color color,
    required int unreadCount,
    required bool isExpanded,
    required List<NotificationModel> items,
    required NotificationProvider provider,
    required VoidCallback onTapHeader,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildCategoryHeader(
          title: title,
          icon: icon,
          color: color,
          unreadCount: unreadCount,
          isExpanded: isExpanded,
          onTap: onTapHeader,
        ),
        AnimatedSize(
          duration: const Duration(milliseconds: 250),
          curve: Curves.easeInOut,
          child: isExpanded
              ? items.isEmpty
                  ? Container(
                      padding: const EdgeInsets.symmetric(vertical: 24),
                      alignment: Alignment.center,
                      child: Text(
                        'Không có thông báo nào trong mục này',
                        style: TextStyle(color: Colors.grey[400], fontSize: 13),
                      ),
                    )
                  : ListView.builder(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      padding: const EdgeInsets.only(bottom: 8),
                      itemCount: items.length,
                      itemBuilder: (context, index) {
                        return _buildNotificationItem(context, items[index], provider);
                      },
                    )
              : const SizedBox.shrink(),
        ),
      ],
    );
  }

  Widget _buildCategoryHeader({
    required String title,
    required IconData icon,
    required Color color,
    required int unreadCount,
    required bool isExpanded,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.02),
              blurRadius: 10,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Row(
          children: [
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: color.withOpacity(0.1),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(icon, color: color, size: 20),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                title,
                style: const TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w600,
                  color: Colors.black87,
                ),
              ),
            ),
            if (unreadCount > 0)
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: const Color(0xFFFF6B35),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  '$unreadCount',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 11,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            const SizedBox(width: 8),
            Icon(
              isExpanded ? Icons.keyboard_arrow_up : Icons.keyboard_arrow_down,
              color: Colors.grey[400],
              size: 20,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildNotificationItem(BuildContext context, NotificationModel notification, NotificationProvider provider) {
    return GestureDetector(
      onTap: () {
        provider.markAsRead(notification.id);
        if (notification.type == 'ORDER' && notification.referenceId != null && notification.referenceId!.isNotEmpty) {
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (context) => OrderDetailPage(orderId: notification.referenceId),
            ),
          );
        }
      },
      child: Container(
        margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: notification.isRead ? Colors.white : const Color(0xFFFF6B35).withOpacity(0.03),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: notification.isRead
                ? Colors.grey[100]!
                : const Color(0xFFFF6B35).withOpacity(0.15),
          ),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                color: _getNotificationColor(notification.type).withOpacity(0.1),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(
                _getNotificationIcon(notification.type),
                color: _getNotificationColor(notification.type),
                size: 22,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          notification.title,
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: notification.isRead ? FontWeight.w500 : FontWeight.w600,
                            color: Colors.black87,
                          ),
                        ),
                      ),
                      if (!notification.isRead)
                        Container(
                          width: 8,
                          height: 8,
                          decoration: const BoxDecoration(
                            color: Color(0xFFFF6B35),
                            shape: BoxShape.circle,
                          ),
                        ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    notification.message,
                    style: TextStyle(
                      fontSize: 13,
                      color: Colors.grey[600],
                      height: 1.4,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    _formatTime(notification.createdAt),
                    style: TextStyle(
                      fontSize: 11,
                      color: Colors.grey[400],
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
