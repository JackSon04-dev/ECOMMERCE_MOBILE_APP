// lib/providers/cart_provider.dart
import 'dart:async';
import 'dart:convert';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/cart_model.dart';
import '../models/product_model.dart' as app_product;
import '../models/order_model.dart';
import '../services/cart_service.dart';
import '../services/product_service.dart';
import 'auth_provider.dart';

class CartState {
  final CartData? cartAPI;
  final List<CartItem> cartUpdate;
  final bool isCheckoutPaused;
  final Set<String> selectedKeys; // Danh sách định danh Item được tích v để thanh toán
  final Set<String> apiKeys; // Cache unique keys của cartAPI
  final Set<String> updateKeys; // Cache unique keys của cartUpdate

  CartState({
    this.cartAPI,
    this.cartUpdate = const [],
    this.isCheckoutPaused = false,
    this.selectedKeys = const {},
    this.apiKeys = const {},
    this.updateKeys = const {},
  });

  /// 🔥 Lõi: Gộp Dữ liệu thực (cartAPI) và Dữ liệu tạm (cartUpdate)
  List<CartItem> get cartUI {
    List<CartItem> mergedList = [];
    if (cartAPI != null && cartAPI!.items.isNotEmpty) {
      mergedList.addAll(cartAPI!.items);
    }

    // Map Hashmap để tra cứu nhanh Update
    final Map<String, CartItem> updates = {
      for (var item in cartUpdate) item.uniqueKey: item
    };

    List<CartItem> result = [];

    // 1. Đè item API
    for (var apiItem in mergedList) {
      if (updates.containsKey(apiItem.uniqueKey)) {
        var updatedItem = updates[apiItem.uniqueKey]!;
        if (updatedItem.quantity > 0) {
          result.add(updatedItem);
        }
        updates.remove(apiItem.uniqueKey); // Gạch tên sau khi xử lý
      } else {
        result.add(apiItem);
      }
    }

    // 2. Nhồi các item hoàn toàn mới (còn xót lại trong updates)
    for (var newItem in updates.values) {
      if (newItem.quantity > 0) {
        result.add(newItem);
      }
    }

    return result;
  }

  // Tiện ích UI chung
  int get itemCount => cartUI.length;
  int get totalItems => cartUI.fold(0, (sum, item) => sum + item.quantity);
  double get totalPrice => cartUI.fold(0.0, (sum, item) => sum + item.totalPrice);

  bool get isEmpty => cartUI.isEmpty;

  // Tiện ích Selection Checkout
  double get selectedTotalPrice {
    return cartUI
        .where((item) => selectedKeys.contains(item.uniqueKey))
        .fold(0.0, (sum, item) => sum + item.totalPrice);
  }

  int get selectedCount {
    return cartUI
        .where((item) => selectedKeys.contains(item.uniqueKey))
        .fold(0, (sum, item) => sum + item.quantity);
  }

  List<CartItem> get selectedItems {
    return cartUI.where((item) => selectedKeys.contains(item.uniqueKey)).toList();
  }

  bool isSelected(String key) => selectedKeys.contains(key);

  bool get isAllSelected {
    final selectable = cartUI.where((i) => !i.isOutOfStock); // Không tính hàng hết
    return selectable.isNotEmpty && selectable.every((i) => selectedKeys.contains(i.uniqueKey));
  }

  CartState copyWith({
    CartData? cartAPI,
    List<CartItem>? cartUpdate,
    bool? isCheckoutPaused,
    Set<String>? selectedKeys,
    Set<String>? apiKeys,
    Set<String>? updateKeys,
  }) {
    return CartState(
      cartAPI: cartAPI ?? this.cartAPI,
      cartUpdate: cartUpdate ?? this.cartUpdate,
      isCheckoutPaused: isCheckoutPaused ?? this.isCheckoutPaused,
      selectedKeys: selectedKeys ?? this.selectedKeys,
      apiKeys: apiKeys ?? this.apiKeys,
      updateKeys: updateKeys ?? this.updateKeys,
    );
  }
}


// --- RIVERPOD NOTIFIER ---

class CartNotifier extends StateNotifier<CartState> {
  final Ref ref;
  Timer? _debounceTimer;

  CartNotifier(this.ref) : super(CartState()) {
    loadCart(); // Khởi động 
  }

  // ======== 1. BOOTSTRAP ========
  Future<void> _loadServerCart() async {
    final isLoggedIn = ref.read(authProvider).isLoggedIn;
    if (!isLoggedIn) return;

    final cartDataJson = await CartService.getCart();
    CartData? apiData;
    if (cartDataJson.isNotEmpty) {
      apiData = CartData.fromJson(cartDataJson);
    } else {
      apiData = CartData(cartId: '', userId: '', updatedAt: '', items: [], totalItems: 0);
    }
    
    state = state.copyWith(
      cartAPI: apiData,
      apiKeys: apiData.items.map((i) => i.uniqueKey).toSet(),
    );
  }

  Future<void> loadCart() async {
    try {
      // 1. Tải Giỏ hàng từ Server (Chỉ nếu logged in)
      await _loadServerCart();

      // 2. Đọc chuyển tiếp từ Local Storage
      final prefs = await SharedPreferences.getInstance();
      List<CartItem> localUpdates = [];
      final String? updatesJson = prefs.getString('cart_update');
      
      if (updatesJson != null) {
        final List<dynamic> decoded = jsonDecode(updatesJson);
        localUpdates = decoded.map((e) => CartItem.fromJson(e as Map<String, dynamic>)).toList();
      }

      state = state.copyWith(
        cartUpdate: localUpdates,
        updateKeys: localUpdates.map((i) => i.uniqueKey).toSet(),
      );
      
      // Nếu lúc mở App lên mà rổ Update vẫn còn chứa rác, tự động chạy Timer quăng nó lên Server nốt
      if (localUpdates.isNotEmpty && !state.isCheckoutPaused) {
        _startDebounceTimer();
      }
    } catch (e) {
      print('❌ [Cart] Load error: $e');
    }
  }

  // ======== 2. CORE MODIFIERS (OPTIMISTIC UPDATE) ========

  CartProduct _makeCartProduct(app_product.Product product) {
    return CartProduct(
      id: product.id,
      name: product.name,
      thumbnail: product.thumbnail,
      price: product.price,
      finalPrice: product.finalPrice,
    );
  }

  bool addItem(app_product.Product product, String color, String size, {int quantity = 1}) {
    final key = '${product.id}_${color}_$size';
    
    // Tự động validate stock nhẹ trên UI nếu product truyền vào có chứa Array Varients
    final stock = product.getStockByVariant(color, size);
    
    int currentQty = 0;
    final existingUIItem = state.cartUI.cast<CartItem?>().firstWhere(
      (item) => item?.uniqueKey == key, orElse: () => null
    );
    if (existingUIItem != null) {
       currentQty = existingUIItem.quantity;
    }

    final newQuantity = currentQty + quantity;
    if (newQuantity > stock) {
      print('⚠️ [Cart] Local stock limit: Only $stock items left');
      return false; // Quá giới hạn UI
    }

    _patchLocalUpdate(
      cartProduct: _makeCartProduct(product),
      color: color,
      size: size,
      newQuantity: newQuantity,
      stock: stock,
    );
    return true;
  }

  void updateQuantity(String uniqueKey, int quantity) {
    CartItem? targetItem = state.cartUI.cast<CartItem?>().firstWhere(
      (item) => item?.uniqueKey == uniqueKey, orElse: () => null
    );
    if (targetItem != null) {
      _patchLocalUpdate(
        cartProduct: targetItem.product,
        color: targetItem.color,
        size: targetItem.size,
        newQuantity: quantity,
        stock: targetItem.stock,
      );
    }
  }

  /// Case 2: Xóa Item
  void removeItem(String uniqueKey) {
    // 1. Kiểm tra tồn tại trong cartAPI
    final inApi = state.apiKeys.contains(uniqueKey);
    // 2. Kiểm tra tồn tại trong cartUpdate
    final inUpdate = state.updateKeys.contains(uniqueKey);

    if (inApi) {
      // Nếu tồn tại trong cartAPI (và có thể cả cartUpdate):
      // Ghi đè bằng entry quantity = 0 để đồng bộ xóa trên server
      CartItem? targetItem = state.cartUI.cast<CartItem?>().firstWhere(
        (item) => item?.uniqueKey == uniqueKey, orElse: () => null
      );
      if (targetItem != null) {
        _patchLocalUpdate(
          cartProduct: targetItem.product,
          color: targetItem.color,
          size: targetItem.size,
          newQuantity: 0,
          stock: targetItem.stock,
        );
      }
    } else if (inUpdate) {
      // Nếu CHỈ tồn tại trong cartUpdate (hàng mới thêm chưa kịp sync):
      // Xóa thẳng khỏi list local và cập nhật keys
      List<CartItem> pending = List.from(state.cartUpdate);
      pending.removeWhere((item) => item.uniqueKey == uniqueKey);
      
      final keys = Set<String>.from(state.updateKeys);
      keys.remove(uniqueKey);
      
      state = state.copyWith(cartUpdate: pending, updateKeys: keys);
      _saveLocalUpdate(pending);
    }
    
    // Luôn bỏ tick khi chọn xóa
    if (state.selectedKeys.contains(uniqueKey)) {
      final s = Set<String>.from(state.selectedKeys);
      s.remove(uniqueKey);
      state = state.copyWith(selectedKeys: s);
    }
  }

  /// Ghi đè vào danh sách chờ đồng bộ
  void _patchLocalUpdate({
    required CartProduct cartProduct,
    required String color,
    required String size,
    required int newQuantity,
    int stock = 0,
    bool isOutOfStock = false,
  }) {
    final key = '${cartProduct.id}_${color}_$size';
    List<CartItem> pending = List.from(state.cartUpdate);

    final index = pending.indexWhere((item) => item.uniqueKey == key);
    if (index >= 0) {
      pending[index] = pending[index].copyWith(
        quantity: newQuantity,
        stock: stock,
        isOutOfStock: isOutOfStock,
      );
    } else {
      pending.add(CartItem(
        product: cartProduct,
        color: color,
        size: size,
        quantity: newQuantity,
        stock: stock,
        isOutOfStock: isOutOfStock,
      ));
    }

    final keys = Set<String>.from(state.updateKeys);
    keys.add(key);

    state = state.copyWith(cartUpdate: pending, updateKeys: keys);
    _saveLocalUpdate(pending);

    if (!state.isCheckoutPaused) {
      _startDebounceTimer(); // Gia hạn 5s Timer
    }
  }

  Future<void> _saveLocalUpdate(List<CartItem> updates) async {
    final prefs = await SharedPreferences.getInstance();
    if (updates.isEmpty) {
      await prefs.remove('cart_update');
    } else {
      final jsonList = updates.map((e) => e.toJson()).toList();
      await prefs.setString('cart_update', jsonEncode(jsonList));
    }
  }

  // ======== 3. SYNC ENGINE (DEBOUNCE 5S) ========

  void _startDebounceTimer() {
    _debounceTimer?.cancel();
    _debounceTimer = Timer(const Duration(seconds: 5), () {
      update(); // Tự động sync sau 5s
    });
  }

  /// Hàm update chính: Đồng bộ dữ liệu mới vào dữ liệu cart trên MongoDB
  /// Trả về true nếu thành công, false nếu thất bại hoặc đang pause
  Future<bool> update() async {
    if (state.cartUpdate.isEmpty) return true;
    if (state.isCheckoutPaused) return false;

    print('🔄 [Cart] Background Syncing to MongoDB...');
    
    final payloadItems = state.cartUpdate.map((i) => {
      'productId': i.product.id,
      'color': i.color,
      'size': i.size,
      'quantity': i.quantity,
    }).toList();

    final success = await CartService.updateCart({'items': payloadItems});

    if (success) {
      print('✅ [Cart] Sync success! Clearing cartUpdate...');
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove('cart_update');
      
      state = state.copyWith(cartUpdate: [], updateKeys: {}); // Trả về cartUpdate = null (empty list)
      await loadCart(); // Load lại toàn bộ data để cập nhật cartAPI
      return true;
    } else {
      print('❌ [Cart] Sync failed!');
      return false;
    }
  }

  // ======== 4. CHECKOUT OPERATIONS ========

  void pauseSyncForCheckout() {
    print('⏸️ [Cart] Pausing sync for checkout...');
    _debounceTimer?.cancel();
    state = state.copyWith(isCheckoutPaused: true);
  }

  void resumeSyncAfterCheckout() {
    print('▶️ [Cart] Resuming sync after checkout...');
    state = state.copyWith(isCheckoutPaused: false);
    if (state.cartUpdate.isNotEmpty) {
      _startDebounceTimer();
    }
  }

  /// Khi user MUA XONG -> Tiến hành dọn kho Giỏ hàng bằng cưỡng ép
  Future<void> removeCheckoutItems(List<CartItem> purchasedItems) async {
    pauseSyncForCheckout(); 

    // Kiểm tra xem có item nào trong checkout đang nằm trong danh sách update local không
    final hasLocalItems = purchasedItems.any((p) => state.updateKeys.contains(p.uniqueKey));
    if (hasLocalItems) {
      print('🗑️ [Cart] Removing purchased items from local...');
    }

    List<CartItem> newUpdateList = List.from(state.cartUpdate);
    bool shouldTriggerApi = false;
    List<Map<String, dynamic>> itemsToRemoveFromServer = [];

    for (var purchased in purchasedItems) {
      // 1. Kiểm tra dọn dẹp ở mảng Local (cartUpdate)
      newUpdateList.removeWhere((item) => item.uniqueKey == purchased.uniqueKey);
      
      // Bỏ Tick chọn
      if (state.selectedKeys.contains(purchased.uniqueKey)) {
        final s = Set<String>.from(state.selectedKeys);
        s.remove(purchased.uniqueKey);
        state = state.copyWith(selectedKeys: s);
      }

      // 2. Dò ở cartAPI qua hash lookup
      final inApi = state.apiKeys.contains(purchased.uniqueKey);
      if (inApi) {
        shouldTriggerApi = true;
        itemsToRemoveFromServer.add({
          'productId': purchased.product.id,
          'color': purchased.color,
          'size': purchased.size,
          'quantity': 0, 
        });
      }
    }

    // Refresh updateKeys
    final keys = newUpdateList.map((i) => i.uniqueKey).toSet();

    // Save thay đổi Local RAM
    state = state.copyWith(cartUpdate: newUpdateList, updateKeys: keys);
    await _saveLocalUpdate(newUpdateList);

    // Call API xóa item
    if (shouldTriggerApi) {
      print('🗑️ [Cart] Removing purchased items from server...');
      await CartService.updateCart({'items': itemsToRemoveFromServer});
      await loadCart(); 
    }

    resumeSyncAfterCheckout();
  }

  // ======== 5. UI UTILITIES (SELECTION) ========

  void toggleSelect(String uniqueKey) {
    final s = Set<String>.from(state.selectedKeys);
    if (s.contains(uniqueKey)) s.remove(uniqueKey); else s.add(uniqueKey);
    state = state.copyWith(selectedKeys: s);
  }

  void selectAll() {
    final s = <String>{};
    for (var item in state.cartUI) {
      if (!item.isOutOfStock) s.add(item.uniqueKey);
    }
    state = state.copyWith(selectedKeys: s);
  }

  void deselectAll() {
    state = state.copyWith(selectedKeys: const {});
  }

  // Tiện ích: Mua lại (Reorder) -> Tái gọi logic Cart
  Future<Map<String, List<String>>> reorder(List<OrderItem> orderItems) async {
    final List<String> added = [];
    final List<String> outOfStock = [];
    final List<String> failed = [];

    for (final item in orderItems) {
      try {
        final product = await ProductService.getProductById(item.productId);
        if (product == null) {
          failed.add(item.productName);
          continue;
        }

        final stock = product.getStockByVariant(item.variant.color, item.variant.size);
        if (stock <= 0) {
          outOfStock.add('${item.productName} (${item.variant.color} - ${item.variant.size})');
          continue;
        }

        final success = addItem(product, item.variant.color, item.variant.size, quantity: 1);
        if (success) {
          final key = '${product.id}_${item.variant.color}_${item.variant.size}';
          final s = Set<String>.from(state.selectedKeys);
          s.add(key);
          state = state.copyWith(selectedKeys: s);
          added.add(item.productName);
        } else {
          outOfStock.add('${item.productName} (Đã chặn bởi Max Stock)');
        }
      } catch (e) {
        failed.add(item.productName);
      }
    }
    return {'added': added, 'outOfStock': outOfStock, 'failed': failed};
  }
} // End Builder

// TẠO PROVIDER RIVERSIDE
final cartProvider = StateNotifierProvider<CartNotifier, CartState>((ref) {
  // Watch isLoggedIn to re-create CartNotifier khi trạng thái login thay đổi
  ref.watch(authProvider.select((s) => s.isLoggedIn));
  return CartNotifier(ref);
});
