import 'package:intl/intl.dart';

/// 🕐 Date Helper - Convert UTC timezone from MongoDB to device local timezone
///
/// MongoDB stores UTC time. When displaying to user, need to convert to
/// device local timezone to display correctly.
///
/// Example: Server returns "2026-03-04T10:30:00.000Z" (UTC)
///  Device in Vietnam (UTC+7) -> displays "04/03/2026 17:30"
class DateHelper {
  /// Format DateTime (UTC from server) -> device local datetime string
  /// Format: dd/MM/yyyy HH:mm
  static String formatDateTime(DateTime? date) {
    if (date == null) return '';
    final localDate = date.toLocal();
    return DateFormat('dd/MM/yyyy HH:mm').format(localDate);
  }

  /// Format DateTime (UTC from server) -> date only, local timezone
  /// Format: dd/MM/yyyy
  static String formatDate(DateTime? date) {
    if (date == null) return '';
    final localDate = date.toLocal();
    return DateFormat('dd/MM/yyyy').format(localDate);
  }

  /// Format DateTime (UTC from server) -> "just now", "5 minutes ago", etc.
  static String formatTimeAgo(DateTime? date) {
    if (date == null) return '';
    final localDate = date.toLocal();
    final now = DateTime.now();
    final diff = now.difference(localDate);

    if (diff.inSeconds < 60) return 'Vừa xong';
    if (diff.inMinutes < 60) return '${diff.inMinutes} phút trước';
    if (diff.inHours < 24) return '${diff.inHours} giờ trước';
    if (diff.inDays < 7) return '${diff.inDays} ngày trước';

    return DateFormat('dd/MM/yyyy').format(localDate);
  }

  /// Parse DateTime from JSON string, ensuring it is always UTC
  /// If string has no 'Z' or offset -> default to UTC
  static DateTime? parseUtc(String? dateString) {
    if (dateString == null || dateString.isEmpty) return null;
    final parsed = DateTime.tryParse(dateString);
    if (parsed == null) return null;
    // If already UTC, keep it, otherwise convert to UTC
    // (MongoDB always returns UTC so ensure correct parsing)
    return parsed.isUtc ? parsed : parsed.toUtc();
  }
}

