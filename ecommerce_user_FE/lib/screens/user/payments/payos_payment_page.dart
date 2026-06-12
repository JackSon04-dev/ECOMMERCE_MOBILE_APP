import 'dart:async';
import 'package:flutter/material.dart';
import '../../../utils/currency_helper.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../services/payment_service.dart';

class PayosPaymentPage extends StatefulWidget {
  final String orderId;
  final String qrCode;
  final String checkoutUrl;
  final double amount;
  final String accountNumber;
  final String accountName;
  final String description;

  const PayosPaymentPage({
    super.key,
    required this.orderId,
    required this.qrCode,
    required this.checkoutUrl,
    required this.amount,
    required this.accountNumber,
    required this.accountName,
    required this.description,
  });

  @override
  State<PayosPaymentPage> createState() => _PayosPaymentPageState();
}

class _PayosPaymentPageState extends State<PayosPaymentPage> with WidgetsBindingObserver {
  bool _isChecking = false;
  bool? _paymentResult;
  Timer? _timer;
  bool _hasOpenedBrowser = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _startPollingPaymentStatus();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _timer?.cancel();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed && _hasOpenedBrowser && _paymentResult == null) {
      _checkPaymentStatus(isAuto: false);
    }
  }

  void _startPollingPaymentStatus() {
    // Chạy định kỳ sau mỗi 5 giây
    _timer = Timer.periodic(const Duration(seconds: 5), (timer) async {
      await _checkPaymentStatus(isAuto: true);
    });
  }

  Future<void> _openPaymentUrl() async {
    try {
      final uri = Uri.parse(widget.checkoutUrl);
      final launched = await launchUrl(uri, mode: LaunchMode.externalApplication);
      if (launched) {
        setState(() => _hasOpenedBrowser = true);
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Không thể mở web PayOS. Vui lòng quét mã QR.')),
          );
        }
      }
    } catch (e) {
      print('❌ Open URL error: $e');
    }
  }

  /// Kiểm tra trạng thái thanh toán từ backend
  Future<void> _checkPaymentStatus({bool isAuto = false}) async {
    if (_isChecking || _paymentResult == true) return;
    
    if (!isAuto && mounted) {
      setState(() => _isChecking = true);
    }

    try {
      final isPaid = await PaymentService.checkPaymentStatus(widget.orderId);

      if (isPaid && mounted) {
        _timer?.cancel();
        setState(() {
          _paymentResult = true;
          _isChecking = false;
        });
      } else if (!isAuto && mounted) {
        setState(() => _isChecking = false);
      }
    } catch (e) {
      if (mounted && !isAuto) {
        setState(() => _isChecking = false);
        ScaffoldMessenger.of(context).showSnackBar(
           const SnackBar(content: Text('Không thể kiểm tra đơn hàng lúc này')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        title: const Text('Thanh toán VietQR'),
        backgroundColor: Colors.white,
        foregroundColor: Colors.black,
        elevation: 1,
        leading: IconButton(
           icon: const Icon(Icons.arrow_back),
           onPressed: () => Navigator.pop(context, _paymentResult == true),
        ),
      ),
      body: SafeArea(
        child: _paymentResult == null || _paymentResult == false
            ? _buildPaymentView()
            : _buildSuccessView(),
      ),
    );
  }

  Widget _buildPaymentView() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
         crossAxisAlignment: CrossAxisAlignment.center,
         children: [
            const SizedBox(height: 12),
            const Text(
              'Thanh toán qua PayOS',
              style: TextStyle(
                 fontSize: 20,
                 fontWeight: FontWeight.bold,
                 color: Colors.black87,
              ),
            ),
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: const Color(0xFFF8F9FA),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: Colors.green.withValues(alpha: 0.2)),
              ),
              child: Column(
                children: [
                   _buildInfoRow('Số tài khoản:', widget.accountNumber, isBold: true),
                   const SizedBox(height: 8),
                   _buildInfoRow('Tên tài khoản:', widget.accountName),
                   const Padding(
                     padding: EdgeInsets.symmetric(vertical: 12),
                     child: Divider(height: 1),
                   ),
                   Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Nội dung:', style: TextStyle(color: Colors.grey)),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          widget.description,
                          textAlign: TextAlign.right,
                          style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.black87),
                        ),
                      ),
                    ],
                  ),
                  const Padding(
                    padding: EdgeInsets.symmetric(vertical: 12),
                    child: Divider(height: 1),
                  ),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Số tiền:', style: TextStyle(color: Colors.grey, fontSize: 16)),
                      Text(
                        widget.amount.toVND(),
                        style: const TextStyle(
                          fontSize: 22,
                          fontWeight: FontWeight.bold,
                          color: Color(0xFF00B14F),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),
            const Text(
              'Quét mã VietQR bằng ứng dụng Ngân hàng để thanh toán đơn hàng này.',
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.grey, fontSize: 13),
            ),
            const SizedBox(height: 24),
            
            // Vẽ QR Code VietQR
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.1),
                    blurRadius: 20,
                    spreadRadius: 5,
                  )
                ]
              ),
              child: QrImageView(
                data: widget.qrCode,
                version: QrVersions.auto,
                size: 220.0,
                backgroundColor: Colors.white,
              ),
            ),
            
            const SizedBox(height: 48),

            SizedBox(
               width: double.infinity,
               child: ElevatedButton.icon(
                  onPressed: _openPaymentUrl,
                  icon: const Icon(Icons.open_in_browser),
                  label: const Text('Mở trang thanh toán Web PayOS', style: TextStyle(fontSize: 15)),
                  style: ElevatedButton.styleFrom(
                     backgroundColor: const Color(0xFF00B14F),
                     foregroundColor: Colors.white,
                     padding: const EdgeInsets.symmetric(vertical: 14),
                     shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
               ),
            ),
            const SizedBox(height: 16),

            if (_isChecking)
               const Column(
                 children: [
                   CircularProgressIndicator(color: Color(0xFFFF6B35)),
                   SizedBox(height: 16),
                   Text('Đang kiểm tra giao dịch...', style: TextStyle(color: Colors.grey))
                 ],
               )
            else
               SizedBox(
                 width: double.infinity,
                 child: OutlinedButton.icon(
                    onPressed: () => _checkPaymentStatus(isAuto: false),
                    icon: const Icon(Icons.refresh),
                    label: const Text('Kiểm tra trạng thái'),
                    style: OutlinedButton.styleFrom(
                       padding: const EdgeInsets.symmetric(vertical: 14),
                       foregroundColor: const Color(0xFFFF6B35),
                       side: const BorderSide(color: Color(0xFFFF6B35)),
                       shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12)
                       )
                    ),
                 ),
               ),
         ],
      ),
    );
  }

  Widget _buildInfoRow(String label, String value, {bool isBold = false}) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: const TextStyle(color: Colors.grey)),
        Text(
          value,
          style: TextStyle(
            fontWeight: isBold ? FontWeight.bold : FontWeight.w500, 
            letterSpacing: isBold ? 1 : 0
          ),
        ),
      ],
    );
  }

  Widget _buildSuccessView() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: Colors.green.withValues(alpha: 0.1),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.check_circle, size: 72, color: Colors.green),
            ),
            const SizedBox(height: 24),
            const Text(
              'Thanh toán thành công!',
              style: TextStyle(
                fontSize: 22,
                fontWeight: FontWeight.bold,
                color: Colors.green,
              ),
            ),
            const SizedBox(height: 12),
            Text(
              'Đơn hàng của bạn đã được thanh toán thông qua PayOS (VietQR).\n'
              'Chúng tôi sẽ xử lý đơn hàng sớm nhất.',
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.grey[600], fontSize: 14, height: 1.5),
            ),
            const SizedBox(height: 32),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () => Navigator.pop(context, true),
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.green,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                  elevation: 0,
                ),
                child: const Text('Hoàn tất', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
