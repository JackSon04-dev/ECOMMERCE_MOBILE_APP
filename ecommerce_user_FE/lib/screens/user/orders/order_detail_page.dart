import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../utils/currency_helper.dart';
import '../../../models/order_model.dart';
import '../../../services/order_service.dart';
import '../../../utils/date_helper.dart';
import '../../../widgets/common_widgets.dart';
import '../../../widgets/order/order_action_buttons.dart';
import '../../../widgets/order/order_action_helper.dart';

/// 📦 Order Detail Page - Trang chi tiết đơn hàng
class OrderDetailPage extends ConsumerStatefulWidget {
  final String? orderId;
  final Order? order;

  const OrderDetailPage({
    super.key,
    this.orderId,
    this.order,
  });

  @override
  ConsumerState<OrderDetailPage> createState() => _OrderDetailPageState();
}

class _OrderDetailPageState extends ConsumerState<OrderDetailPage> {
  bool _isLoading = false;
  Order? _order;
  bool _isHistoryExpanded = false;

  @override
  void initState() {
    super.initState();
    if (widget.order != null) {
      _order = widget.order;
    } else if (widget.orderId != null) {
      _loadOrderDetail();
    }
  }

  Future<void> _loadOrderDetail() async {
    final orderId = widget.orderId ?? _order?.id;
    if (orderId == null) return;

    setState(() => _isLoading = true);

    try {
      final order = await OrderService.getOrderById(orderId);
      setState(() {
        _order = order;
        _isLoading = false;
      });
    } catch (e) {
      setState(() => _isLoading = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Lỗi tải đơn hàng: $e')),
        );
      }
    }
  }

  String _formatDate(DateTime? date) {
    return DateHelper.formatDateTime(date);
  }


  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Scaffold(body: LoadingWidget());
    }

    if (_order == null) {
      return Scaffold(
        appBar: AppBar(
          backgroundColor: Colors.white,
          elevation: 0,
          leading: IconButton(
            icon: const Icon(Icons.arrow_back_ios, color: Colors.black87),
            onPressed: () => Navigator.pop(context),
          ),
          title: const Text('Chi tiết đơn hàng', style: TextStyle(color: Colors.black87, fontSize: 18, fontWeight: FontWeight.w600)),
        ),
        body: const Center(
          child: EmptyStateWidget(
            icon: Icons.receipt_long_outlined,
            title: 'Không tìm thấy đơn hàng',
            subtitle: 'Đơn hàng không tồn tại hoặc đã bị xóa',
          ),
        ),
      );
    }

    return Scaffold(
      backgroundColor: Colors.grey[50],
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios, color: Colors.black87),
          onPressed: () => Navigator.pop(context),
        ),
        title: const Text('Chi tiết đơn hàng', style: TextStyle(color: Colors.black87, fontSize: 18, fontWeight: FontWeight.w600)),
      ),
      body: SingleChildScrollView(
        child: Column(
          children: [
            _buildStatusSection(),
            const SizedBox(height: 12),
            _buildDeliveryInfo(),
            const SizedBox(height: 12),
            _buildStatusHistorySection(),
            const SizedBox(height: 12),
            _buildProductsSection(),
            const SizedBox(height: 12),
            _buildPaymentInfo(),
            const SizedBox(height: 12),
            _buildPriceBreakdown(),
            const SizedBox(height: 80),
          ],
        ),
      ),
      bottomNavigationBar: _buildBottomActions(),
    );
  }

  Widget _buildStatusSection() {
    final statusColor = OrderActionHelper.getStatusColor(_order!.status);
    final shortId = '#${_order!.id.substring(_order!.id.length - 8).toUpperCase()}';

    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: Colors.white,
        boxShadow: [
          BoxShadow(color: Colors.grey.withValues(alpha: 0.1), spreadRadius: 1, blurRadius: 5),
        ],
      ),
      child: Column(
        children: [
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 20),
            decoration: BoxDecoration(color: statusColor.withValues(alpha: 0.08)),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(color: statusColor.withValues(alpha: 0.15), shape: BoxShape.circle),
                  child: Icon(OrderActionHelper.getStatusIcon(_order!.status), size: 32, color: statusColor),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(_order!.status, style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: statusColor)),
                      const SizedBox(height: 4),
                      Text(OrderActionHelper.getStatusDescription(_order!.status), style: TextStyle(fontSize: 12, color: statusColor.withValues(alpha: 0.8))),
                    ],
                  ),
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            child: Row(
              children: [
                Expanded(
                  child: _buildDateInfoTile(
                    icon: Icons.receipt_outlined,
                    label: 'Mã đơn',
                    value: shortId,
                    valueStyle: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: Colors.black87, letterSpacing: 0.5),
                  ),
                ),
                _buildVerticalDivider(),
                Expanded(child: _buildDateInfoTile(icon: Icons.calendar_today_outlined, label: 'Ngày đặt', value: _order!.createdAt != null ? _formatDate(_order!.createdAt) : '—')),
                _buildVerticalDivider(),
                Expanded(child: _buildDateInfoTile(icon: Icons.update_outlined, label: 'Cập nhật', value: _order!.updatedAt != null ? _formatDate(_order!.updatedAt) : '—')),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDateInfoTile({required IconData icon, required String label, required String value, TextStyle? valueStyle}) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 18, color: const Color(0xFFFF6B35)),
        const SizedBox(height: 4),
        Text(label, style: const TextStyle(fontSize: 11, color: Colors.grey)),
        const SizedBox(height: 3),
        Text(value, textAlign: TextAlign.center, style: valueStyle ?? const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Colors.black87)),
      ],
    );
  }

  Widget _buildVerticalDivider() {
    return Container(width: 1, height: 48, color: Colors.grey[200], margin: const EdgeInsets.symmetric(horizontal: 4));
  }

  Widget _buildDeliveryInfo() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(color: Colors.white, boxShadow: [BoxShadow(color: Colors.grey.withOpacity(0.1), spreadRadius: 1, blurRadius: 5)]),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(children: [Icon(Icons.local_shipping_outlined, size: 20, color: Color(0xFFFF6B35)), SizedBox(width: 8), Text('Thông tin giao hàng', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600))]),
          const SizedBox(height: 12),
          _buildInfoRow(Icons.person, 'Người nhận', _order!.userInfo.username),
          const SizedBox(height: 8),
          _buildInfoRow(Icons.phone, 'Số điện thoại', _order!.userInfo.phoneNumber),
          const SizedBox(height: 8),
          _buildInfoRow(Icons.location_on, 'Địa chỉ', _order!.userInfo.address),
        ],
      ),
    );
  }

  Widget _buildStatusHistorySection() {
    if (_order == null) return const SizedBox.shrink();

    final history = _order!.statusHistory.reversed.toList();

    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: Colors.white,
        boxShadow: [
          BoxShadow(
            color: Colors.grey.withValues(alpha: 0.1),
            spreadRadius: 1,
            blurRadius: 5,
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          InkWell(
            onTap: () {
              setState(() {
                _isHistoryExpanded = !_isHistoryExpanded;
              });
            },
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
              child: Row(
                children: [
                  const Icon(
                    Icons.history_toggle_off_outlined,
                    size: 20,
                    color: Color(0xFFFF6B35),
                  ),
                  const SizedBox(width: 8),
                  const Text(
                    'Lịch sử trạng thái đơn hàng',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                      color: Colors.black87,
                    ),
                  ),
                  const SizedBox(width: 8),
                  if (history.isNotEmpty)
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                      decoration: BoxDecoration(
                        color: const Color(0xFFFF6B35).withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Text(
                        '${history.length}',
                        style: const TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.bold,
                          color: Color(0xFFFF6B35),
                        ),
                      ),
                    ),
                  const Spacer(),
                  AnimatedRotation(
                    turns: _isHistoryExpanded ? 0.5 : 0,
                    duration: const Duration(milliseconds: 200),
                    child: const Icon(
                      Icons.keyboard_arrow_down_rounded,
                      color: Colors.grey,
                    ),
                  ),
                ],
              ),
            ),
          ),
          AnimatedSize(
            duration: const Duration(milliseconds: 350),
            curve: Curves.easeInOut,
            child: _isHistoryExpanded
                ? Container(
                    padding: const EdgeInsets.only(left: 16, right: 16, bottom: 20, top: 4),
                    child: history.isEmpty
                        ? const Center(
                            child: Padding(
                              padding: EdgeInsets.symmetric(vertical: 16),
                              child: Text(
                                'Chưa có thông tin cập nhật lịch sử trạng thái.',
                                style: TextStyle(color: Colors.grey, fontSize: 13),
                              ),
                            ),
                          )
                        : ListView.builder(
                            shrinkWrap: true,
                            physics: const NeverScrollableScrollPhysics(),
                            itemCount: history.length,
                            itemBuilder: (context, index) {
                              final item = history[index];
                              final isFirst = index == 0;
                              final isLast = index == history.length - 1;
                              final statusColor = OrderActionHelper.getStatusColor(item.status);

                              return IntrinsicHeight(
                                child: Row(
                                  crossAxisAlignment: CrossAxisAlignment.stretch,
                                  children: [
                                    // Timeline graphic column
                                    SizedBox(
                                      width: 32,
                                      child: Stack(
                                        alignment: Alignment.topCenter,
                                        children: [
                                          // Vertical connection line
                                          if (history.length > 1)
                                            if (isFirst)
                                              Positioned(
                                                top: 20,
                                                bottom: 0,
                                                child: Container(
                                                  width: 2,
                                                  color: Colors.grey[200],
                                                ),
                                              )
                                            else if (isLast)
                                              Positioned(
                                                top: 0,
                                                height: 20,
                                                child: Container(
                                                  width: 2,
                                                  color: Colors.grey[200],
                                                ),
                                              )
                                            else
                                              Positioned(
                                                top: 0,
                                                bottom: 0,
                                                child: Container(
                                                  width: 2,
                                                  color: Colors.grey[200],
                                                ),
                                              ),
                                          // Status dot
                                          Positioned(
                                            top: 12,
                                            child: AnimatedContainer(
                                              duration: const Duration(milliseconds: 300),
                                              width: isFirst ? 14 : 10,
                                              height: isFirst ? 14 : 10,
                                              decoration: BoxDecoration(
                                                color: isFirst ? statusColor : Colors.grey[350],
                                                shape: BoxShape.circle,
                                                border: isFirst
                                                    ? Border.all(
                                                        color: statusColor.withValues(alpha: 0.25),
                                                        width: 4,
                                                        strokeAlign: BorderSide.strokeAlignOutside,
                                                      )
                                                    : null,
                                                boxShadow: isFirst
                                                    ? [
                                                        BoxShadow(
                                                          color: statusColor.withValues(alpha: 0.3),
                                                          blurRadius: 6,
                                                          spreadRadius: 1,
                                                        )
                                                      ]
                                                    : null,
                                              ),
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                    const SizedBox(width: 12),
                                    // Status details column
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            item.status,
                                            style: TextStyle(
                                              fontSize: 14,
                                              fontWeight: isFirst ? FontWeight.w700 : FontWeight.w600,
                                              color: isFirst ? Colors.black87 : Colors.grey[600],
                                            ),
                                          ),
                                          const SizedBox(height: 4),
                                          if (item.updatedAt != null)
                                            Text(
                                              _formatDate(item.updatedAt),
                                              style: TextStyle(
                                                fontSize: 12,
                                                color: isFirst ? Colors.black54 : Colors.grey[500],
                                              ),
                                            ),
                                          if (item.note.isNotEmpty) ...[
                                            const SizedBox(height: 6),
                                            Container(
                                              width: double.infinity,
                                              padding: const EdgeInsets.all(10),
                                              decoration: BoxDecoration(
                                                color: Colors.grey[50],
                                                borderRadius: BorderRadius.circular(8),
                                                border: Border.all(
                                                  color: Colors.grey[200]!,
                                                  width: 1,
                                                ),
                                              ),
                                              child: Text(
                                                item.note,
                                                style: TextStyle(
                                                  fontSize: 12,
                                                  fontStyle: FontStyle.italic,
                                                  color: Colors.grey[700],
                                                ),
                                              ),
                                            ),
                                          ],
                                          const SizedBox(height: 16),
                                        ],
                                      ),
                                    ),
                                  ],
                                ),
                              );
                            },
                          ),
                  )
                : const SizedBox.shrink(),
          ),
        ],
      ),
    );
  }

  Widget _buildInfoRow(IconData icon, String label, String value) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 18, color: Colors.grey),
        const SizedBox(width: 8),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(label, style: const TextStyle(fontSize: 12, color: Colors.grey)),
              const SizedBox(height: 2),
              Text(value, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500)),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildProductsSection() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(color: Colors.white, boxShadow: [BoxShadow(color: Colors.grey.withOpacity(0.1), spreadRadius: 1, blurRadius: 5)]),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(children: [Icon(Icons.shopping_bag_outlined, size: 20, color: Color(0xFFFF6B35)), SizedBox(width: 8), Text('Sản phẩm đã đặt', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600))]),
          const SizedBox(height: 12),
          ..._order!.orderItems.map((item) => _buildProductItem(item)),
        ],
      ),
    );
  }

  Widget _buildProductItem(OrderItem item) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(color: Colors.grey[50], borderRadius: BorderRadius.circular(12)),
      child: Row(
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(8),
            child: Image.network(
              item.variant.colorImage, width: 70, height: 70, fit: BoxFit.cover,
              errorBuilder: (context, error, stackTrace) => Container(width: 70, height: 70, color: Colors.grey[300], child: const Icon(Icons.image, color: Colors.grey)),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(item.productName, maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500)),
                const SizedBox(height: 4),
                Text('Phân loại: ${item.variant.color} - ${item.variant.size}', style: TextStyle(color: Colors.grey[600], fontSize: 12)),
                const SizedBox(height: 4),
                Text('x${item.variant.quantity}', style: TextStyle(color: Colors.grey[600], fontSize: 12)),
              ],
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(item.finalPrice.toVND(), style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: Color(0xFFFF6B35))),
              const SizedBox(height: 4),
              Text(item.itemTotal.toVND(), style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.black87)),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildPaymentInfo() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(color: Colors.white, boxShadow: [BoxShadow(color: Colors.grey.withValues(alpha: 0.1), spreadRadius: 1, blurRadius: 5)]),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(children: [Icon(Icons.payment, size: 20, color: Color(0xFFFF6B35)), SizedBox(width: 8), Text('Thanh toán', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600))]),
          const SizedBox(height: 12),
          _buildInfoRow(Icons.payment, 'Phương thức', _order!.paymentMethod),
          const SizedBox(height: 8),
          _buildInfoRow(Icons.check_circle_outline, 'Trạng thái', _order!.isPaid ? 'Đã thanh toán' : 'Chưa thanh toán'),
          if (_order!.paidAt != null) ...[
            const SizedBox(height: 8),
            _buildInfoRow(Icons.access_time, 'Thời gian thanh toán', _formatDate(_order!.paidAt)),
          ],
        ],
      ),
    );
  }

  Widget _buildPriceBreakdown() {
     return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(color: Colors.white),
      child: Column(
        children: [
          _buildPriceRow('Tạm tính', _order!.totalPrice + (_order!.voucher.discountAmount ?? 0) - (_order!.shippingPrice ?? 0)),
          const SizedBox(height: 8),
          _buildPriceRow('Phí vận chuyển', _order!.shippingPrice ?? 0),
          const SizedBox(height: 8),
          _buildPriceRow('Giảm giá', -(_order!.voucher.discountAmount ?? 0), color: Colors.green),
          const Divider(height: 24),
          _buildPriceRow('Tổng cộng', _order!.totalPrice, isBold: true, color: const Color(0xFFFF6B35), fontSize: 18),
        ],
      ),
    );
  }

  Widget _buildPriceRow(String label, double amount, {bool isBold = false, Color? color, double fontSize = 14}) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: TextStyle(fontSize: fontSize, fontWeight: isBold ? FontWeight.bold : FontWeight.normal)),
        Text(amount.toVND(), style: TextStyle(fontSize: fontSize, fontWeight: isBold ? FontWeight.bold : FontWeight.w600, color: color)),
      ],
    );
  }

  Widget? _buildBottomActions() {
    if (_order == null) return null;
    
    return OrderActionButtons(
      order: _order!,
      isDetailView: true,
      onSuccess: (updatedOrder) {
        setState(() {
          _order = updatedOrder;
        });
      },
    );
  }
}
