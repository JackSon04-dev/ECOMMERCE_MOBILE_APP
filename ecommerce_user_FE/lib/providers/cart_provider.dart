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
  final Set<String> selectedKeys; // List of ticked Item identifiers for checkout
  final Set<String> apiKeys; // Cache unique keys of cartAPI
  final Set<String> updateKeys; // Cache unique keys of cartUpdate

  CartState({
    this.cartAPI,
    this.cartUpdate = const [],
    this.isCheckoutPaused = false,
    this.selectedKeys = const {},
    this.apiKeys = const {},
    this.updateKeys = const {},
  });

  /// 🔥 Core: Merge Real data (cartAPI) and Temp data (cartUpdate)
  List<CartItem> get cartUI {
    List<CartItem> mergedList = [];
    if (cartAPI != null && cartAPI!.items.isNotEmpty) {
      mergedList.addAll(cartAPI!.items);
    }

    // Hashmap for quick Update lookup
    final Map<String, CartItem> updates = {
      for (var item in cartUpdate) item.uniqueKey: item
    };

    List<CartItem> result = [];

    // 1. Overwrite API item
    for (var apiItem in mergedList) {
      if (updates.containsKey(apiItem.uniqueKey)) {
        var updatedItem = updates[apiItem.uniqueKey]!;
        if (updatedItem.quantity > 0) {
          result.add(updatedItem);
        }
        updates.remove(apiItem.uniqueKey); // Cross out name after processing
      } else {
        result.add(apiItem);
      }
    }

    // 2. Stuff completely new items (left over in updates)
    for (var newItem in updates.values) {
      if (newItem.quantity > 0) {
        result.add(newItem);
      }
    }

    return result;
  }

  // General UI utilities
  int get itemCount => cartUI.length;
  int get totalItems => cartUI.fold(0, (sum, item) => sum + item.quantity);
  double get totalPrice => cartUI.fold(0.0, (sum, item) => sum + item.totalPrice);

  bool get isEmpty => cartUI.isEmpty;

  // Selection Checkout utilities
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
    final selectable = cartUI.where((i) => !i.isOutOfStock); // Don't count out of stock items
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
    loadCart(); // Startup
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
      // 1. Load Cart from Server (Only if logged in)
      await _loadServerCart();

      // 2. Read forward from Local Storage
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
      
      // If App opens and Update basket still contains garbage, auto run Timer to throw it to Server
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
    
    // Auto lightweight stock validation on UI if passed product contains Variants Array
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
      return false; // UI limit exceeded
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

  /// Case 2: Delete Item
  void removeItem(String uniqueKey) {
    // 1. Check existence in cartAPI
    final inApi = state.apiKeys.contains(uniqueKey);
    // 2. Check existence in cartUpdate
    final inUpdate = state.updateKeys.contains(uniqueKey);

    if (inApi) {
      // If exists in cartAPI (and possibly cartUpdate):
      // Overwrite with entry quantity = 0 to sync deletion on server
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
      // If ONLY exists in cartUpdate (newly added item not yet synced):
      // Delete directly from local list and update keys
      List<CartItem> pending = List.from(state.cartUpdate);
      pending.removeWhere((item) => item.uniqueKey == uniqueKey);
      
      final keys = Set<String>.from(state.updateKeys);
      keys.remove(uniqueKey);
      
      state = state.copyWith(cartUpdate: pending, updateKeys: keys);
      _saveLocalUpdate(pending);
    }
    
    // Always untick when selecting delete
    if (state.selectedKeys.contains(uniqueKey)) {
      final s = Set<String>.from(state.selectedKeys);
      s.remove(uniqueKey);
      state = state.copyWith(selectedKeys: s);
    }
  }

  /// Overwrite into pending sync list
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
      _startDebounceTimer(); // Extend 5s Timer
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
      update(); // Auto sync after 5s
    });
  }

  /// Main update function: Sync new data to cart data on MongoDB
  /// Returns true if successful, false if failed or paused
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
      
      state = state.copyWith(cartUpdate: [], updateKeys: {}); // Return cartUpdate = null (empty list)
      await loadCart(); // Reload all data to update cartAPI
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

  /// When user FINISHES PURCHASE -> Forcibly cleanup Cart inventory
  Future<void> removeCheckoutItems(List<CartItem> purchasedItems) async {
    pauseSyncForCheckout(); 

    // Check if any checkout item is in local update list
    final hasLocalItems = purchasedItems.any((p) => state.updateKeys.contains(p.uniqueKey));
    if (hasLocalItems) {
      print('🗑️ [Cart] Removing purchased items from local...');
    }

    List<CartItem> newUpdateList = List.from(state.cartUpdate);
    bool shouldTriggerApi = false;
    List<Map<String, dynamic>> itemsToRemoveFromServer = [];

    for (var purchased in purchasedItems) {
      // 1. Check cleanup in Local array (cartUpdate)
      newUpdateList.removeWhere((item) => item.uniqueKey == purchased.uniqueKey);
      
      // Untick selection
      if (state.selectedKeys.contains(purchased.uniqueKey)) {
        final s = Set<String>.from(state.selectedKeys);
        s.remove(purchased.uniqueKey);
        state = state.copyWith(selectedKeys: s);
      }

      // 2. Scan cartAPI via hash lookup
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

    // Save Local RAM changes
    state = state.copyWith(cartUpdate: newUpdateList, updateKeys: keys);
    await _saveLocalUpdate(newUpdateList);

    // Call API to delete item
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

  // Utility: Reorder -> Recall Cart logic
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

// CREATE RIVERSIDE PROVIDER
final cartProvider = StateNotifierProvider<CartNotifier, CartState>((ref) {
  // Watch isLoggedIn to re-create CartNotifier when login status changes
  ref.watch(authProvider.select((s) => s.isLoggedIn));
  return CartNotifier(ref);
});
