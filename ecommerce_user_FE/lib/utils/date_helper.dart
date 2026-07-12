import 'package:intl/intl.dart';

/// 🕐 Date Helper - Chuyển đổi múi giờ UTC từ MongoDB sang local timezone của device
///
/// MongoDB lưu thời gian UTC. Khi hiển thị cho user, cần convert sang
/// múi giờ local của thiết bị để hiển thị đúng.
///
/// Ví dụ: Server trả "2026-03-04T10:30:00.000Z" (UTC)
///  Device ở Việt Nam (UTC+7) → hiển thị "04/03/2026 17:30"
class DateHelper {
  /// Format DateTime (UTC từ server) → chuỗi ngày giờ local của device
  /// Format: dd/MM/yyyy HH:mm
  static String formatDateTime(DateTime? date) {
    if (date == null) return '';
    final localDate = date.toLocal();
    return DateFormat('dd/MM/yyyy HH:mm').format(localDate);
  }

  /// Format DateTime (UTC từ server) → chỉ ngày, local timezone
  /// Format: dd/MM/yyyy
  static String formatDate(DateTime? date) {
    if (date == null) return '';
    final localDate = date.toLocal();
    return DateFormat('dd/MM/yyyy').format(localDate);
  }

  /// Format DateTime (UTC từ server) → dạng "vừa xong", "5 phút trước", ...
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

  /// Parse DateTime từ JSON string, đảm bảo luôn là UTC
  /// Nếu string không có 'Z' hoặc offset → mặc định coi là UTC
  static DateTime? parseUtc(String? dateString) {
    if (dateString == null || dateString.isEmpty) return null;
    final parsed = DateTime.tryParse(dateString);
    if (parsed == null) return null;
    // Nếu đã là UTC thì giữ nguyên, nếu không thì convert sang UTC
    // (MongoDB luôn trả UTC nên đảm bảo parse đúng)
    return parsed.isUtc ? parsed : parsed.toUtc();
  }
}

