import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/order_model.dart';
import '../services/order_service.dart';

class OrderNotifier extends AutoDisposeFamilyAsyncNotifier<List<Order>, String> {
  int _currentPage = 1;
  bool _hasMore = true;
  bool _isFetchingMore = false;

  bool get hasMore => _hasMore;
  bool get isFetchingMore => _isFetchingMore;

  @override
  Future<List<Order>> build(String arg) async {

    _currentPage = 1;
    _hasMore = true;
    _isFetchingMore = false;
    
    final statusParam = _getApiStatus(arg);
    final orders = await OrderService.getMyOrders(page: _currentPage, limit: 10, status: statusParam);
    
    if (orders.length < 10) {
      _hasMore = false;
      print('📭 [OrderNotifier($arg)] build() - Tổng cộng có ${orders.length} đơn hàng (Hết dữ liệu)');
    }
    
    return orders;
  }

  String? _getApiStatus(String tabName) {
    if (tabName == 'Tất cả') return null;
    if (tabName == 'Đang giao') return 'Đang giao,Đã giao'; // Supports multi status on backend separated by commas
    if (tabName == 'Đã giao') return 'Thành công';
    return tabName;
  }

  // Load more data function (Pagination)
  Future<void> loadMore() async {
    if (_isFetchingMore || !_hasMore) return;

    _isFetchingMore = true;
    state = const AsyncLoading<List<Order>>().copyWithPrevious(state);

    _currentPage++;
    print('📥 [OrderNotifier($arg)] loadMore() - Đang tải trang: $_currentPage');

    try {
      final previousState = state.value ?? [];
      final statusParam = _getApiStatus(arg);
      final newOrders = await OrderService.getMyOrders(page: _currentPage, limit: 10, status: statusParam);
      
      if (newOrders.length < 10) {
        print('📭 [OrderNotifier($arg)] loadMore() - Đã tới trang cuối');
        _hasMore = false;
      }

      state = AsyncData([...previousState, ...newOrders]);
    } catch (e, st) {
      print('❌ [OrderNotifier($arg)] loadMore() error: $e');
      state = AsyncError(e, st);
    } finally {
      _isFetchingMore = false;
    }
  }

  // Update Order directly on RAM without recalling API
  void updateOrderInCache(Order updatedOrder) {
    if (state.value == null) return;
    
    final currentList = state.value!;
    final index = currentList.indexWhere((o) => o.id == updatedOrder.id);
    
    if (index != -1) {
      final newList = [...currentList];
      
      final expectedStatus = _getApiStatus(arg);
      if (expectedStatus != null) {
        final statuses = expectedStatus.split(',');
        if (!statuses.contains(updatedOrder.status)) {
           // Order changed status -> No longer belongs to this tab -> Delete it
           newList.removeAt(index);
           state = AsyncData(newList);
           return;
        }
      }

      // Still belongs to this tab (or is All tab) -> Update new info
      newList[index] = updatedOrder;
      state = AsyncData(newList);
    }
  }
}

// Declare global Provider
final orderProvider = AsyncNotifierProvider.autoDispose.family<OrderNotifier, List<Order>, String>(() {
  return OrderNotifier();
});
