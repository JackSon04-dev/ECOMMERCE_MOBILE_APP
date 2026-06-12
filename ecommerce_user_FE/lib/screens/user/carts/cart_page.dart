import 'package:flutter/material.dart';
import 'package:flutter_slidable/flutter_slidable.dart';
import '../../../utils/currency_helper.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../providers/cart_provider.dart';
import '../../../utils/auth_guard.dart';
import '../../../widgets/product_card_widget.dart';
import '../../../widgets/common_widgets.dart';

/// 🛒 Cart Page - Trang giỏ hàng
class CartPage extends ConsumerStatefulWidget {
  const CartPage({super.key});

  @override
  ConsumerState<CartPage> createState() => _CartPageState();
}

class _CartPageState extends ConsumerState<CartPage> {
  Future<void> _goToCheckout() async {
    // Kiểm tra đăng nhập trước khi thanh toán
    final isAuth = await AuthGuard.requireAuth(context, ref);
    if (!isAuth || !mounted) return;

    final cartState = ref.read(cartProvider);

    // Kiểm tra có item hết hàng trong selected items
    final selectedOutOfStock = cartState.selectedItems.any((item) => item.isOutOfStock || item.stock == 0);
    
    if (selectedOutOfStock) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Vui lòng bỏ chọn sản phẩm hết hàng'),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }

    if (cartState.selectedItems.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Vui lòng chọn sản phẩm để thanh toán'),
          backgroundColor: Colors.orange,
        ),
      );
      return;
    }

    // 1. Tạm dừng đồng bộ ngầm
    ref.read(cartProvider.notifier).pauseSyncForCheckout();

    // 2. Chuyển trang và đợi kết quả quay về
    await Navigator.pushNamed(context, '/checkout', arguments: {
      'mode': 'cart', 
    });

    // 3. Tiếp tục đồng bộ khi quay lại (hoặc sau khi mua xong)
    if (mounted) {
      ref.read(cartProvider.notifier).resumeSyncAfterCheckout();
    }
  }

  @override
  Widget build(BuildContext context) {
    final cartState = ref.watch(cartProvider);
    final cartNotifier = ref.read(cartProvider.notifier);
    final items = cartState.cartUI;

    return Scaffold(
      backgroundColor: Colors.grey[50],
      // ── AppBar ──────────────────────────────────────────────────────
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios, color: Colors.black87),
          onPressed: () => Navigator.pop(context),
        ),
        title: Text(
          'Giỏ hàng (${cartState.itemCount})',
          style: const TextStyle(
            color: Colors.black87,
            fontSize: 18,
            fontWeight: FontWeight.w600,
          ),
        ),
        actions: [
          if (items.isNotEmpty)
            TextButton(
              onPressed: () => showDialog(
                context: context,
                builder: (_) => AlertDialog(
                  title: const Text('Xóa giỏ hàng'),
                  content: const Text('Bạn có chắc muốn xóa tất cả sản phẩm?'),
                  actions: [
                    TextButton(onPressed: () => Navigator.pop(context), child: const Text('Hủy')),
                    TextButton(
                      onPressed: () {
                        cartNotifier.removeCheckoutItems(items); // Clear All
                        Navigator.pop(context);
                      },
                      child: const Text('Xóa', style: TextStyle(color: Colors.red)),
                    ),
                  ],
                ),
              ),
              child: const Text('Xóa tất cả', style: TextStyle(color: Colors.red)),
            ),
        ],
      ),

      // ── Body ────────────────────────────────────────────────────────
      body: items.isEmpty
          ? EmptyStateWidget(
              icon: Icons.shopping_cart_outlined,
              title: 'Giỏ hàng trống',
              subtitle: 'Thêm sản phẩm vào giỏ hàng để mua sắm',
              buttonText: 'Mua sắm ngay',
              onButtonPressed: () => Navigator.pop(context),
            )
          : Column(
              children: [
                // ── Danh sách sản phẩm với checkbox ──────────────────────────────
                Expanded(
                  child: ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: items.length,
                    itemBuilder: (context, index) {
                      final item = items[index];
                      final isOutOfStock = item.isOutOfStock || item.stock == 0;
                      final isSelected = cartState.isSelected(item.uniqueKey);

                      return Padding(
                        padding: const EdgeInsets.only(bottom: 12),
                        child: Slidable(
                          key: ValueKey(item.uniqueKey),
                          endActionPane: ActionPane(
                            motion: const DrawerMotion(),
                            extentRatio: 0.22,
                            children: [
                              CustomSlidableAction(
                                onPressed: (_) async {
                                  final confirm = await showDialog<bool>(
                                    context: context,
                                    builder: (_) => AlertDialog(
                                      title: const Text('Xóa sản phẩm'),
                                      content: Text('Bỏ "${item.product.name}" khỏi giỏ hàng?'),
                                      actions: [
                                        TextButton(
                                          onPressed: () => Navigator.pop(context, false),
                                          child: const Text('Hủy'),
                                        ),
                                        TextButton(
                                          onPressed: () => Navigator.pop(context, true),
                                          child: const Text('Xóa', style: TextStyle(color: Colors.red)),
                                        ),
                                      ],
                                    ),
                                  );
                                  if (confirm == true) {
                                    cartNotifier.removeItem(item.uniqueKey);
                                  }
                                },
                                backgroundColor: Colors.red,
                                borderRadius: BorderRadius.circular(12),
                                child: const Column(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    Icon(Icons.delete_outline, color: Colors.white, size: 22),
                                    SizedBox(height: 4),
                                    Text('Xóa', style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w600)),
                                  ],
                                ),
                              ),
                            ],
                          ),
                          child: Stack(
                            children: [
                              // Card sản phẩm
                              Opacity(
                                opacity: isOutOfStock ? 0.65 : 1.0,
                                child: ProductCardHorizontal(
                                  imageUrl: item.product.thumbnail,
                                  name: item.product.name,
                                  price: item.product.finalPrice,
                                  originalPrice: item.product.price,
                                  color: item.color,
                                  size: item.size,
                                  quantity: item.quantity,
                                  maxStock: item.stock,
                                  snackBarContext: context,
                                  isSelected: isOutOfStock ? false : isSelected,
                                  onToggleSelect: isOutOfStock
                                      ? null
                                      : () => cartNotifier.toggleSelect(item.uniqueKey),
                                  onQuantityChanged: isOutOfStock
                                      ? null
                                      : (newQty) => cartNotifier.updateQuantity(item.uniqueKey, newQty),
                                  onRemove: () {
                                    cartNotifier.removeItem(item.uniqueKey);
                                  },
                                  onTap: () {
                                     // Navigator requires a Product object. You might need to refetch it on Product Detail page by id,
                                     // because we only have a CartProduct now.
                                     Navigator.pushNamed(
                                       context,
                                       '/product-detail', // Ensure Product Detail can accept ID if passed product model is simplified
                                       arguments: item.product.id, 
                                     );
                                  },
                                ),
                              ),

                              // Badge "Hết hàng" đè lên
                              if (isOutOfStock)
                                Positioned(
                                  top: 0, left: 0, right: 0, bottom: 0,
                                  child: IgnorePointer(
                                    child: Container(
                                      decoration: BoxDecoration(
                                        borderRadius: BorderRadius.circular(12),
                                        color: Colors.white.withValues(alpha: 0.15),
                                      ),
                                    ),
                                  ),
                                ),
                              if (isOutOfStock)
                                Positioned(
                                  top: 40, right: 10,
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                    decoration: BoxDecoration(color: Colors.red, borderRadius: BorderRadius.circular(6)),
                                    child: const Row(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        Icon(Icons.remove_shopping_cart, color: Colors.white, size: 12),
                                        SizedBox(width: 4),
                                        Text(
                                          'Hết hàng',
                                          style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: 0.3),
                                        ),
                                      ],
                                    ),
                                  ),
                                ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
                ),

                // ── Bottom bar ───────────────────────────────────────────────
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    boxShadow: [
                      BoxShadow(color: Colors.grey.withOpacity(0.2), spreadRadius: 1, blurRadius: 10, offset: const Offset(0, -2)),
                    ],
                  ),
                  child: SafeArea(
                    child: Column(
                      children: [
                        Row(
                          children: [
                            GestureDetector(
                              onTap: () {
                                if (cartState.isAllSelected) {
                                  cartNotifier.deselectAll();
                                } else {
                                  cartNotifier.selectAll();
                                }
                              },
                              child: Row(
                                children: [
                                  Container(
                                    width: 22, height: 22,
                                    decoration: BoxDecoration(
                                      color: cartState.isAllSelected ? const Color(0xFFFF6B35) : Colors.transparent,
                                      border: Border.all(color: cartState.isAllSelected ? const Color(0xFFFF6B35) : Colors.grey[400]!, width: 2),
                                      borderRadius: BorderRadius.circular(5),
                                    ),
                                    child: cartState.isAllSelected ? const Icon(Icons.check, size: 14, color: Colors.white) : null,
                                  ),
                                  const SizedBox(width: 8),
                                  Text('Tất cả', style: TextStyle(fontSize: 14, color: Colors.grey[700])),
                                ],
                              ),
                            ),
                            const Spacer(),
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.end,
                              children: [
                                Text('Tổng (${cartState.selectedCount} sản phẩm)', style: TextStyle(color: Colors.grey[600], fontSize: 12)),
                                Text(cartState.selectedTotalPrice.toVND(), style: const TextStyle(color: Color(0xFFFF6B35), fontSize: 18, fontWeight: FontWeight.bold)),
                              ],
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),
                        SizedBox(
                          width: double.infinity,
                          child: ElevatedButton(
                            onPressed: _goToCheckout,
                            style: ElevatedButton.styleFrom(
                              backgroundColor: const Color(0xFFFF6B35),
                              foregroundColor: Colors.white,
                              padding: const EdgeInsets.symmetric(vertical: 14),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                              elevation: 0,
                            ),
                            child: Text(
                              cartState.selectedItems.isEmpty
                                  ? 'Chọn sản phẩm để thanh toán'
                                  : 'Thanh toán (${cartState.selectedCount})',
                              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
    );
  }
}
