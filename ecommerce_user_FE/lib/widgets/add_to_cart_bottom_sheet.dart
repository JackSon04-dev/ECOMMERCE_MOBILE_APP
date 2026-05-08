import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../models/product_model.dart';
import '../providers/cart_provider.dart';
import 'add_to_cart_animation.dart';
import 'common_widgets.dart';

import 'package:flutter_riverpod/flutter_riverpod.dart';

/// 🛒 Bottom Sheet chọn màu và size trước khi thêm vào giỏ hàng
class AddToCartBottomSheet extends ConsumerStatefulWidget {
  final Product product;

  const AddToCartBottomSheet({super.key, required this.product});

  static Future<void> show(BuildContext context, Product product) {
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => AddToCartBottomSheet(product: product),
    );
  }

  @override
  ConsumerState<AddToCartBottomSheet> createState() => _AddToCartBottomSheetState();
}

class _AddToCartBottomSheetState extends ConsumerState<AddToCartBottomSheet> {
  String? _selectedColor;
  String? _selectedSize;
  int _quantity = 1;

  @override
  void initState() {
    super.initState();
    // Chọn màu và size mặc định
    if (widget.product.colorVariants.isNotEmpty) {
      _selectedColor = widget.product.colorVariants.first.color;
      if (widget.product.colorVariants.first.sizes.isNotEmpty) {
        _selectedSize = widget.product.colorVariants.first.sizes.first.size;
      }
    }
  }

  List<String> get _availableSizes {
    if (_selectedColor == null) return [];
    final colorVariant = widget.product.colorVariants.firstWhere(
      (v) => v.color == _selectedColor,
      orElse: () => widget.product.colorVariants.first,
    );
    return colorVariant.sizes.map((s) => s.size).toList();
  }

  int get _currentStock {
    if (_selectedColor == null || _selectedSize == null) return 0;
    return widget.product.getStockByVariant(_selectedColor!, _selectedSize!);
  }

  String _formatCurrency(double amount) {
    final formatter = NumberFormat.currency(
      locale: 'vi_VN',
      symbol: '₫',
      decimalDigits: 0,
    );
    return formatter.format(amount);
  }

  void _addToCart() {
    if (_selectedColor == null || _selectedSize == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Vui lòng chọn màu và size'),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }

    final success = ref.read(cartProvider.notifier).addItem(
      widget.product,
      _selectedColor!,
      _selectedSize!,
      quantity: _quantity,
    );

    if (!success) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            'Không đủ hàng trong kho. Còn lại: ${widget.product.getStockByVariant(_selectedColor!, _selectedSize!)}',
          ),
          backgroundColor: Colors.orange,
        ),
      );
      return;
    }

    Navigator.pop(context);

    AddToCartAnimation.showDialog(
      context,
      productName: widget.product.name,
      imageUrl: widget.product.thumbnail,
      quantity: _quantity,
    );
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(context).viewInsets.bottom,
      ),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header
            _buildHeader(),

            const Divider(height: 1),

            // Product info
            _buildProductInfo(),

            // Color selector
            if (widget.product.colorVariants.isNotEmpty) _buildColorSelector(),

            // Size selector
            if (_availableSizes.isNotEmpty) _buildSizeSelector(),

            // Quantity selector
            _buildQuantitySelector(),

            // Add to cart button
            _buildAddToCartButton(),

            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }

  Widget _buildHeader() {
    return Container(
      padding: const EdgeInsets.all(16),
      child: Row(
        children: [
          const Text(
            'Chọn phân loại',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
            ),
          ),
          const Spacer(),
          IconButton(
            icon: const Icon(Icons.close),
            onPressed: () => Navigator.pop(context),
          ),
        ],
      ),
    );
  }

  Widget _buildProductInfo() {
    return Container(
      padding: const EdgeInsets.all(16),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Product image
          ClipRRect(
            borderRadius: BorderRadius.circular(8),
            child: Image.network(
              widget.product.thumbnail,
              width: 100,
              height: 100,
              fit: BoxFit.cover,
              errorBuilder: (context, error, stackTrace) {
                return Container(
                  width: 100,
                  height: 100,
                  color: Colors.grey[200],
                  child: const Icon(Icons.image, color: Colors.grey),
                );
              },
            ),
          ),
          const SizedBox(width: 16),
          // Product details
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  widget.product.name,
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                  ),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Text(
                      _formatCurrency(widget.product.finalPrice),
                      style: const TextStyle(
                        color: Color(0xFFFF6B35),
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    if (widget.product.discount > 0) ...[
                      const SizedBox(width: 8),
                      Text(
                        _formatCurrency(widget.product.price),
                        style: TextStyle(
                          color: Colors.grey[500],
                          fontSize: 14,
                          decoration: TextDecoration.lineThrough,
                        ),
                      ),
                    ],
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  'Kho: ${_currentStock > 0 ? _currentStock : "Hết hàng"}',
                  style: TextStyle(
                    color: _currentStock > 0 ? Colors.green : Colors.red,
                    fontSize: 13,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildColorSelector() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Màu sắc: ${_selectedColor ?? ""}',
            style: const TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 10,
            runSpacing: 10,
            children: widget.product.colorVariants.map((variant) {
              final isSelected = _selectedColor == variant.color;
              return GestureDetector(
                onTap: () {
                  setState(() {
                    _selectedColor = variant.color;
                    // Reset size khi đổi màu
                    _selectedSize = variant.sizes.isNotEmpty
                        ? variant.sizes.first.size
                        : null;
                    _quantity = 1;
                  });
                },
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                  decoration: BoxDecoration(
                    color: isSelected
                        ? const Color(0xFFFF6B35).withOpacity(0.1)
                        : Colors.grey[100],
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(
                      color: isSelected
                          ? const Color(0xFFFF6B35)
                          : Colors.grey[300]!,
                      width: isSelected ? 2 : 1,
                    ),
                  ),
                  child: Text(
                    variant.color,
                    style: TextStyle(
                      color: isSelected
                          ? const Color(0xFFFF6B35)
                          : Colors.black87,
                      fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
                    ),
                  ),
                ),
              );
            }).toList(),
          ),
        ],
      ),
    );
  }

  Widget _buildSizeSelector() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Kích thước: ${_selectedSize ?? ""}',
            style: const TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 10,
            runSpacing: 10,
            children: _availableSizes.map((size) {
              final isSelected = _selectedSize == size;
              return GestureDetector(
                onTap: () {
                  setState(() {
                    _selectedSize = size;
                    _quantity = 1;
                  });
                },
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
                  decoration: BoxDecoration(
                    color: isSelected
                        ? const Color(0xFFFF6B35).withOpacity(0.1)
                        : Colors.grey[100],
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(
                      color: isSelected
                          ? const Color(0xFFFF6B35)
                          : Colors.grey[300]!,
                      width: isSelected ? 2 : 1,
                    ),
                  ),
                  child: Text(
                    size,
                    style: TextStyle(
                      color: isSelected
                          ? const Color(0xFFFF6B35)
                          : Colors.black87,
                      fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
                    ),
                  ),
                ),
              );
            }).toList(),
          ),
        ],
      ),
    );
  }

  Widget _buildQuantitySelector() {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Row(
        children: [
          const Text(
            'Số lượng:',
            style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
          ),
          const Spacer(),
          QuantitySelector(
            quantity: _quantity,
            maxStock: _currentStock,
            large: true,
            snackBarContext: context,
            onChanged: (newQty) => setState(() => _quantity = newQty),
          ),
        ],
      ),
    );
  }

  Widget _buildAddToCartButton() {
    final canAdd = _selectedColor != null &&
        _selectedSize != null &&
        _currentStock > 0;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: SizedBox(
        width: double.infinity,
        child: ElevatedButton(
          onPressed: canAdd ? _addToCart : null,
          style: ElevatedButton.styleFrom(
            backgroundColor: const Color(0xFFFF6B35),
            foregroundColor: Colors.white,
            padding: const EdgeInsets.symmetric(vertical: 16),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
            ),
            disabledBackgroundColor: Colors.grey[300],
            elevation: 0,
          ),
          child: Text(
            canAdd
                ? 'Thêm vào giỏ hàng - ${_formatCurrency(widget.product.finalPrice * _quantity)}'
                : 'Vui lòng chọn phân loại',
            style: const TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
      ),
    );
  }
}

