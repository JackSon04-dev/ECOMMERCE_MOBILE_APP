import 'package:flutter/material.dart';

// ═══════════════════════════════════════════════════════════════════
// 📐 SizeGuideSheet — Bảng hướng dẫn size (chỉ xem, không chọn)
//
// Cách dùng:
//   SizeGuideSheet.show(context);
//   SizeGuideSheet.show(context, initialCategory: SizeCategory.shoes);
// ═══════════════════════════════════════════════════════════════════

enum SizeCategory { shoes, clothes }

class SizeGuideSheet extends StatefulWidget {
  final SizeCategory initialCategory;

  const SizeGuideSheet({
    super.key,
    this.initialCategory = SizeCategory.clothes,
  });

  static Future<void> show(
    BuildContext context, {
    SizeCategory initialCategory = SizeCategory.clothes,
  }) {
    return showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      transitionAnimationController: AnimationController(
        vsync: Navigator.of(context),
        duration: const Duration(milliseconds: 400),
      ),
      builder: (_) => SizeGuideSheet(initialCategory: initialCategory),
    );
  }

  @override
  State<SizeGuideSheet> createState() => _SizeGuideSheetState();
}

class _SizeGuideSheetState extends State<SizeGuideSheet>
    with SingleTickerProviderStateMixin {
  late SizeCategory _category;
  late AnimationController _tabController;

  static const _shoesSizes = [
    _SizeInfo('39', '24.5 cm', '6'),
    _SizeInfo('40', '25.5 cm', '7'),
    _SizeInfo('41', '26.0 cm', '7.5'),
    _SizeInfo('42', '27.0 cm', '8'),
  ];

  static const _clothesSizes = [
    _SizeInfo('M',  '88–92 cm',  '72–76 cm'),
    _SizeInfo('L',  '92–96 cm',  '76–80 cm'),
    _SizeInfo('XL', '96–100 cm', '80–84 cm'),
  ];

  @override
  void initState() {
    super.initState();
    _category = widget.initialCategory;
    _tabController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 280),
      value: _category == SizeCategory.clothes ? 1.0 : 0.0,
    );
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  void _switchCategory(SizeCategory cat) {
    if (_category == cat) return;
    setState(() => _category = cat);
    cat == SizeCategory.clothes
        ? _tabController.forward()
        : _tabController.reverse();
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
      ),
      child: SafeArea(
        top: false,
        child: Column(
          mainAxisSize: MainAxisSize.min, // Đặt kích thước theo nội dung để không cần scroll
          children: [
            _buildDragHandle(),
            _buildHeader(),
            _buildTabBar(),
            const SizedBox(height: 20),
            _buildSizeChips(),
            const SizedBox(height: 20),
            _buildMeasureTable(),
            const SizedBox(height: 32), // Padding cuối trang
          ],
        ),
      ),
    );
  }

  Widget _buildDragHandle() => Padding(
        padding: const EdgeInsets.only(top: 12, bottom: 4),
        child: Container(
          width: 40,
          height: 4,
          decoration: BoxDecoration(
            color: Colors.grey[300],
            borderRadius: BorderRadius.circular(2),
          ),
        ),
      );

  Widget _buildHeader() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 12, 12, 0),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: const Color(0xFFFF6B35).withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(10),
            ),
            child: const Icon(Icons.straighten_rounded,
                color: Color(0xFFFF6B35), size: 20),
          ),
          const SizedBox(width: 12),
          const Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Bảng hướng dẫn size',
                  style: TextStyle(
                      fontSize: 17,
                      fontWeight: FontWeight.w700,
                      color: Colors.black87)),
              Text('Tham khảo để chọn size phù hợp',
                  style: TextStyle(fontSize: 12, color: Colors.grey)),
            ],
          ),
          const Spacer(),
          IconButton(
            icon: const Icon(Icons.close_rounded, color: Colors.grey),
            onPressed: () => Navigator.pop(context),
          ),
        ],
      ),
    );
  }

  Widget _buildTabBar() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 18, 20, 0),
      child: Container(
        height: 44,
        decoration: BoxDecoration(
          color: Colors.grey[100],
          borderRadius: BorderRadius.circular(12),
        ),
        child: AnimatedBuilder(
          animation: _tabController,
          builder: (_, __) => Stack(
            children: [
              // Sliding pill
              AnimatedAlign(
                duration: const Duration(milliseconds: 280),
                curve: Curves.easeInOutCubic,
                alignment: _category == SizeCategory.shoes
                    ? Alignment.centerLeft
                    : Alignment.centerRight,
                child: FractionallySizedBox(
                  widthFactor: 0.5,
                  child: Container(
                    margin: const EdgeInsets.all(4),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(9),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.08),
                          blurRadius: 8,
                          offset: const Offset(0, 2),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
              Row(children: [
                _tabItem('👟  Giày', SizeCategory.shoes),
                _tabItem('👕  Quần áo', SizeCategory.clothes),
              ]),
            ],
          ),
        ),
      ),
    );
  }

  Widget _tabItem(String label, SizeCategory cat) {
    final active = _category == cat;
    return Expanded(
      child: GestureDetector(
        onTap: () => _switchCategory(cat),
        behavior: HitTestBehavior.opaque,
        child: AnimatedDefaultTextStyle(
          duration: const Duration(milliseconds: 250),
          style: TextStyle(
            fontSize: 14,
            fontWeight: active ? FontWeight.w700 : FontWeight.w500,
            color: active ? const Color(0xFFFF6B35) : Colors.grey[500],
          ),
          child: Center(child: Text(label)),
        ),
      ),
    );
  }

  Widget _buildSizeChips() {
    final items =
        _category == SizeCategory.shoes ? _shoesSizes : _clothesSizes;
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            _category == SizeCategory.shoes
                ? 'Các size giày'
                : 'Các size quần áo',
            style: const TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: Colors.black54),
          ),
          const SizedBox(height: 12),
          // AnimatedSwitcher để slide khi đổi tab
          AnimatedSwitcher(
            duration: const Duration(milliseconds: 250),
            switchInCurve: Curves.easeOutCubic,
            switchOutCurve: Curves.easeInCubic,
            transitionBuilder: (child, anim) => FadeTransition(
              opacity: anim,
              child: SlideTransition(
                position: Tween<Offset>(
                  begin: const Offset(0.06, 0),
                  end: Offset.zero,
                ).animate(anim),
                child: child,
              ),
            ),
            child: Wrap(
              key: ValueKey(_category),
              spacing: 10,
              runSpacing: 10,
              children: items.map((s) => _SizeChip(info: s)).toList(),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMeasureTable() {
    final isShoes = _category == SizeCategory.shoes;
    final headers =
        isShoes ? ['Size', 'Dài bàn chân', 'EU Size'] : ['Size', 'Ngực', 'Eo'];
    final rows = isShoes ? _shoesSizes : _clothesSizes;

    return AnimatedSwitcher(
      duration: const Duration(milliseconds: 250),
      child: Padding(
        key: ValueKey(_category),
        padding: const EdgeInsets.symmetric(horizontal: 20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(children: [
              Icon(Icons.info_outline_rounded,
                  size: 13, color: Colors.grey[500]),
              const SizedBox(width: 6),
              Text('Số đo tham khảo',
                  style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: Colors.grey[600])),
            ]),
            const SizedBox(height: 10),
            ClipRRect(
              borderRadius: BorderRadius.circular(12),
              child: Table(
                border: TableBorder.all(
                  color: Colors.grey[200]!,
                  width: 1,
                  borderRadius: BorderRadius.circular(12),
                ),
                children: [
                  TableRow(
                    decoration: BoxDecoration(
                      color: const Color(0xFFFF6B35).withValues(alpha: 0.08),
                    ),
                    children: headers.map((h) => _cell(h, isHeader: true)).toList(),
                  ),
                  ...rows.map(
                    (s) => TableRow(
                      decoration: const BoxDecoration(color: Colors.white),
                      children: [_cell(s.size), _cell(s.col1), _cell(s.col2)],
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _cell(String text, {bool isHeader = false}) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 11, horizontal: 8),
        child: Text(
          text,
          textAlign: TextAlign.center,
          style: TextStyle(
            fontSize: isHeader ? 12 : 13,
            fontWeight: isHeader ? FontWeight.w700 : FontWeight.w400,
            color: isHeader ? const Color(0xFFFF6B35) : Colors.black87,
          ),
        ),
      );
}

// ── Chip chỉ để xem ──────────────────────────────────────────────
class _SizeChip extends StatelessWidget {
  final _SizeInfo info;
  const _SizeChip({required this.info});

  @override
  Widget build(BuildContext context) {
    return Container(
      constraints: const BoxConstraints(minWidth: 68),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 11),
      decoration: BoxDecoration(
        color: Colors.grey[50],
        border: Border.all(color: Colors.grey[300]!),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(info.size,
              style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w700,
                  color: Colors.black87)),
          const SizedBox(height: 2),
          Text(info.col1,
              style: TextStyle(fontSize: 10, color: Colors.grey[500])),
        ],
      ),
    );
  }
}

class _SizeInfo {
  final String size;
  final String col1;
  final String col2;
  const _SizeInfo(this.size, this.col1, this.col2);
}

