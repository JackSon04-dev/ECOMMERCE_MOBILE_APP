import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../config/routes.dart';

/// 🛒 Reorder Result Bottom Sheet
/// Hiển thị kết quả mua lại với animation đẹp
/// Dùng chung cho cả OrdersPage và OrderDetailPage
class ReorderResultSheet extends StatelessWidget {
  final List<String> added;
  final List<String> outOfStock;
  final List<String> failed;

  const ReorderResultSheet({
    super.key,
    required this.added,
    required this.outOfStock,
    required this.failed,
  });

  /// Show the bottom sheet - gọi hàm này thay vì showDialog
  static Future<void> show(
    BuildContext context, {
    required List<String> added,
    required List<String> outOfStock,
    required List<String> failed,
  }) {
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => ReorderResultSheet(
        added: added,
        outOfStock: outOfStock,
        failed: failed,
      ),
    );
  }

  bool get _hasAdded => added.isNotEmpty;
  int get _total => added.length + outOfStock.length + failed.length;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
      ),
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(context).viewInsets.bottom + 24,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // ── Drag handle ──────────────────────────────────
          Container(
            margin: const EdgeInsets.only(top: 12, bottom: 8),
            width: 40,
            height: 4,
            decoration: BoxDecoration(
              color: Colors.grey[300],
              borderRadius: BorderRadius.circular(2),
            ),
          ),

          // ── Icon & tiêu đề ───────────────────────────────
          const SizedBox(height: 8),
          _buildHeader().animate().scale(
                duration: 400.ms,
                curve: Curves.elasticOut,
                begin: const Offset(0.6, 0.6),
                end: const Offset(1.0, 1.0),
              ),

          const SizedBox(height: 20),

          // ── Summary chips ────────────────────────────────
          _buildSummaryChips()
              .animate()
              .fadeIn(delay: 150.ms, duration: 350.ms)
              .slideY(begin: 0.2, end: 0),

          const SizedBox(height: 20),

          // ── Danh sách sản phẩm ───────────────────────────
          if (_total > 0)
            ConstrainedBox(
              constraints: BoxConstraints(
                maxHeight: MediaQuery.of(context).size.height * 0.35,
              ),
              child: SingleChildScrollView(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (added.isNotEmpty)
                      _buildSection(
                        icon: Icons.check_circle_rounded,
                        color: const Color(0xFF22C55E),
                        bgColor: const Color(0xFFDCFCE7),
                        label: 'Đã thêm vào giỏ',
                        items: added,
                        delay: 200,
                      ),
                    if (outOfStock.isNotEmpty)
                      _buildSection(
                        icon: Icons.remove_shopping_cart_rounded,
                        color: const Color(0xFFEF4444),
                        bgColor: const Color(0xFFFEE2E2),
                        label: 'Hết hàng',
                        items: outOfStock,
                        delay: 300,
                      ),
                    if (failed.isNotEmpty)
                      _buildSection(
                        icon: Icons.error_outline_rounded,
                        color: Colors.grey,
                        bgColor: const Color(0xFFF3F4F6),
                        label: 'Không thể thêm',
                        items: failed,
                        delay: 400,
                      ),
                  ],
                ),
              ),
            ),

          const SizedBox(height: 24),

          // ── Nút hành động ────────────────────────────────
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: _buildActions(context)
                .animate()
                .fadeIn(delay: 350.ms, duration: 350.ms)
                .slideY(begin: 0.3, end: 0),
          ),
        ],
      ),
    );
  }

  Widget _buildHeader() {
    final allOutOfStock = added.isEmpty && outOfStock.isNotEmpty;

    return Column(
      children: [
        // Vòng tròn icon
        Container(
          width: 72,
          height: 72,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: _hasAdded
                ? const Color(0xFFFF6B35).withValues(alpha: 0.12)
                : Colors.orange.withValues(alpha: 0.12),
          ),
          child: Icon(
            _hasAdded
                ? Icons.shopping_cart_checkout_rounded
                : allOutOfStock
                    ? Icons.remove_shopping_cart_rounded
                    : Icons.warning_amber_rounded,
            size: 36,
            color: _hasAdded ? const Color(0xFFFF6B35) : Colors.orange,
          ),
        ),
        const SizedBox(height: 12),
        Text(
          _hasAdded
              ? added.length == _total
                  ? 'Đã thêm tất cả vào giỏ! 🎉'
                  : 'Thêm vào giỏ thành công'
              : 'Không thể mua lại',
          style: const TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.w700,
            color: Color(0xFF1A1A1A),
          ),
        ),
        const SizedBox(height: 4),
        Text(
          _hasAdded
              ? '${added.length}/${_total} sản phẩm đã được thêm vào giỏ'
              : 'Tất cả sản phẩm hiện đã hết hàng',
          style: TextStyle(
            fontSize: 13,
            color: Colors.grey[500],
          ),
        ),
      ],
    );
  }

  Widget _buildSummaryChips() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        if (added.isNotEmpty)
          _chip(
            label: '${added.length} Thêm được',
            icon: Icons.check_circle_rounded,
            color: const Color(0xFF22C55E),
            bg: const Color(0xFFDCFCE7),
          ),
        if (added.isNotEmpty && outOfStock.isNotEmpty)
          const SizedBox(width: 8),
        if (outOfStock.isNotEmpty)
          _chip(
            label: '${outOfStock.length} Hết hàng',
            icon: Icons.cancel_rounded,
            color: const Color(0xFFEF4444),
            bg: const Color(0xFFFEE2E2),
          ),
        if (failed.isNotEmpty) ...[
          const SizedBox(width: 8),
          _chip(
            label: '${failed.length} Lỗi',
            icon: Icons.error_rounded,
            color: Colors.grey,
            bg: const Color(0xFFF3F4F6),
          ),
        ],
      ],
    );
  }

  Widget _chip({
    required String label,
    required IconData icon,
    required Color color,
    required Color bg,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: color),
          const SizedBox(width: 4),
          Text(
            label,
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w600,
              color: color,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSection({
    required IconData icon,
    required Color color,
    required Color bgColor,
    required String label,
    required List<String> items,
    required int delay,
  }) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Section header
          Row(
            children: [
              Icon(icon, size: 16, color: color),
              const SizedBox(width: 6),
              Text(
                label,
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                  color: color,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          // Items
          ...items.asMap().entries.map((entry) {
            final i = entry.key;
            final name = entry.value;
            return Padding(
              padding: const EdgeInsets.only(bottom: 6),
              child: Container(
                width: double.infinity,
                padding:
                    const EdgeInsets.symmetric(horizontal: 12, vertical: 9),
                decoration: BoxDecoration(
                  color: bgColor,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Row(
                  children: [
                    Container(
                      width: 6,
                      height: 6,
                      decoration: BoxDecoration(
                        color: color,
                        shape: BoxShape.circle,
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        name,
                        style: TextStyle(
                          fontSize: 13,
                          color: color == Colors.grey
                              ? Colors.grey[600]
                              : Colors.grey[800],
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ),
                  ],
                ),
              )
                  .animate()
                  .fadeIn(
                    delay: Duration(milliseconds: delay + i * 60),
                    duration: 300.ms,
                  )
                  .slideX(begin: 0.15, end: 0),
            );
          }),
        ],
      ),
    );
  }

  Widget _buildActions(BuildContext context) {
    if (_hasAdded) {
      return Column(
        children: [
          // Nút Xem giỏ hàng — primary
          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              onPressed: () {
                Navigator.pop(context);
                Navigator.pushNamed(context, AppRoutes.cart);
              },
              icon: const Icon(Icons.shopping_cart_rounded, size: 18),
              label: const Text(
                'Xem giỏ hàng',
                style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700),
              ),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFFFF6B35),
                foregroundColor: Colors.white,
                elevation: 0,
                padding: const EdgeInsets.symmetric(vertical: 15),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(14),
                ),
              ),
            ),
          ),
          const SizedBox(height: 10),
          // Nút Đóng — secondary
          SizedBox(
            width: double.infinity,
            child: TextButton(
              onPressed: () => Navigator.pop(context),
              style: TextButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(14),
                  side: BorderSide(color: Colors.grey[300]!),
                ),
              ),
              child: Text(
                'Đóng',
                style: TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w600,
                  color: Colors.grey[600],
                ),
              ),
            ),
          ),
        ],
      );
    }

    // Không có sp nào thêm được → chỉ hiện nút Đóng
    return SizedBox(
      width: double.infinity,
      child: ElevatedButton(
        onPressed: () => Navigator.pop(context),
        style: ElevatedButton.styleFrom(
          backgroundColor: Colors.grey[100],
          foregroundColor: Colors.grey[700],
          elevation: 0,
          padding: const EdgeInsets.symmetric(vertical: 15),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(14),
          ),
        ),
        child: const Text(
          'Đóng',
          style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600),
        ),
      ),
    );
  }
}

