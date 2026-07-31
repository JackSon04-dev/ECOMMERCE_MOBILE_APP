import 'dart:async';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/product_model.dart';
import '../services/product_service.dart';

/// 🛍️ Provider managing global product list
class ProductsNotifier extends AsyncNotifier<List<Product>> {
  @override
  Future<List<Product>> build() async {
    // Default load product list (newest)
    print('📦 [ProductsProvider] Initializing products...');
    return await ProductService.getAllProducts();
  }

  /// Reload product list
  Future<void> refresh() async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(() => ProductService.getAllProducts());
  }
}

/// Provider for main product list (usually newest)
final productsProvider = AsyncNotifierProvider<ProductsNotifier, List<Product>>(() {
  return ProductsNotifier();
});

/// 🌟 Provider for featured products (Featured)
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

/// 🔄 Cursor-based pagination provider (load more) for product list
class PaginatedProductsNotifier extends AutoDisposeFamilyAsyncNotifier<List<Product>, ({String? tag, String? sortBy, String? search})> {
  bool _hasMore = true;
  bool _isFetchingMore = false;
  String? _lastId;
  int? _lastSoldCount;
  double? _lastFinalPrice;
  int _searchPage = 1; // Add page variable to paginate separately for Search flow

  bool get hasMore => _hasMore;
  bool get isFetchingMore => _isFetchingMore;

  @override
  Future<List<Product>> build(({String? tag, String? sortBy, String? search}) arg) async {
    ref.cacheFor(const Duration(minutes: 5)); // Keep state in RAM for 5 minutes when user switches tabs/leaves page

    _hasMore = true;
    _isFetchingMore = false;
    _lastId = null;
    _lastSoldCount = null;
    _lastFinalPrice = null;
    _searchPage = 1;

    final products = await ProductService.getAllProducts(
      tag: arg.tag,
      sortBy: arg.sortBy,
      search: arg.search,
      page: arg.search != null ? _searchPage : null,
    );

    if (products.length < 20) {
      _hasMore = false;
      print('📭 [PaginatedProductsNotifier] build() - Hết dữ liệu (${products.length} sản phẩm)');
    } else {
      final lastProduct = products.last;
      _lastId = lastProduct.id;
      _lastSoldCount = lastProduct.soldCount;
      _lastFinalPrice = lastProduct.finalPrice;
    }

    return products;
  }

  Future<void> loadMore() async {
    // Prevent load condition: If fetching, or out of data, or (no search AND lastId lost)
    if (_isFetchingMore || !_hasMore || (arg.search == null && _lastId == null)) return;

    _isFetchingMore = true;
    state = const AsyncLoading<List<Product>>().copyWithPrevious(state);

    print('📥 [PaginatedProductsNotifier] loadMore() - Đang tải với lastId: $_lastId');

    try {
      if (arg.search != null) {
        _searchPage++;
      }

      final previousState = state.value ?? [];
      final newProducts = await ProductService.getAllProducts(
        tag: arg.tag,
        sortBy: arg.sortBy,
        search: arg.search,
        lastId: arg.search != null ? null : _lastId, // Don't send lastId when searching
        lastSoldCount: arg.search != null ? null : _lastSoldCount,
        lastFinalPrice: arg.search != null ? null : _lastFinalPrice,
        page: arg.search != null ? _searchPage : null,
      );

      if (newProducts.length < 20) {
        print('📭 [PaginatedProductsNotifier] loadMore() - Đã tới trang cuối');
        _hasMore = false;
      } else {
        final lastProduct = newProducts.last;
        _lastId = lastProduct.id;
        _lastSoldCount = lastProduct.soldCount;
        _lastFinalPrice = lastProduct.finalPrice;
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

/// 🔍 Provider cho AutoComplete Suggestions
final autocompleteProvider = FutureProvider.autoDispose.family<List<Map<String, dynamic>>, String>((ref, query) async {
  if (query.trim().length < 2) return [];
  return await ProductService.getAutocompleteSuggestions(query.trim());
});

/// 📜 Search history management provider (Persistent with SharedPreferences)
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
    
    // Delete if already exists to bring to top
    current.remove(normalized);
    current.insert(0, normalized);
    
    // Limit to 10 items
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

/// ⏱️ Extension supporting delayed state dispose for Cache in Riverpod
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
