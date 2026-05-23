import '../utils/date_helper.dart';

class NotificationModel {
  final String id;
  final String title;
  final String message;
  final String type; // promo, system
  final bool isRead;
  final DateTime? createdAt;
  final String? referenceId;
  final String? imageUrl;

  NotificationModel({
    required this.id,
    required this.title,
    required this.message,
    required this.type,
    this.isRead = false,
    this.createdAt,
    this.referenceId,
    this.imageUrl,
  });

  NotificationModel copyWith({bool? isRead}) {
    return NotificationModel(
      id: id,
      title: title,
      message: message,
      type: type,
      isRead: isRead ?? this.isRead,
      createdAt: createdAt,
      referenceId: referenceId,
      imageUrl: imageUrl,
    );
  }

  factory NotificationModel.fromJson(Map<String, dynamic> json) {
    String parsedType = (json['type'] ?? 'SYSTEM').toString().toUpperCase();
    if (parsedType == 'PROMO') {
      parsedType = 'PROMOTION';
    }
    return NotificationModel(
      id: json['_id'] is Map ? json['_id']['\$oid'] : json['_id'] ?? '',
      title: json['title'] ?? '',
      message: json['message'] ?? '',
      type: parsedType,
      isRead: json['isRead'] ?? false,
      createdAt: DateHelper.parseUtc(
          json['createdAt'] is Map
              ? json['createdAt']['\$date']
              : json['createdAt']?.toString()),
      referenceId: json['referenceId'] is Map
          ? json['referenceId']['\$oid']
          : json['referenceId'],
      imageUrl: json['imageUrl'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      '_id': id,
      'title': title,
      'message': message,
      'type': type,
      'isRead': isRead,
      'referenceId': referenceId,
      'imageUrl': imageUrl,
    };
  }
}
