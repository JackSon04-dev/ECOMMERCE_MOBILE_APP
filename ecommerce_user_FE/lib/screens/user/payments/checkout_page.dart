import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../../config/routes.dart';
import '../../../providers/cart_provider.dart';
import '../../../services/order_service.dart';
import '../../../services/user_service.dart';
import '../../../services/voucher_service.dart';
import '../../../models/user_model.dart';
import '../../../models/product_model.dart';
import '../../../models/voucher_model.dart';
import '../../../widgets/common_widgets.dart';
import '../../../services/payment_service.dart';

/// Checkout item dùng nội bộ trong trang thanh toán
class _CheckoutItem {
  final dynamic product; // Product or CartProduct
  final String color;
  final String size;
  int quantity;
  final int maxStock;
  final String? cartUniqueKey;

  _CheckoutItem({
    required this.product,
    required this.color,
    required this.size,
    required this.quantity,
    required this.maxStock,
    this.cartUniqueKey,
  });

  double get totalPrice {
    try {
       return product.finalPrice * quantity;
    } catch(e) {
       return 0.0;
    }
  }
}

/// 💳 Checkout Page - Trang thanh toán
class CheckoutPage extends ConsumerStatefulWidget {
  final Map<String, dynamic>? args;

  const CheckoutPage({super.key, this.args});

  @override
  ConsumerState<CheckoutPage> createState() => _CheckoutPageState();
}

class _CheckoutPageState extends ConsumerState<CheckoutPage> {
  bool _isLoading = false;
  UserModel? _user;
  String _paymentMethod = 'COD';
  String _voucherCode = '';
  double _voucherDiscount = 0;
  VoucherModel? _appliedVoucher;
  final _voucherController = TextEditingController();
  final double _shippingFee = 20000;

  /// Danh sách items trong checkout (có thể từ cart hoặc buyNow)
  List<_CheckoutItem> _checkoutItems = [];
  String _mode = 'cart'; // 'cart' hoặc 'buyNow'

  @override
  void initState() {
    super.initState();
    _loadUserInfo();
    _initCheckoutItems();
  }

  /// Khởi tạo danh sách checkout items từ arguments
  void _initCheckoutItems() {
    final args = widget.args;

    if (args != null && args['mode'] == 'buyNow') {
      // Mua ngay: lấy items từ arguments
      _mode = 'buyNow';
      final itemsList = args['items'] as List<Map<String, dynamic>>;
      _checkoutItems = itemsList.map((item) {
        final Product p = item['product'] as Product;
        return _CheckoutItem(
          product: p,
          color: item['color'] as String,
          size: item['size'] as String,
          quantity: item['quantity'] as int,
          maxStock: p.getStockByVariant(item['color'] as String, item['size'] as String),
          cartUniqueKey: null,
        );
      }).toList();
    } else {
      // Từ cart: lấy selected items
      _mode = 'cart';
      final cartState = ref.read(cartProvider);
      _checkoutItems = cartState.selectedItems.map((item) => _CheckoutItem(
        product: item.product,
        color: item.color,
        size: item.size,
        quantity: item.quantity,
        maxStock: item.stock,
        cartUniqueKey: item.uniqueKey,
      )).toList();
    }
  }

  Future<void> _loadUserInfo() async {
    try {
      final user = await UserService.getMe();
      if (user != null && mounted) {
        setState(() => _user = user);
      }
    } catch (e) {
      print('❌ [CheckoutPage] Failed to load user info: $e');
    }
  }

  String _formatCurrency(double amount) {
    return NumberFormat.currency(locale: 'vi_VN', symbol: '₫', decimalDigits: 0).format(amount);
  }

  double get _subtotal => _checkoutItems.fold(0.0, (sum, item) => sum + item.totalPrice);
  double get _total => _subtotal + _shippingFee - _voucherDiscount;

  // ─── CHECKOUT ITEM ACTIONS ──────────────────────────────────────────────

  void _updateItemQuantity(int index, int newQty) {
    final item = _checkoutItems[index];
    if (newQty <= 0) {
      _removeItem(index);
      return;
    }
    if (newQty > item.maxStock) {
      ScaffoldMessenger.of(context).clearSnackBars();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Chỉ còn ${item.maxStock} sản phẩm trong kho'),
          backgroundColor: Colors.orange,
          duration: const Duration(seconds: 2),
        ),
      );
      return;
    }

    setState(() => _checkoutItems[index].quantity = newQty);

    // Đồng bộ ngược lại cart nếu mode = cart
    if (_mode == 'cart' && item.cartUniqueKey != null) {
      ref.read(cartProvider.notifier).updateQuantity(item.cartUniqueKey!, newQty);
    }
  }

  void _removeItem(int index) {
    final item = _checkoutItems[index];

    // Xóa khỏi cart nếu mode = cart
    if (_mode == 'cart' && item.cartUniqueKey != null) {
      ref.read(cartProvider.notifier).removeItem(item.cartUniqueKey!);
    }

    setState(() {
      _checkoutItems.removeAt(index);
      // Reset voucher khi xóa item vì tổng tiền thay đổi
      if (_voucherDiscount > 0) {
        _voucherCode = '';
        _voucherDiscount = 0;
        _appliedVoucher = null;
        _voucherController.clear();
      }
    });

    if (_checkoutItems.isEmpty) {
      Navigator.pop(context);
    }
  }

  // ─── VOUCHER ────────────────────────────────────────────────────────────

  void _applyVoucher() async {
    final code = _voucherController.text.trim().toUpperCase();
    if (code.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Vui lòng nhập mã giảm giá'), backgroundColor: Colors.orange),
      );
      return;
    }

    setState(() => _isLoading = true);
    try {
      final totalOrder = _subtotal + _shippingFee;
      final voucher = await VoucherService.applyVoucher(code, totalOrder);
      if (voucher != null) {
        setState(() {
          _appliedVoucher = voucher;
          _voucherCode = voucher.voucherCode;
          _voucherDiscount = voucher.discountAmount.toDouble();
        });
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('✅ Giảm ${_formatCurrency(_voucherDiscount)}'), backgroundColor: Colors.green),
          );
        }
      }
    } catch (e) {
      String msg = e.toString();
      if (msg.startsWith('Exception: ')) msg = msg.substring(11);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('❌ $msg'), backgroundColor: Colors.red),
        );
      }
    } finally {
      setState(() => _isLoading = false);
    }
  }

  // ─── PLACE ORDER ────────────────────────────────────────────────────────

  Future<void> _placeOrder() async {
    if (_user == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Không tìm thấy thông tin người dùng'), backgroundColor: Colors.red),
      );
      return;
    }
    if (_user!.address == null || _user!.address!.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Vui lòng cập nhật địa chỉ giao hàng'), backgroundColor: Colors.red),
      );
      return;
    }
    if (_user!.phoneNumber == null || _user!.phoneNumber!.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Vui lòng cập nhật số điện thoại'), backgroundColor: Colors.red),
      );
      return;
    }

    setState(() => _isLoading = true);

    try {
      // Convert checkout items sang format API
      final orderItems = _checkoutItems.map((item) => {
        'productId': item.product.id,
        'color': item.color,
        'size': item.size,
        'quantity': item.quantity,
      }).toList();

      final order = await OrderService.createOrder(
        orderItems: orderItems,
        paymentMethod: _paymentMethod,
        userInfo: {
          'username': _user!.username,
          'address': _user!.address!,
          'phoneNumber': _user!.phoneNumber!,
        },
        voucherCode: _voucherCode.isNotEmpty ? _voucherCode : null,
      );

      if (order != null) {
        if (_mode == 'cart') {
          // Lấy các item trong cart đã mua
          final cartItemsPurchased = ref.read(cartProvider).selectedItems;
          await ref.read(cartProvider.notifier).removeCheckoutItems(cartItemsPurchased);
        }

        if (mounted) {
          if (_paymentMethod == 'VNPay') {
            // ─── VNPAY: Tạo VNPay payment URL và chuyển sang trang thanh toán ───
            await _handleVnpayPayment(order);
          } else if (_paymentMethod == 'ZaloPay') {
            // ─── ZALOPAY: Chuyển sang màn hình ZaloPay ───
            await _handleZalopayPayment(order);
          } else {
            // ─── COD: Hiển thị dialog thành công bình thường ───
            _showOrderSuccessDialog(
              orderId: order.id,
              message: 'Chúng tôi sẽ liên hệ xác nhận sớm nhất.',
              isPaid: false,
              isCod: true,
            );
          }
        }
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Đặt hàng thất bại. Vui lòng thử lại.'), backgroundColor: Colors.red),
          );
        }
      }
    } catch (e) {
      String errorMessage = 'Lỗi khi đặt hàng';
      if (e.toString().contains('Exception:')) {
        errorMessage = e.toString().replaceFirst('Exception: ', '');
      }
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(errorMessage), backgroundColor: Colors.red, duration: const Duration(seconds: 3)),
        );
      }
    } finally {
      setState(() => _isLoading = false);
    }
  }

  // ─── VNPAY PAYMENT ───────────────────────────────────────────────────

  Future<void> _handleVnpayPayment(dynamic order) async {
    // Gọi backend tạo VNPay payment URL
    final paymentUrl = await PaymentService.createVnpayPaymentUrl(order.id);

    if (paymentUrl != null && mounted) {
      // Chuyển sang trang thanh toán VNPay
      final result = await Navigator.pushNamed(
        context,
        AppRoutes.vnpayPayment,
        arguments: {
          'orderId': order.id,
          'paymentUrl': paymentUrl,
        },
      );

      if (mounted) {
        final isPaid = result == true;
        _showOrderSuccessDialog(
          orderId: order.id,
          message: isPaid
              ? 'Đơn hàng đã được thanh toán thành công qua VNPay.'
              : 'Đơn hàng đã tạo. Bạn có thể thanh toán sau trong chi tiết đơn hàng.',
          isPaid: isPaid,
          isCod: false,
        );
      }
    } else if (mounted) {
      // Không tạo được payment URL → hiện dialog thông báo
      _showOrderSuccessDialog(
        orderId: order.id,
        message: 'Đơn hàng đã tạo nhưng không thể kết nối VNPay.\n'
            'Bạn có thể thanh toán sau trong chi tiết đơn hàng.',
        isPaid: false,
        isCod: false,
      );
    }
  }

  // ─── ZALOPAY PAYMENT ─────────────────────────────────────────────────

  Future<void> _handleZalopayPayment(dynamic order) async {
    // Gọi backend tạo ZaloPay QR info
    final zaloData = await PaymentService.createZalopayPayment(order.id);

    if (zaloData != null && mounted) {
      final result = await Navigator.pushNamed(
        context,
        AppRoutes.zalopayPayment,
        arguments: {
          'orderId': order.id,
          'orderUrl': zaloData['orderUrl'],
          'amount': order.totalPrice,
          'zpTransToken': zaloData['zpTransToken'],
        },
      );

      if (mounted) {
        final isPaid = result == true;
        _showOrderSuccessDialog(
          orderId: order.id,
          message: isPaid
              ? 'Đơn hàng đã được thanh toán thành công qua ZaloPay.'
              : 'Đơn hàng đã tạo. Bạn có thể thanh toán sau trong chi tiết đơn hàng.',
          isPaid: isPaid,
          isCod: false,
        );
      }
    } else if (mounted) {
      _showOrderSuccessDialog(
        orderId: order.id,
        message: 'Đơn hàng đã tạo nhưng không thể kết nối hệ thống ZaloPay.\n'
            'Bạn có thể thanh toán sau trong chi tiết đơn hàng.',
        isPaid: false,
        isCod: false,
      );
    }
  }

  // ─── ORDER SUCCESS DIALOG ─────────────────────────────────────────────

  void _showOrderSuccessDialog({
    required String orderId,
    required String message,
    required bool isPaid,
    required bool isCod,
  }) {
    final shortId = orderId.substring(orderId.length - 8).toUpperCase();

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => AlertDialog(
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: Colors.green.withValues(alpha: 0.1),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.check_circle, color: Colors.green, size: 60),
            ),
            const SizedBox(height: 20),
            const Text(
              'Đặt hàng thành công!',
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            Text(
              'Mã đơn hàng: #$shortId',
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.grey[600]),
            ),
            const SizedBox(height: 12),
            // Trạng thái thanh toán
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(
                color: isPaid
                    ? Colors.green.withValues(alpha: 0.1)
                    : isCod
                        ? Colors.blue.withValues(alpha: 0.1)
                        : Colors.orange.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(
                    isPaid
                        ? Icons.check_circle
                        : isCod
                            ? Icons.local_shipping_outlined
                            : Icons.schedule,
                    size: 16,
                    color: isPaid
                        ? Colors.green
                        : isCod
                            ? Colors.blue
                            : Colors.orange,
                  ),
                  const SizedBox(width: 6),
                  Flexible(
                    child: Text(
                      isPaid
                          ? 'Đã thanh toán'
                          : isCod
                              ? 'Thanh toán khi nhận hàng'
                              : 'Chưa thanh toán',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w500,
                        color: isPaid
                            ? Colors.green
                            : isCod
                                ? Colors.blue
                                : Colors.orange,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 8),
            Text(
              message,
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.grey[600], fontSize: 13, height: 1.4),
            ),
          ],
        ),
        actions: [
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: () {
                print('🔀 Navigate: ${AppRoutes.orders}');
                Navigator.pop(context);
                Navigator.pop(context);
                Navigator.pushNamed(context, AppRoutes.orders);
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFFFF6B35),
                padding: const EdgeInsets.symmetric(vertical: 14),
              ),
              child: const Text('Xem đơn hàng'),
            ),
          ),
          const SizedBox(height: 8),
          SizedBox(
            width: double.infinity,
            child: TextButton(
              onPressed: () {
                Navigator.pop(context);
                Navigator.pushNamedAndRemoveUntil(
                    context, AppRoutes.home, (route) => false);
              },
              child: const Text('Về trang chủ',
                  style: TextStyle(color: Colors.grey)),
            ),
          ),
        ],
      ),
    );
  }

  // ─── BUILD ──────────────────────────────────────────────────────────────

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
        title: const Text('Thanh toán', style: TextStyle(color: Colors.black87, fontSize: 18, fontWeight: FontWeight.w600)),
      ),
      body: _checkoutItems.isEmpty
          ? const EmptyStateWidget(
              icon: Icons.shopping_cart_outlined,
              title: 'Không có sản phẩm',
              subtitle: 'Chọn sản phẩm để thanh toán',
            )
          : Column(
              children: [
                Expanded(
                  child: SingleChildScrollView(
                    child: Column(
                      children: [
                        _buildAddressSection(),
                        const SizedBox(height: 8),
                        _buildProductsSection(),
                        const SizedBox(height: 8),
                        _buildVoucherSection(),
                        const SizedBox(height: 8),
                        _buildPaymentMethodSection(),
                        const SizedBox(height: 8),
                        _buildOrderSummary(),
                        const SizedBox(height: 100),
                      ],
                    ),
                  ),
                ),
                _buildBottomBar(),
              ],
            ),
    );
  }

  Widget _buildAddressSection() {
    return Container(
      color: Colors.white,
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('Địa chỉ giao hàng', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 16)),
              TextButton(
                onPressed: () async {
                  final result = await Navigator.pushNamed(context, AppRoutes.profileInfo);
                  if (result == true) _loadUserInfo();
                },
                child: const Text('Thay đổi', style: TextStyle(color: Color(0xFFFF6B35))),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Icon(Icons.location_on, color: Color(0xFFFF6B35), size: 20),
              const SizedBox(width: 8),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(children: [
                      Text(_user?.username ?? 'Tên người nhận', style: const TextStyle(fontWeight: FontWeight.w500)),
                      const SizedBox(width: 8),
                      Text(_user?.phoneNumber ?? '0xxx xxx xxx', style: TextStyle(color: Colors.grey[600])),
                    ]),
                    const SizedBox(height: 4),
                    Text(_user?.address ?? 'Chưa có địa chỉ', style: TextStyle(color: Colors.grey[600], height: 1.4)),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildProductsSection() {
    return Container(
      color: Colors.white,
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('Sản phẩm (${_checkoutItems.length})', style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 16)),
            ],
          ),
          const SizedBox(height: 12),
          ...List.generate(_checkoutItems.length, (index) {
            final item = _checkoutItems[index];
            return Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Ảnh
                  ClipRRect(
                    borderRadius: BorderRadius.circular(8),
                    child: Image.network(
                      item.product.thumbnail,
                      width: 70,
                      height: 70,
                      fit: BoxFit.cover,
                      errorBuilder: (_, __, ___) => Container(width: 70, height: 70, color: Colors.grey[200], child: const Icon(Icons.image, color: Colors.grey)),
                    ),
                  ),
                  const SizedBox(width: 12),
                  // Thông tin
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(item.product.name, maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500)),
                        const SizedBox(height: 4),
                        Text('${item.color} - ${item.size}', style: TextStyle(color: Colors.grey[600], fontSize: 12)),
                        const SizedBox(height: 8),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(_formatCurrency(item.product.finalPrice), style: const TextStyle(color: Color(0xFFFF6B35), fontWeight: FontWeight.w600)),
                            // Quantity controls
                            QuantitySelector(
                              quantity: item.quantity,
                              maxStock: item.maxStock,
                              snackBarContext: context,
                              onChanged: (newQty) => _updateItemQuantity(index, newQty),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  // Nút xóa
                  IconButton(
                    onPressed: () => _removeItem(index),
                    icon: const Icon(Icons.close, size: 18, color: Colors.grey),
                    padding: EdgeInsets.zero,
                    constraints: const BoxConstraints(),
                  ),
                ],
              ),
            );
          }),
        ],
      ),
    );
  }


  Widget _buildVoucherSection() {
    return Container(
      color: Colors.white,
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Mã giảm giá', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 16)),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _voucherController,
                  decoration: InputDecoration(
                    hintText: 'Nhập mã giảm giá',
                    prefixIcon: const Icon(Icons.local_offer_outlined),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                    contentPadding: const EdgeInsets.symmetric(horizontal: 12),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              ElevatedButton(
                onPressed: _isLoading ? null : _applyVoucher,
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFFFF6B35),
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
                ),
                child: _isLoading
                    ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                    : const Text('Áp dụng'),
              ),
            ],
          ),
          if (_voucherCode.isNotEmpty) ...[
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.green.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(
                children: [
                  const Icon(Icons.check_circle, color: Colors.green, size: 20),
                  const SizedBox(width: 8),
                  Text('Đã áp dụng mã $_voucherCode', style: const TextStyle(color: Colors.green)),
                  const Spacer(),
                  GestureDetector(
                    onTap: () => setState(() {
                      _voucherCode = '';
                      _voucherDiscount = 0;
                      _appliedVoucher = null;
                      _voucherController.clear();
                    }),
                    child: const Icon(Icons.close, color: Colors.green, size: 20),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  bool get _isOnlinePayment => _paymentMethod == 'VNPay' || _paymentMethod == 'ZaloPay';

  Widget _buildPaymentMethodSection() {
    return Container(
      color: Colors.white,
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Phương thức thanh toán', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 16)),
          const SizedBox(height: 12),
          _buildPaymentOption('COD', 'Thanh toán khi nhận hàng', Icons.local_shipping_outlined),
          const SizedBox(height: 8),
          _buildOnlinePaymentGroup(),
        ],
      ),
    );
  }

  Widget _buildOnlinePaymentGroup() {
    return Column(
       children: [
          GestureDetector(
             onTap: () => setState(() {
               if (!_isOnlinePayment) {
                  _paymentMethod = 'ZaloPay'; // Mặc định chọn ZaloPay khi click vào group này
               }
             }),
             child: Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                   border: Border.all(color: _isOnlinePayment ? const Color(0xFFFF6B35) : Colors.grey[300]!),
                   borderRadius: BorderRadius.circular(8),
                   color: _isOnlinePayment ? const Color(0xFFFF6B35).withValues(alpha: 0.05) : null,
                ),
                child: Row(
                  children: [
                    Icon(Icons.credit_card, color: _isOnlinePayment ? const Color(0xFFFF6B35) : Colors.grey),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text('Thanh toán Online', style: TextStyle(
                        color: _isOnlinePayment ? const Color(0xFFFF6B35) : Colors.black87,
                        fontWeight: _isOnlinePayment ? FontWeight.w500 : FontWeight.normal,
                      )),
                    ),
                    if (_isOnlinePayment) const Icon(Icons.check_circle, color: Color(0xFFFF6B35), size: 20),
                  ],
                ),
             )
          ),
          
          if (_isOnlinePayment) ...[
             const SizedBox(height: 12),
             Padding(
                padding: const EdgeInsets.only(left: 32.0),
                child: Column(
                   children: [
                      _buildOnlineSubOption('ZaloPay', 'Ví ZaloPay / QR ZaloPay', Icons.domain_verification),
                      const SizedBox(height: 8),
                      _buildOnlineSubOption('VNPay', 'Cổng thanh toán VNPay', Icons.account_balance_outlined),
                   ]
                )
             )
          ]
       ]
    );
  }

  Widget _buildOnlineSubOption(String value, String label, IconData icon) {
    final isSelected = _paymentMethod == value;
    return GestureDetector(
       onTap: () => setState(() => _paymentMethod = value),
       child: Container(
          padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
          decoration: BoxDecoration(
             border: Border.all(color: isSelected ? const Color(0xFFFF6B35) : Colors.grey[300]!),
             borderRadius: BorderRadius.circular(8),
             color: isSelected ? Colors.white : Colors.grey[50],
          ),
          child: Row(
             children: [
                 Icon(icon, size: 20, color: isSelected ? const Color(0xFFFF6B35) : Colors.grey[600]),
                 const SizedBox(width: 12),
                 Expanded(
                    child: Text(label, style: TextStyle(
                       fontSize: 14,
                       color: isSelected ? const Color(0xFFFF6B35) : Colors.black87,
                       fontWeight: isSelected ? FontWeight.w500 : FontWeight.normal,
                    ))
                 ),
                 Icon(isSelected ? Icons.radio_button_checked : Icons.radio_button_off, 
                      color: isSelected ? const Color(0xFFFF6B35) : Colors.grey[400], 
                      size: 20)
             ]
          )
       )
    );
  }

  Widget _buildPaymentOption(String value, String label, IconData icon) {
    final isSelected = _paymentMethod == value;
    return GestureDetector(
      onTap: () => setState(() => _paymentMethod = value),
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          border: Border.all(color: isSelected ? const Color(0xFFFF6B35) : Colors.grey[300]!),
          borderRadius: BorderRadius.circular(8),
          color: isSelected ? const Color(0xFFFF6B35).withValues(alpha: 0.05) : null,
        ),
        child: Row(
          children: [
            Icon(icon, color: isSelected ? const Color(0xFFFF6B35) : Colors.grey),
            const SizedBox(width: 12),
            Expanded(
              child: Text(label, style: TextStyle(
                color: isSelected ? const Color(0xFFFF6B35) : Colors.black87,
                fontWeight: isSelected ? FontWeight.w500 : FontWeight.normal,
              )),
            ),
            if (isSelected) const Icon(Icons.check_circle, color: Color(0xFFFF6B35), size: 20),
          ],
        ),
      ),
    );
  }

  Widget _buildOrderSummary() {
    return Container(
      color: Colors.white,
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Chi tiết đơn hàng', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 16)),
          const SizedBox(height: 16),
          _buildSummaryRow('Tạm tính', _formatCurrency(_subtotal)),
          const SizedBox(height: 8),
          _buildSummaryRow('Phí vận chuyển', _formatCurrency(_shippingFee)),
          if (_voucherDiscount > 0) ...[
            const SizedBox(height: 8),
            _buildSummaryRow('Giảm giá voucher', '-${_formatCurrency(_voucherDiscount)}', valueColor: Colors.green),
          ],
          const Divider(height: 24),
          _buildSummaryRow('Tổng cộng', _formatCurrency(_total), isBold: true, valueColor: const Color(0xFFFF6B35)),
        ],
      ),
    );
  }

  Widget _buildSummaryRow(String label, String value, {bool isBold = false, Color? valueColor}) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: TextStyle(fontWeight: isBold ? FontWeight.w600 : FontWeight.normal, fontSize: isBold ? 16 : 14)),
        Text(value, style: TextStyle(color: valueColor, fontWeight: isBold ? FontWeight.bold : FontWeight.w500, fontSize: isBold ? 18 : 14)),
      ],
    );
  }

  Widget _buildBottomBar() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        boxShadow: [BoxShadow(color: Colors.grey.withValues(alpha: 0.2), spreadRadius: 1, blurRadius: 10, offset: const Offset(0, -2))],
      ),
      child: SafeArea(
        child: Row(
          children: [
            Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Tổng thanh toán'),
                Text(_formatCurrency(_total), style: const TextStyle(color: Color(0xFFFF6B35), fontSize: 20, fontWeight: FontWeight.bold)),
              ],
            ),
            const SizedBox(width: 16),
            Expanded(
              child: ElevatedButton(
                onPressed: _isLoading ? null : _placeOrder,
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFFFF6B35),
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  elevation: 0,
                ),
                child: _isLoading
                    ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                    : const Text('Đặt hàng', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
              ),
            ),
          ],
        ),
      ),
    );
  }

  @override
  void dispose() {
    _voucherController.dispose();
    super.dispose();
  }
}

