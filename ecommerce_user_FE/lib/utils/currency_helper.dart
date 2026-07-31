import 'package:intl/intl.dart';

/// 💵 Currency Helper - Currency formatting utility (VND) used across App
class CurrencyHelper {
  /// Format a number value to VND string (e.g.: 100,000 ₫)
  static String format(num? amount, {String symbol = '₫', String locale = 'vi_VN', int decimalDigits = 0}) {
    if (amount == null) return '0$symbol';
    final formatter = NumberFormat.currency(
      locale: locale,
      symbol: symbol,
      decimalDigits: decimalDigits,
    );
    return formatter.format(amount);
  }
}

/// Extension allowing direct conversion from num (int, double) to VND string
extension VNDExtension on num {
  /// Format current number to VND currency (e.g.: 100,000 ₫)
  String toVND() {
    return CurrencyHelper.format(this);
  }
}

/// Extension supporting nullable num type
extension NullableVNDExtension on num? {
  /// Format current number to VND currency (returns 0₫ if null)
  String toVND() {
    return CurrencyHelper.format(this);
  }
}
