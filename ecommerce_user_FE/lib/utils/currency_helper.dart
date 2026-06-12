import 'package:intl/intl.dart';

/// 💵 Currency Helper - Tiện ích định dạng tiền tệ (VND) dùng chung cho toàn App
class CurrencyHelper {
  /// Định dạng một giá trị số thành chuỗi VND (ví dụ: 100.000 ₫)
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

/// Extension cho phép chuyển đổi trực tiếp từ num (int, double) sang chuỗi VND
extension VNDExtension on num {
  /// Định dạng số hiện tại thành tiền VND (ví dụ: 100.000 ₫)
  String toVND() {
    return CurrencyHelper.format(this);
  }
}

/// Extension hỗ trợ cho kiểu num nullable
extension NullableVNDExtension on num? {
  /// Định dạng số hiện tại thành tiền VND (nếu null sẽ trả về 0₫)
  String toVND() {
    return CurrencyHelper.format(this);
  }
}
