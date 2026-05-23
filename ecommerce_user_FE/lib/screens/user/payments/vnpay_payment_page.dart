import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../services/payment_service.dart';

/// 💳 VNPay Payment Page
/// Hiển thị trạng thái thanh toán VNPay
/// Mở trình duyệt để user thanh toán → quay lại app kiểm tra kết quả
class VnpayPaymentPage extends StatefulWidget {
  final String orderId;
  final String paymentUrl;

  const VnpayPaymentPage({
    super.key,
    required this.orderId,
    required this.paymentUrl,
  });

  @override
  State<VnpayPaymentPage> createState() => _VnpayPaymentPageState();
}

class _VnpayPaymentPageState extends State<VnpayPaymentPage>
    with WidgetsBindingObserver {
  bool _isChecking = false;
  bool? _paymentResult; // null = chưa kiểm tra, true = thành công, false = thất bại
  bool _hasOpenedBrowser = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    // Tự động mở trình duyệt khi vào trang
    _openPaymentUrl();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  /// Khi user quay lại app từ trình duyệt → tự động kiểm tra thanh toán
  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed && _hasOpenedBrowser && _paymentResult == null) {
      _checkPaymentStatus();
    }
  }

  /// Mở URL thanh toán VNPay trên trình duyệt
  Future<void> _openPaymentUrl() async {
    try {
      final uri = Uri.parse(widget.paymentUrl);
      final launched = await launchUrl(uri, mode: LaunchMode.externalApplication);

      if (launched) {
        setState(() => _hasOpenedBrowser = true);
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Không thể mở trình duyệt. Vui lòng thử lại.'),
              backgroundColor: Colors.red,
            ),
          );
        }
      }
    } catch (e) {
      print('❌ [VnpayPaymentPage] Open URL error: $e');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Lỗi: $e'), backgroundColor: Colors.red),
        );
      }
    }
  }

  /// Kiểm tra trạng thái thanh toán từ backend
  Future<void> _checkPaymentStatus() async {
    if (_isChecking) return;

    setState(() => _isChecking = true);

    try {
      final isPaid = await PaymentService.checkPaymentStatus(widget.orderId);

      if (mounted) {
        setState(() {
          _paymentResult = isPaid;
          _isChecking = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _paymentResult = false;
          _isChecking = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.grey[50],
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios, color: Colors.black87),
          onPressed: () => Navigator.pop(context, _paymentResult == true),
        ),
        title: const Text(
          'Thanh toán VNPay',
          style: TextStyle(
            color: Colors.black87,
            fontSize: 18,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
      body: _paymentResult == null
          ? _buildWaitingView()
          : _paymentResult == true
              ? _buildSuccessView()
              : _buildFailedView(),
    );
  }

  /// ─── WAITING VIEW: Đang chờ user thanh toán trên trình duyệt ──────────
  Widget _buildWaitingView() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            // Icon
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: const Color(0xFFFF6B35).withValues(alpha: 0.1),
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.account_balance,
                size: 64,
                color: Color(0xFFFF6B35),
              ),
            ),
            const SizedBox(height: 24),

            const Text(
              'Đang chờ thanh toán',
              style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 12),

            Text(
              'Trang thanh toán VNPay đã được mở trên trình duyệt.\n'
              'Vui lòng hoàn tất thanh toán và quay lại đây.',
              textAlign: TextAlign.center,
              style: TextStyle(
                color: Colors.grey[600],
                fontSize: 14,
                height: 1.5,
              ),
            ),

            const SizedBox(height: 32),

            // Loading indicator
            if (_isChecking)
              const Column(
                children: [
                  CircularProgressIndicator(color: Color(0xFFFF6B35)),
                  SizedBox(height: 16),
                  Text(
                    'Đang kiểm tra thanh toán...',
                    style: TextStyle(color: Colors.grey),
                  ),
                ],
              )
            else ...[
              // Nút mở lại trang thanh toán
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: _openPaymentUrl,
                  icon: const Icon(Icons.open_in_browser),
                  label: const Text(
                    'Mở lại trang thanh toán',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
                  ),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFFFF6B35),
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                    elevation: 0,
                  ),
                ),
              ),
              const SizedBox(height: 12),

              // Nút kiểm tra thủ công
              SizedBox(
                width: double.infinity,
                child: OutlinedButton.icon(
                  onPressed: _checkPaymentStatus,
                  icon: const Icon(Icons.refresh),
                  label: const Text(
                    'Kiểm tra thanh toán',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
                  ),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: const Color(0xFFFF6B35),
                    side: const BorderSide(color: Color(0xFFFF6B35)),
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  /// ─── SUCCESS VIEW: Thanh toán thành công ────────────────────────────────
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
              'Đơn hàng của bạn đã được thanh toán qua VNPay.\n'
              'Chúng tôi sẽ xử lý đơn hàng sớm nhất.',
              textAlign: TextAlign.center,
              style: TextStyle(
                color: Colors.grey[600],
                fontSize: 14,
                height: 1.5,
              ),
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
                child: const Text(
                  'Hoàn tất',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  /// ─── FAILED VIEW: Thanh toán thất bại ───────────────────────────────────
  Widget _buildFailedView() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: Colors.red.withValues(alpha: 0.1),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.cancel, size: 72, color: Colors.red),
            ),
            const SizedBox(height: 24),

            const Text(
              'Thanh toán chưa hoàn tất',
              style: TextStyle(
                fontSize: 22,
                fontWeight: FontWeight.bold,
                color: Colors.red,
              ),
            ),
            const SizedBox(height: 12),

            Text(
              'Giao dịch chưa được xác nhận.\n'
              'Bạn có thể thử lại hoặc thanh toán sau trong chi tiết đơn hàng.',
              textAlign: TextAlign.center,
              style: TextStyle(
                color: Colors.grey[600],
                fontSize: 14,
                height: 1.5,
              ),
            ),

            const SizedBox(height: 32),

            // Thử lại
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: () {
                  setState(() => _paymentResult = null);
                  _openPaymentUrl();
                },
                icon: const Icon(Icons.refresh),
                label: const Text(
                  'Thử thanh toán lại',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
                ),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFFFF6B35),
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                  elevation: 0,
                ),
              ),
            ),
            const SizedBox(height: 12),

            // Thanh toán sau
            SizedBox(
              width: double.infinity,
              child: TextButton(
                onPressed: () => Navigator.pop(context, false),
                child: const Text(
                  'Thanh toán sau',
                  style: TextStyle(color: Colors.grey, fontSize: 14),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

