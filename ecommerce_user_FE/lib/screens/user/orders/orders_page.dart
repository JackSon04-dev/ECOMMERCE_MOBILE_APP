import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../../config/routes.dart';
import '../../../models/order_model.dart';
import '../../../providers/cart_provider.dart';
import '../../../providers/order_provider.dart';
import '../../../services/order_service.dart';
import '../../../utils/date_helper.dart';
import '../../../widgets/common_widgets.dart';
import '../../../widgets/order/order_action_buttons.dart';
import '../../../widgets/reorder_result_sheet.dart';

/// 📦 Orders Page - Trang đơn hàng
class OrdersPage extends ConsumerStatefulWidget {
  final String? initialStatus;

  const OrdersPage({super.key, this.initialStatus});

  @override
  ConsumerState<OrdersPage> createState() => _OrdersPageState();
}

class _OrdersPageState extends ConsumerState<OrdersPage> with SingleTickerProviderStateMixin {
  late TabController _tabController;

  final List<String> _tabs = [
    'Tất cả',
    'Chờ xác nhận',
    'Đã xác nhận',
    'Đang giao',
    'Đã giao',
    'Đã hủy',
  ];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: _tabs.length, vsync: this);

    if (widget.initialStatus != null) {
      final index = _tabs.indexWhere((tab) =>
          tab.toLowerCase() == widget.initialStatus!.toLowerCase() ||
          (widget.initialStatus == 'Thành công' && tab == 'Đã giao'));
      if (index > 0) {
        _tabController.index = index;
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.grey[50],
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios, color: Colors.black87),
          onPressed: () => Navigator.pop(context),
        ),
        title: const Text(
          'Đơn hàng của tôi',
          style: TextStyle(
            color: Colors.black87,
            fontSize: 18,
            fontWeight: FontWeight.w600,
          ),
        ),
        bottom: TabBar(
          controller: _tabController,
          isScrollable: true,
          labelColor: const Color(0xFFFF6B35),
          unselectedLabelColor: Colors.grey,
          indicatorColor: const Color(0xFFFF6B35),
          tabs: _tabs.map((tab) => Tab(text: tab)).toList(),
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: _tabs.map((tab) => _OrderListTab(tabName: tab)).toList(),
      ),
    );
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }
}

class _OrderListTab extends ConsumerStatefulWidget {
  final String tabName;

  const _OrderListTab({required this.tabName});

  @override
  ConsumerState<_OrderListTab> createState() => _OrderListTabState();
}

class _OrderListTabState extends ConsumerState<_OrderListTab> {
  late ScrollController _scrollController;

  @override
  void initState() {
    super.initState();
    _scrollController = ScrollController();
    _scrollController.addListener(() {
      if (_scrollController.position.pixels >= _scrollController.position.maxScrollExtent * 0.9) {
        ref.read(orderProvider(widget.tabName).notifier).loadMore();
      }
    });
  }

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  String _formatCurrency(double amount) {
    return NumberFormat.currency(locale: 'vi_VN', symbol: '₫', decimalDigits: 0).format(amount);
  }

  String _formatDateOnly(DateTime? date) {
    if (date == null) return '';
    return DateFormat('dd/MM/yyyy').format(date);
  }

  Color _getStatusColor(String status) {
    switch (status) {
      case 'Chờ xác nhận': return Colors.orange;
      case 'Đã xác nhận': return Colors.blue;
      case 'Đang giao': return Colors.purple;
      case 'Đã giao':
      case 'Thành công': return Colors.green;
      case 'Đã hủy': return Colors.red;
      default: return Colors.grey;
    }
  }

  @override
  Widget build(BuildContext context) {
    final ordersAsync = ref.watch(orderProvider(widget.tabName));

    return ordersAsync.when(
      data: (orders) {
        if (orders.isEmpty) {
          return RefreshIndicator(
            onRefresh: () => ref.refresh(orderProvider(widget.tabName).future),
            child: SingleChildScrollView(
              physics: const AlwaysScrollableScrollPhysics(),
              child: SizedBox(
                height: MediaQuery.of(context).size.height * 0.7,
                child: const EmptyStateWidget(
                  icon: Icons.receipt_long_outlined,
                  title: 'Chưa có đơn hàng',
                  subtitle: 'Bạn chưa có đơn hàng nào trong mục này',
                ),
              ),
            ),
          );
        }

        return RefreshIndicator(
          onRefresh: () => ref.refresh(orderProvider(widget.tabName).future),
          child: ListView.builder(
            controller: _scrollController,
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.all(16),
            itemCount: orders.length + (ref.watch(orderProvider(widget.tabName)).isLoading ? 1 : 0),
            itemBuilder: (context, index) {
              if (index == orders.length) {
                return const Padding(padding: EdgeInsets.symmetric(vertical: 16), child: Center(child: CircularProgressIndicator()));
              }
              return _buildOrderCard(orders[index]);
            },
          ),
        );
      },
      loading: () => const LoadingWidget(),
      error: (err, stack) => Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text('Lỗi tải dữ liệu: $err'),
            const SizedBox(height: 16),
            ElevatedButton(onPressed: () => ref.refresh(orderProvider(widget.tabName)), child: const Text('Thử lại')),
          ],
        ),
      ),
    );
  }

  Widget _buildOrderCard(Order order) {
    return GestureDetector(
      onTap: () {
        Navigator.pushNamed(context, '/order-detail', arguments: order).then((result) {
          if (result == true) {
            ref.invalidate(orderProvider);
          }
        });
      },
      child: Container(
        margin: const EdgeInsets.only(bottom: 16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          boxShadow: [BoxShadow(color: Colors.grey.withValues(alpha: 0.1), spreadRadius: 1, blurRadius: 5)],
        ),
        child: Column(
          children: [
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(border: Border(bottom: BorderSide(color: Colors.grey[200]!))),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Row(
                      children: [
                        const Icon(Icons.receipt, size: 20, color: Color(0xFFFF6B35)),
                        const SizedBox(width: 8),
                        Text(
                          'Đơn hàng #${order.id.length > 8 ? order.id.substring(order.id.length - 8).toUpperCase() : order.id.toUpperCase()}',
                          style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
                        ),
                      ],
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(color: _getStatusColor(order.status).withValues(alpha: 0.1), borderRadius: BorderRadius.circular(20)),
                    child: Text(order.status, style: TextStyle(color: _getStatusColor(order.status), fontSize: 12, fontWeight: FontWeight.w500)),
                  ),
                ],
              ),
            ),
            ...order.orderItems.take(2).map((item) => Container(
                  padding: const EdgeInsets.all(12),
                  child: Row(
                    children: [
                      ClipRRect(
                        borderRadius: BorderRadius.circular(8),
                        child: Image.network(
                          item.variant.colorImage, width: 60, height: 60, fit: BoxFit.cover,
                          errorBuilder: (context, error, stackTrace) => Container(width: 60, height: 60, color: Colors.grey[200], child: const Icon(Icons.image, color: Colors.grey)),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(item.productName, maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 14)),
                            const SizedBox(height: 4),
                            Text('${item.variant.color} - ${item.variant.size}', style: TextStyle(color: Colors.grey[600], fontSize: 12)),
                          ],
                        ),
                      ),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Text(_formatCurrency(item.finalPrice), style: const TextStyle(fontWeight: FontWeight.w600)),
                          Text('x${item.variant.quantity}', style: TextStyle(color: Colors.grey[600], fontSize: 12)),
                        ],
                      ),
                    ],
                  ),
                )),
            if (order.orderItems.length > 2)
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 12),
                child: Text('+ ${order.orderItems.length - 2} sản phẩm khác', style: TextStyle(color: Colors.grey[600], fontSize: 12)),
              ),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(border: Border(top: BorderSide(color: Colors.grey[200]!))),
              child: SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(
                  children: [
                    Row(
                      children: [
                        Icon(Icons.calendar_today_outlined, size: 13, color: Colors.grey[500]),
                        const SizedBox(width: 4),
                        Text('Ngày đặt: ${_formatDateOnly(order.createdAt)}', style: TextStyle(color: Colors.grey[600], fontSize: 12)),
                      ],
                    ),
                    const SizedBox(width: 16),
                    Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Text('Tổng: ', style: TextStyle(fontSize: 13)),
                        Text(_formatCurrency(order.totalPrice), style: const TextStyle(color: Color(0xFFFF6B35), fontSize: 14, fontWeight: FontWeight.bold)),
                      ],
                    ),
                  ],
                ),
              ),
            ),
            OrderActionButtons(
              order: order,
            ),
          ],
        ),
      ),
    );
  }
}


