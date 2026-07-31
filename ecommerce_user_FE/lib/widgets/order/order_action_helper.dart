import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../models/order_model.dart';
import '../../../providers/cart_provider.dart';
import '../../../providers/order_provider.dart';
import '../../../services/order_service.dart';
import '../../../services/payment_service.dart';
import '../../../config/routes.dart';
import '../reorder_result_sheet.dart';

class OrderActionHelper {
  static Future<void> cancelOrder(
      BuildContext context, WidgetRef ref, Order order, Function(Order)? onSuccess) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Hủy đơn hàng'),
        content: const Text('Bạn có chắc muốn hủy đơn hàng này?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Không'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Hủy đơn', style: TextStyle(color: Colors.red)),
          ),
        ],
      ),
    );

    if (confirm == true && context.mounted) {
      showDialog(
        context: context,
        barrierDismissible: false,
        builder: (context) => const Center(child: CircularProgressIndicator()),
      );

      try {
        final updatedOrder = await OrderService.cancelOrder(order.id);
        if (context.mounted) {
          Navigator.pop(context); // close dialog
          if (updatedOrder != null) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Đã hủy đơn hàng thành công'), backgroundColor: Colors.green),
            );
            final tabs = ['Tất cả', 'Chờ xác nhận', 'Đã xác nhận', 'Đang giao', 'Đã giao', 'Đã hủy'];
            for (var tab in tabs) {
              if (ref.exists(orderProvider(tab))) {
                ref.read(orderProvider(tab).notifier).updateOrderInCache(updatedOrder);
              }
            }
            onSuccess?.call(updatedOrder);
          } else {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Không thể hủy đơn hàng. Vui lòng thử lại!'), backgroundColor: Colors.red),
            );
          }
        }
      } catch (e) {
        if (context.mounted) {
          Navigator.pop(context); // close dialog
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Lỗi: ${e.toString()}'), backgroundColor: Colors.red),
          );
        }
      }
    }
  }

  static Future<void> reorder(BuildContext context, WidgetRef ref, Order order) async {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (_) => const Center(child: CircularProgressIndicator(color: Color(0xFFFF6B35))),
    );

    final result = await ref.read(cartProvider.notifier).reorder(order.orderItems);

    if (!context.mounted) return;
    Navigator.pop(context);

    final added = result['added'] ?? [];
    final outOfStock = result['outOfStock'] ?? [];
    final failed = result['failed'] ?? [];

    await ReorderResultSheet.show(
      context,
      added: added,
      outOfStock: outOfStock,
      failed: failed,
    );
  }

  static Future<void> confirmReceived(
      BuildContext context, WidgetRef ref, Order order, Function(Order)? onSuccess) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Row(
          children: [
            Icon(Icons.check_circle, color: Colors.green),
            SizedBox(width: 8),
            Text('Xác nhận nhận hàng', style: TextStyle(fontSize: 18)),
          ],
        ),
        content: const Text(
          'Bạn xác nhận đã nhận được hàng nguyên vẹn?\nĐơn hàng sẽ chuyển sang trạng thái "Thành công".', 
          style: TextStyle(fontSize: 14)
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false), 
            child: const Text('Chưa', style: TextStyle(color: Colors.grey))
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.green, 
              foregroundColor: Colors.white, 
              elevation: 0, 
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8))
            ),
            child: const Text('Đã nhận hàng'),
          ),
        ],
      ),
    );

    if (confirm != true || !context.mounted) return;

    showDialog(context: context, barrierDismissible: false, builder: (_) => const Center(child: CircularProgressIndicator(color: Colors.green)));

    try {
      final updatedOrder = await OrderService.confirmReceived(order.id);
      if (!context.mounted) return;
      Navigator.pop(context); // close dialog

      if (updatedOrder != null) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('✅ Xác nhận nhận hàng thành công!'), backgroundColor: Colors.green));
        final tabs = ['Tất cả', 'Chờ xác nhận', 'Đã xác nhận', 'Đang giao', 'Đã giao', 'Đã hủy'];
        for (var tab in tabs) {
          if (ref.exists(orderProvider(tab))) {
            ref.read(orderProvider(tab).notifier).updateOrderInCache(updatedOrder);
          }
        }
        onSuccess?.call(updatedOrder);
      }
    } catch (e) {
      if (!context.mounted) return;
      Navigator.pop(context);
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Lỗi: $e'), backgroundColor: Colors.red));
    }
  }

  static Future<void> handleVnpayPayment(
      BuildContext context, WidgetRef ref, Order order, Function(Order)? onSuccess) async {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (_) => const Center(child: CircularProgressIndicator(color: Color(0xFFFF6B35))),
    );

    try {
      final paymentUrl = await PaymentService.createVnpayPaymentUrl(order.id);
      if (!context.mounted) return;
      Navigator.pop(context);

      if (paymentUrl != null) {
        final result = await Navigator.pushNamed(
          context,
          AppRoutes.vnpayPayment,
          arguments: {
            'orderId': order.id,
            'paymentUrl': paymentUrl,
          },
        );

        if (result == true && context.mounted) {
          final updatedOrder = await OrderService.getOrderById(order.id);
          final tabs = ['Tất cả', 'Chờ xác nhận', 'Đã xác nhận', 'Đang giao', 'Đã giao', 'Đã hủy'];
          for (var tab in tabs) {
            if (ref.exists(orderProvider(tab))) {
              ref.read(orderProvider(tab).notifier).updateOrderInCache(updatedOrder);
            }
          }
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('✅ Thanh toán thành công!'), backgroundColor: Colors.green),
          );
          onSuccess?.call(updatedOrder);
        }
      }
    } catch (e) {
      if (context.mounted) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Lỗi: $e'), backgroundColor: Colors.red),
        );
      }
    }
  }

  static Future<void> handleZalopayPayment(
      BuildContext context, WidgetRef ref, Order order, Function(Order)? onSuccess) async {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (_) => const Center(child: CircularProgressIndicator(color: Color(0xFFFF6B35))),
    );

    try {
      final result = await PaymentService.createZalopayPayment(order.id);
      if (!context.mounted) return;
      Navigator.pop(context);

      if (result != null) {
        final paymentResult = await Navigator.pushNamed(
          context,
          AppRoutes.zalopayPayment,
          arguments: {
            'orderId': order.id,
            'orderUrl': result['orderUrl'],
            'amount': order.totalPrice,
            'zpTransToken': result['zpTransToken'],
          },
        );

        if (paymentResult == true && context.mounted) {
          final updatedOrder = await OrderService.getOrderById(order.id);
          final tabs = ['Tất cả', 'Chờ xác nhận', 'Đã xác nhận', 'Đang giao', 'Đã giao', 'Đã hủy'];
          for (var tab in tabs) {
            if (ref.exists(orderProvider(tab))) {
              ref.read(orderProvider(tab).notifier).updateOrderInCache(updatedOrder);
            }
          }
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('✅ Thanh toán thành công!'), backgroundColor: Colors.green),
          );
          onSuccess?.call(updatedOrder);
        }
      }
    } catch (e) {
      if (context.mounted) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Lỗi: $e'), backgroundColor: Colors.red),
        );
      }
    }
  }
  static Future<void> handlePayosPayment(
      BuildContext context, WidgetRef ref, Order order, Function(Order)? onSuccess) async {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (_) => const Center(child: CircularProgressIndicator(color: Color(0xFF00C853))),
    );

    try {
      final payosData = await PaymentService.createPayosPayment(order.id);
      if (!context.mounted) return;
      Navigator.pop(context); // close loading

      if (payosData != null) {
        final paymentResult = await Navigator.pushNamed(
          context,
          AppRoutes.payosPayment,
          arguments: {
            'orderId': order.id,
            'qrCode': payosData['qrCode'],
            'checkoutUrl': payosData['checkoutUrl'],
            'amount': payosData['amount'],
            'accountNumber': payosData['accountNumber'],
            'accountName': payosData['accountName'],
            'description': payosData['description'],
          },
        );

        if (paymentResult == true && context.mounted) {
          final updatedOrder = await OrderService.getOrderById(order.id);
          final tabs = ['Tất cả', 'Chờ xác nhận', 'Đã xác nhận', 'Đang giao', 'Đã giao', 'Đã hủy'];
          for (var tab in tabs) {
            if (ref.exists(orderProvider(tab))) {
              ref.read(orderProvider(tab).notifier).updateOrderInCache(updatedOrder);
            }
          }
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('✅ Thanh toán PayOS thành công!'), backgroundColor: Colors.green),
          );
          onSuccess?.call(updatedOrder);
        }
      } else {
        if (context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('❌ Không thể tạo mã QR PayOS. Vui lòng thử lại!'), backgroundColor: Colors.red),
          );
        }
      }
    } catch (e) {
      if (context.mounted) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Lỗi: $e'), backgroundColor: Colors.red),
        );
      }
    }
  }

  static Color getStatusColor(String status) {
    switch (status) {
      case 'Chờ xác nhận': return Colors.orange;
      case 'Đã xác nhận': return Colors.blue;
      case 'Đang giao': return Colors.purple;
      case 'Đã giao':
      case 'Thành công': return Colors.green;
      case 'Đã hủy': return Colors.red;
      default: return Colors.grey;
    }
  }

  static IconData getStatusIcon(String status) {
    switch (status) {
      case 'Chờ xác nhận': return Icons.schedule;
      case 'Đã xác nhận': return Icons.check_circle_outline;
      case 'Đang giao': return Icons.local_shipping_outlined;
      case 'Đã giao':
      case 'Thành công': return Icons.check_circle;
      case 'Đã hủy': return Icons.cancel;
      default: return Icons.info_outline;
    }
  }

  static String getStatusDescription(String status) {
    switch (status) {
      case 'Chờ xác nhận': return 'Đơn hàng đang chờ được xác nhận';
      case 'Đã xác nhận': return 'Đơn hàng đã được xác nhận';
      case 'Đang giao': return 'Đơn hàng đang trên đường giao';
      case 'Đã giao': return 'Đơn hàng đã được giao thành công';
      case 'Thành công': return 'Giao dịch hoàn tất';
      case 'Đã hủy': return 'Đơn hàng đã bị hủy';
      default: return '';
    }
  }
}
