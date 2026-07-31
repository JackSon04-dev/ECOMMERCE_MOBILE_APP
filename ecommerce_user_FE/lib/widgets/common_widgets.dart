import 'package:flutter/material.dart';

/// 📊 Empty State Widget - Display when no data
class EmptyStateWidget extends StatelessWidget {
  final IconData icon;
  final String title;
  final String? subtitle;
  final String? buttonText;
  final VoidCallback? onButtonPressed;

  const EmptyStateWidget({
    super.key,
    required this.icon,
    required this.title,
    this.subtitle,
    this.buttonText,
    this.onButtonPressed,
  });

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, size: 80, color: Colors.grey[300]),
            const SizedBox(height: 16),
            Text(
              title,
              style: const TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w600,
                color: Colors.black87,
              ),
              textAlign: TextAlign.center,
            ),
            if (subtitle != null) ...[
              const SizedBox(height: 8),
              Text(
                subtitle!,
                style: TextStyle(
                  fontSize: 14,
                  color: Colors.grey[600],
                ),
                textAlign: TextAlign.center,
              ),
            ],
            if (buttonText != null && onButtonPressed != null) ...[
              const SizedBox(height: 24),
              ElevatedButton(
                onPressed: onButtonPressed,
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFFFF6B35),
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 12),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(25),
                  ),
                ),
                child: Text(buttonText!),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

/// 🔄 Loading Widget
class LoadingWidget extends StatelessWidget {
  final String? message;

  const LoadingWidget({super.key, this.message});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const CircularProgressIndicator(
            color: Color(0xFFFF6B35),
          ),
          if (message != null) ...[
            const SizedBox(height: 16),
            Text(
              message!,
              style: TextStyle(
                fontSize: 14,
                color: Colors.grey[600],
              ),
            ),
          ],
        ],
      ),
    );
  }
}

/// 🔢 Quantity Selector Widget - Shared quantity selector widget
/// Supports 2 sizes: large (bottom sheet) and small (card/checkout)
/// Auto disable + button when maxStock reached and show SnackBar notification
class QuantitySelector extends StatelessWidget {
  final int quantity;
  final int maxStock;

  /// Callback when quantity changes — returns new value
  final ValueChanged<int> onChanged;

  /// Minimum quantity (default 1)
  final int minQuantity;

  /// Large size: used in bottom sheet (padding 8, icon 20, font 16)
  /// Small size: used in card/checkout (size 26x26, icon 15, font 13)
  final bool large;

  /// Context to show SnackBar when exceeding stock
  final BuildContext? snackBarContext;

  const QuantitySelector({
    super.key,
    required this.quantity,
    required this.maxStock,
    required this.onChanged,
    this.minQuantity = 1,
    this.large = false,
    this.snackBarContext,
  });

  void _handleIncrease() {
    if (quantity >= maxStock) {
      // Show notification when limit reached
      final ctx = snackBarContext;
      if (ctx != null) {
        ScaffoldMessenger.of(ctx).clearSnackBars();
        ScaffoldMessenger.of(ctx).showSnackBar(
          SnackBar(
            content: Text('Chỉ còn $maxStock sản phẩm trong kho'),
            backgroundColor: Colors.orange,
            duration: const Duration(seconds: 2),
          ),
        );
      }
      return;
    }
    onChanged(quantity + 1);
  }

  void _handleDecrease() {
    if (quantity <= minQuantity) return;
    onChanged(quantity - 1);
  }

  @override
  Widget build(BuildContext context) {
    final canDecrease = quantity > minQuantity;
    final canIncrease = quantity < maxStock;

    if (large) {
      // ── Large style: used in bottom sheet ──────────────────────────
      return Container(
        decoration: BoxDecoration(
          border: Border.all(color: Colors.grey[300]!),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            InkWell(
              onTap: canDecrease ? _handleDecrease : null,
              borderRadius: const BorderRadius.horizontal(left: Radius.circular(8)),
              child: Padding(
                padding: const EdgeInsets.all(8),
                child: Icon(Icons.remove, size: 20, color: canDecrease ? Colors.black87 : Colors.grey[400]),
              ),
            ),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Text(
                '$quantity',
                style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
              ),
            ),
            InkWell(
              // Still allow clicking when out of stock to show SnackBar
              onTap: _handleIncrease,
              borderRadius: const BorderRadius.horizontal(right: Radius.circular(8)),
              child: Padding(
                padding: const EdgeInsets.all(8),
                child: Icon(Icons.add, size: 20, color: canIncrease ? Colors.black87 : Colors.grey[400]),
              ),
            ),
          ],
        ),
      );
    }

    // ── Small style: used in product card and checkout ─────────────────
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        _SmallQtyButton(
          icon: Icons.remove,
          onTap: canDecrease ? _handleDecrease : null,
          disabled: !canDecrease,
        ),
        SizedBox(
          width: 32,
          child: Center(
            child: Text('$quantity', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
          ),
        ),
        _SmallQtyButton(
          icon: Icons.add,
          // Still allow clicking when out of stock to show SnackBar
          onTap: _handleIncrease,
          disabled: !canIncrease,
        ),
      ],
    );
  }
}

/// Small +/- button used in QuantitySelector small style
class _SmallQtyButton extends StatelessWidget {
  final IconData icon;
  final VoidCallback? onTap;
  final bool disabled;

  const _SmallQtyButton({
    required this.icon,
    required this.onTap,
    required this.disabled,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 26,
        height: 26,
        decoration: BoxDecoration(
          border: Border.all(color: disabled ? Colors.grey[200]! : Colors.grey[300]!),
          borderRadius: BorderRadius.circular(6),
          color: disabled ? Colors.grey[100] : null,
        ),
        child: Center(
          child: Icon(icon, size: 15, color: disabled ? Colors.grey[400] : Colors.grey[700]),
        ),
      ),
    );
  }
}

/// ❌ Error Widget
class ErrorDisplayWidget extends StatelessWidget {
  final String message;
  final VoidCallback? onRetry;

  const ErrorDisplayWidget({
    super.key,
    required this.message,
    this.onRetry,
  });

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.error_outline, size: 60, color: Colors.red[300]),
            const SizedBox(height: 16),
            Text(
              'Đã xảy ra lỗi',
              style: const TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w600,
                color: Colors.black87,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              message,
              style: TextStyle(
                fontSize: 14,
                color: Colors.grey[600],
              ),
              textAlign: TextAlign.center,
            ),
            if (onRetry != null) ...[
              const SizedBox(height: 24),
              ElevatedButton.icon(
                onPressed: onRetry,
                icon: const Icon(Icons.refresh),
                label: const Text('Thử lại'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFFFF6B35),
                  foregroundColor: Colors.white,
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

