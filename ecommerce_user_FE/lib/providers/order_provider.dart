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
    if (tabName == 'Đang giao') return 'Đang giao,Đã giao'; // Hỗ trợ multi status ở backend bằng dấu phẩy
    if (tabName == 'Đã giao') return 'Thành công';
    return tabName;
  }

  // Hàm tải thêm dữ liệu (Pagination)
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

  // Cập nhật Order ngay trên RAM mà không cần gọi lại API
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
           // Đơn hàng đổi trạng thái -> Không còn thuộc tab này nữa -> Xóa đi
           newList.removeAt(index);
           state = AsyncData(newList);
           return;
        }
      }

      // Vẫn thuộc tab này (hoặc là tab Tất cả) -> Cập nhật thông tin mới
      newList[index] = updatedOrder;
      state = AsyncData(newList);
    }
  }
}

// Khai báo Provider toàn cục
final orderProvider = AsyncNotifierProvider.autoDispose.family<OrderNotifier, List<Order>, String>(() {
  return OrderNotifier();
});
