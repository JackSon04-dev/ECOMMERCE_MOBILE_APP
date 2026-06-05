import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../models/order_model.dart';
import '../../../services/order_service.dart';
import '../../../providers/order_provider.dart';
import 'order_action_helper.dart';

class OrderActionButtons extends ConsumerWidget {
  final Order order;
  final Function(Order)? onSuccess;
  final bool isDetailView;

  const OrderActionButtons({
    super.key,
    required this.order,
    this.onSuccess,
    this.isDetailView = false,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final canCancel = order.status == 'Chờ xác nhận';
    final canPay = !order.isPaid && (order.paymentMethod == 'VNPay' || order.paymentMethod == 'ZaloPay' || order.paymentMethod == 'PayOS') && order.status != 'Đã hủy';
    final canReview = order.status == 'Thành công';
    final canConfirmReceive = order.status == 'Đã giao';

    if (!canCancel && !canPay && !canReview && !canConfirmReceive) return const SizedBox.shrink();

    final content = Row(
      children: [
        if (canCancel)
          Expanded(
            child: OutlinedButton(
              onPressed: () => OrderActionHelper.cancelOrder(context, ref, order, onSuccess),
              style: OutlinedButton.styleFrom(
                foregroundColor: Colors.red, 
                side: const BorderSide(color: Colors.red), 
                padding: const EdgeInsets.symmetric(vertical: 12)
              ),
              child: const Text('Hủy đơn hàng'),
            ),
          ),
        if (canPay) ...[
          if (canCancel) const SizedBox(width: 12),
          Expanded(
            child: ElevatedButton(
              onPressed: () {
                if (order.paymentMethod == 'VNPay') {
                  OrderActionHelper.handleVnpayPayment(context, ref, order, onSuccess);
                } else if (order.paymentMethod == 'ZaloPay') {
                  OrderActionHelper.handleZalopayPayment(context, ref, order, onSuccess);
                } else if (order.paymentMethod == 'PayOS') {
                  OrderActionHelper.handlePayosPayment(context, ref, order, onSuccess);
                }
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: order.paymentMethod == 'VNPay'
                    ? const Color(0xFF2196F3)
                    : order.paymentMethod == 'ZaloPay'
                        ? const Color(0xFF007DFE)
                        : const Color(0xFF00C853), // PayOS - xanh lá
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 12)
              ),
              child: const Text('Thanh toán ngay'),
            ),
          ),
        ],
        if (canConfirmReceive)
          Expanded(
            child: ElevatedButton(
              onPressed: () => OrderActionHelper.confirmReceived(context, ref, order, onSuccess),
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.green,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 12),
                elevation: 0,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              child: const Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.check_circle_outline, size: 20),
                  SizedBox(width: 8),
                  Text('Đã nhận được hàng', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold)),
                ],
              ),
            ),
          ),
        if (canReview) ...[
          Expanded(
            child: OutlinedButton(
              onPressed: () => OrderActionHelper.reorder(context, ref, order),
              style: OutlinedButton.styleFrom(
                foregroundColor: const Color(0xFFFF6B35), 
                side: const BorderSide(color: Color(0xFFFF6B35)), 
                padding: const EdgeInsets.symmetric(vertical: 12)
              ),
              child: const Text('Mua lại'),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: ElevatedButton(
              onPressed: () {
                Navigator.pushNamed(
                  context,
                  '/create-review',
                  arguments: order,
                ).then((result) async {
                  if (result == true) {
                    // Cập nhật lại cache sau khi đánh giá
                    final updatedOrder = await OrderService.getOrderById(order.id);
                    final tabs = ['Tất cả', 'Chờ xác nhận', 'Đã xác nhận', 'Đang giao', 'Đã giao', 'Đã hủy'];
                    for (var tab in tabs) {
                      if (ref.exists(orderProvider(tab))) {
                        ref.read(orderProvider(tab).notifier).updateOrderInCache(updatedOrder);
                      }
                    }
                    if (onSuccess != null) onSuccess!(updatedOrder);
                  }
                });
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: order.isRated
                    ? Colors.grey[100]
                    : order.hasAnyRated
                        ? const Color(0xFFFF8F60)
                        : const Color(0xFFFF6B35),
                foregroundColor: order.isRated
                    ? Colors.grey[600]
                    : Colors.white,
                elevation: 0,
                padding: const EdgeInsets.symmetric(vertical: 12),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    order.isRated
                        ? Icons.star_rounded
                        : Icons.star_outline_rounded,
                    size: 16,
                  ),
                  const SizedBox(width: 4),
                  Flexible(
                    child: FittedBox(
                      fit: BoxFit.scaleDown,
                      child: Text(
                        order.isRated
                            ? 'Xem đánh giá'
                            : 'Đánh giá',
                        style: const TextStyle(fontSize: 13),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ],
    );

    if (isDetailView) {
      return Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white, 
          boxShadow: [
            BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 10, offset: const Offset(0, -5))
          ]
        ),
        child: SafeArea(top: false, child: content),
      );
    }

    return Padding(
      padding: const EdgeInsets.only(left: 16, right: 16, bottom: 16, top: 8),
      child: content,
    );
  }
}
