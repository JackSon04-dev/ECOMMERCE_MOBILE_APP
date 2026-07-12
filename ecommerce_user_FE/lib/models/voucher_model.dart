  import '../utils/date_helper.dart';

  class VoucherModel {
  final String id;
  final String voucherName;
  final String voucherCode;
  final int minOrderAmount;
  final int discountAmount;
  final int usageLimit;
  final bool isActive;
  final DateTime? createdAt;

  VoucherModel({
    required this.id,
    required this.voucherName,
    required this.voucherCode,
    required this.minOrderAmount,
    required this.discountAmount,
    required this.usageLimit,
    this.isActive = true,
    this.createdAt,
  });

  factory VoucherModel.fromJson(Map<String, dynamic> json) {
    return VoucherModel(
      id: json['id'] ?? '',
      voucherName: json['voucherName'] ?? '',
      voucherCode: json['voucherCode'] ?? '',
      minOrderAmount: json['minOrderAmount'] ?? 0,
      discountAmount: json['discountAmount'] ?? 0,
      usageLimit: json['usageLimit'] ?? 0,
      isActive: json['isActive'] ?? true,
      createdAt: DateHelper.parseUtc(json['createdAt']?.toString()),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'voucherName': voucherName,
      'voucherCode': voucherCode,
      'minOrderAmount': minOrderAmount,
      'discountAmount': discountAmount,
      'usageLimit': usageLimit,
      'isActive': isActive,
    };
  }
}

