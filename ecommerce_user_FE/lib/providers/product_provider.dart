import 'dart:async';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/product_model.dart';
import '../services/product_service.dart';

/// 🛍️ Provider quản lý danh sách sản phẩm toàn cục
class ProductsNotifier extends AsyncNotifier<List<Product>> {
  @override
  Future<List<Product>> build() async {
    // Mặc định load danh sách sản phẩm (mới nhất)
    print('📦 [ProductsProvider] Initializing products...');
    return await ProductService.getAllProducts();
  }

  /// Tải lại danh sách sản phẩm
  Future<void> refresh() async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(() => ProductService.getAllProducts());
  }
}

/// Provider cho danh sách sản phẩm chính (thường là mới nhất)
final productsProvider = AsyncNotifierProvider<ProductsNotifier, List<Product>>(() {
  return ProductsNotifier();
});

/// 🌟 Provider cho sản phẩm nổi bật (Featured)
final featuredProductsProvider = FutureProvider<List<Product>>((ref) async {
  print('📦 [FeaturedProvider] Fetching featured products...');
  return await ProductService.getFeaturedProducts();
});

final filteredProductsProvider = FutureProvider.family<List<Product>, ({String? tag, String? sortBy, String? search})>((ref, arg) async {
  print('📦 [FilteredProductsProvider] Fetching: tag=${arg.tag}, sort=${arg.sortBy}, search=${arg.search}');
  return await ProductService.getAllProducts(
    tag: arg.tag,
    sortBy: arg.sortBy,
    search: arg.search,
  );
});

/// 🔄 Provider phân trang Cursor-based (load more) cho danh sách sản phẩm
class PaginatedProductsNotifier extends AutoDisposeFamilyAsyncNotifier<List<Product>, ({String? tag, String? sortBy, String? search})> {
  bool _hasMore = true;
  bool _isFetchingMore = false;
  String? _lastId;

  bool get hasMore => _hasMore;
  bool get isFetchingMore => _isFetchingMore;

  @override
  Future<List<Product>> build(({String? tag, String? sortBy, String? search}) arg) async {
    ref.cacheFor(const Duration(minutes: 5)); // Giữ trạng thái trong RAM 5 phút khi người dùng chuyển tab/rời trang

    _hasMore = true;
    _isFetchingMore = false;
    _lastId = null;

    final products = await ProductService.getAllProducts(
      tag: arg.tag,
      sortBy: arg.sortBy,
      search: arg.search,
      limit: 20,
    );

    if (products.length < 20) {
      _hasMore = false;
      print('📭 [PaginatedProductsNotifier] build() - Hết dữ liệu (${products.length} sản phẩm)');
    } else {
      _lastId = products.last.id;
    }

    return products;
  }

  Future<void> loadMore() async {
    if (_isFetchingMore || !_hasMore || _lastId == null) return;

    _isFetchingMore = true;
    state = const AsyncLoading<List<Product>>().copyWithPrevious(state);

    print('📥 [PaginatedProductsNotifier] loadMore() - Đang tải với lastId: $_lastId');

    try {
      final previousState = state.value ?? [];
      final newProducts = await ProductService.getAllProducts(
        tag: arg.tag,
        sortBy: arg.sortBy,
        search: arg.search,
        lastId: _lastId,
        limit: 20,
      );

      if (newProducts.length < 20) {
        print('📭 [PaginatedProductsNotifier] loadMore() - Đã tới trang cuối');
        _hasMore = false;
      } else {
        _lastId = newProducts.last.id;
      }

      state = AsyncData([...previousState, ...newProducts]);
    } catch (e, st) {
      print('❌ [PaginatedProductsNotifier] loadMore() error: $e');
      state = AsyncError(e, st);
    } finally {
      _isFetchingMore = false;
    }
  }
}

final paginatedProductsProvider = AsyncNotifierProvider.autoDispose.family<
    PaginatedProductsNotifier,
    List<Product>,
    ({String? tag, String? sortBy, String? search})
>(() {
  return PaginatedProductsNotifier();
});

/// 📜 Provider quản lý lịch sử tìm kiếm (Bền vững với SharedPreferences)
class SearchHistoryNotifier extends StateNotifier<List<String>> {
  SearchHistoryNotifier() : super([]) {
    _loadHistory();
  }

  static const _key = 'recent_searches';

  Future<void> _loadHistory() async {
    final prefs = await SharedPreferences.getInstance();
    state = prefs.getStringList(_key) ?? ['Áo thun', 'Giày', 'Quần jean'];
  }

  Future<void> addSearch(String query) async {
    if (query.trim().isEmpty) return;
    
    final normalized = query.trim();
    List<String> current = List.from(state);
    
    // Xóa nếu đã tồn tại để đưa lên đầu
    current.remove(normalized);
    current.insert(0, normalized);
    
    // Giới hạn 10 mục
    if (current.length > 10) {
      current = current.sublist(0, 10);
    }
    
    state = current;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setStringList(_key, current);
  }

  Future<void> removeSearch(String query) async {
    List<String> current = List.from(state);
    current.remove(query);
    state = current;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setStringList(_key, current);
  }

  Future<void> clearHistory() async {
    state = [];
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_key);
  }
}

final searchHistoryProvider = StateNotifierProvider<SearchHistoryNotifier, List<String>>((ref) {
  return SearchHistoryNotifier();
});

/// ⏱️ Extension hỗ trợ trì hoãn dispose state để làm Cache trong Riverpod
extension CacheForExtension on AutoDisposeRef {
  void cacheFor(Duration duration) {
    final keepAliveLink = keepAlive();
    Timer? timer;

    onCancel(() {
      timer = Timer(duration, () {
        keepAliveLink.close();
      });
    });

    onResume(() {
      timer?.cancel();
    });

    onDispose(() {
      timer?.cancel();
    });
  }
}
