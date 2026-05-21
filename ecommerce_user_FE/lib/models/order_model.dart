/// 📦 Order Model - Mô hình dữ liệu đơn hàng theo cấu trúc database
import '../utils/date_helper.dart';

class OrderVariant {
  final String colorVariantId;
  final String color;
  final String colorImage;
  final String size;
  final int quantity;

  OrderVariant({
    required this.colorVariantId,
    required this.color,
    required this.colorImage,
    required this.size,
    required this.quantity,
  });

  factory OrderVariant.fromJson(Map<String, dynamic> json) {
    return OrderVariant(
      colorVariantId: json['colorVariantId'] is Map
          ? json['colorVariantId']['\$oid']
          : json['colorVariantId'] ?? '',
      color: json['color'] ?? '',
      colorImage: json['colorImage'] ?? '',
      size: json['size'] ?? '',
      quantity: json['quantity'] ?? 1,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'colorVariantId': colorVariantId,
      'color': color,
      'colorImage': colorImage,
      'size': size,
      'quantity': quantity,
    };
  }
}

class OrderItem {
  final String id;
  final String productId;
  final String productName;
  final double finalPrice;
  final OrderVariant variant;
  final double itemTotal;
  final bool isRated;

  OrderItem({
    required this.id,
    required this.productId,
    required this.productName,
    required this.finalPrice,
    required this.variant,
    required this.itemTotal,
    this.isRated = false,
  });

  factory OrderItem.fromJson(Map<String, dynamic> json) {
    return OrderItem(
      id: json['_id'] is Map ? json['_id']['\$oid'] : json['_id'] ?? '',
      productId: json['product'] is Map
          ? json['product']['\$oid']
          : json['product'] ?? '',
      productName: json['productName'] ?? '',
      finalPrice: (json['finalPrice'] ?? 0).toDouble(),
      variant: OrderVariant.fromJson(json['variant'] ?? {}),
      itemTotal: (json['itemTotal'] ?? 0).toDouble(),
      isRated: json['isRated'] == true || json['isRated'] == 1,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      '_id': id,
      'product': productId,
      'productName': productName,
      'finalPrice': finalPrice,
      'variant': variant.toJson(),
      'itemTotal': itemTotal,
      'isRated': isRated,
    };
  }
}

class OrderVoucher {
  final String? voucherId;
  final String? voucherCode;
  final String? voucherName;
  final double discountAmount;

  OrderVoucher({
    this.voucherId,
    this.voucherCode,
    this.voucherName,
    this.discountAmount = 0,
  });

  factory OrderVoucher.fromJson(Map<String, dynamic> json) {
    return OrderVoucher(
      voucherId: json['voucherId'] is Map
          ? json['voucherId']['\$oid']
          : json['voucherId'],
      voucherCode: json['voucherCode'],
      voucherName: json['voucherName'],
      discountAmount: (json['discountAmount'] ?? 0).toDouble(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'voucherId': voucherId,
      'voucherCode': voucherCode,
      'voucherName': voucherName,
      'discountAmount': discountAmount,
    };
  }
}

class UserInfo {
  final String username;
  final String address;
  final String phoneNumber;

  UserInfo({
    required this.username,
    required this.address,
    required this.phoneNumber,
  });

  factory UserInfo.fromJson(Map<String, dynamic> json) {
    return UserInfo(
      username: json['username'] ?? '',
      address: json['address'] ?? '',
      phoneNumber: json['phoneNumber'] ?? '',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'username': username,
      'address': address,
      'phoneNumber': phoneNumber,
    };
  }
}

class OrderStatusHistory {
  final String id;
  final String status;
  final String note;
  final DateTime? updatedAt;

  OrderStatusHistory({
    required this.id,
    required this.status,
    required this.note,
    this.updatedAt,
  });

  factory OrderStatusHistory.fromJson(Map<String, dynamic> json) {
    return OrderStatusHistory(
      id: json['_id'] is Map ? json['_id']['\$oid'] : json['_id'] ?? '',
      status: json['status'] ?? '',
      note: json['note'] ?? '',
      updatedAt: DateHelper.parseUtc(
          json['updatedAt'] is Map
              ? json['updatedAt']['\$date']
              : json['updatedAt']?.toString()),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      '_id': id,
      'status': status,
      'note': note,
      if (updatedAt != null) 'updatedAt': updatedAt!.toIso8601String(),
    };
  }
}

class Order {
  final String id;
  final String userId;
  final UserInfo userInfo;
  final List<OrderItem> orderItems;
  final String paymentMethod;
  final double itemsPrice;
  final double shippingPrice;
  final OrderVoucher voucher;
  final double totalPrice;
  final String status;
  final bool isPaid;
  final DateTime? createdAt;
  final DateTime? updatedAt;
  final DateTime? paidAt;
  final List<OrderStatusHistory> statusHistory;

  /// isRated giờ là computed property: true khi TẤT CẢ orderItems đã được đánh giá
  bool get isRated {
    if (orderItems.isEmpty) return false;
    return orderItems.every((item) => item.isRated == true);
  }

  /// Kiểm tra xem có ít nhất 1 item đã được đánh giá
  bool get hasAnyRated {
    if (orderItems.isEmpty) return false;
    return orderItems.any((item) => item.isRated == true);
  }

  /// Kiểm tra xem còn item nào chưa đánh giá không
  bool get hasUnratedItems {
    if (orderItems.isEmpty) return true;
    return orderItems.any((item) => item.isRated != true);
  }

  Order({
    required this.id,
    required this.userId,
    required this.userInfo,
    required this.orderItems,
    required this.paymentMethod,
    required this.itemsPrice,
    this.shippingPrice = 20000, // Default shipping price từ server
    required this.voucher,
    required this.totalPrice,
    this.status = statusPending, // Default status từ server
    this.isPaid = false,
    this.createdAt,
    this.updatedAt,
    this.paidAt,
    this.statusHistory = const [],
  });

  factory Order.fromJson(Map<String, dynamic> json) {
    return Order(
      id: json['_id'] is Map ? json['_id']['\$oid'] : json['_id'] ?? '',
      userId: json['user'] is Map ? json['user']['\$oid'] : json['user'] ?? '',
      userInfo: UserInfo.fromJson(json['userInfo'] ?? {}),
      orderItems: (json['orderItems'] as List?)
              ?.map((e) => OrderItem.fromJson(e))
              .toList() ??
          [],
      paymentMethod: json['paymentMethod'] ?? 'COD',
      itemsPrice: (json['itemsPrice'] ?? 0).toDouble(),
      shippingPrice: (json['shippingPrice'] ?? 20000).toDouble(), // Default 20000 từ server
      voucher: OrderVoucher.fromJson(json['voucher'] ?? {}),
      totalPrice: (json['totalPrice'] ?? 0).toDouble(),
      status: json['status'] ?? statusPending, // Dùng constant
      isPaid: json['isPaid'] == true || json['isPaid'] == 1,
      createdAt: DateHelper.parseUtc(
          json['createdAt'] is Map
              ? json['createdAt']['\$date']
              : json['createdAt']?.toString()),
      updatedAt: DateHelper.parseUtc(
          json['updatedAt'] is Map
              ? json['updatedAt']['\$date']
              : json['updatedAt']?.toString()),
      paidAt: DateHelper.parseUtc(
          json['paidAt'] is Map
              ? json['paidAt']['\$date']
              : json['paidAt']?.toString()),
      statusHistory: (json['statusHistory'] as List?)
              ?.map((e) => OrderStatusHistory.fromJson(e))
              .toList() ??
          const [],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      '_id': id,
      'user': userId,
      'userInfo': userInfo.toJson(),
      'orderItems': orderItems.map((e) => e.toJson()).toList(),
      'paymentMethod': paymentMethod,
      'itemsPrice': itemsPrice,
      'shippingPrice': shippingPrice,
      'voucher': voucher.toJson(),
      'totalPrice': totalPrice,
      'status': status,
      'isPaid': isPaid,
      if (createdAt != null) 'createdAt': createdAt!.toIso8601String(),
      if (updatedAt != null) 'updatedAt': updatedAt!.toIso8601String(),
      if (paidAt != null) 'paidAt': paidAt!.toIso8601String(),
      'statusHistory': statusHistory.map((e) => e.toJson()).toList(),
    };
  }

  // Các trạng thái đơn hàng
  static const String statusPending = 'Chờ xác nhận';
  static const String statusConfirmed = 'Đã xác nhận';
  static const String statusShipping = 'Đang giao';
  static const String statusDelivered = 'Đã giao';
  static const String statusSuccess = 'Thành công';
  static const String statusCancelled = 'Đã hủy';

  static List<String> get allStatuses => [
        statusPending,
        statusConfirmed,
        statusShipping,
        statusDelivered,
        statusSuccess,
        statusCancelled,
      ];

  // Các phương thức thanh toán (enum từ server)
  static const String paymentCOD = 'COD';
  static const String paymentBanking = 'Banking';

  static List<String> get allPaymentMethods => [
        paymentCOD,
        paymentBanking,
      ];

  // Helper methods để tính toán giống server
  /// Tính tổng tiền sản phẩm từ orderItems
  double calculateItemsPrice() {
    return orderItems.fold(0, (sum, item) => sum + item.itemTotal);
  }

  /// Tính tổng tiền thanh toán
  /// totalPrice = itemsPrice + shippingPrice - voucher.discountAmount
  double calculateTotalPrice() {
    final total = itemsPrice + shippingPrice - voucher.discountAmount;
    return total < 0 ? 0 : total; // Đảm bảo không âm
  }

  /// Kiểm tra xem order có thể hủy không
  bool get canBeCancelled {
    return status == statusPending;
  }

  /// Kiểm tra xem order đã hoàn thành chưa
  bool get isCompleted {
    return status == statusSuccess;
  }

  /// Kiểm tra xem order đã bị hủy chưa
  bool get isCancelled {
    return status == statusCancelled;
  }
}
