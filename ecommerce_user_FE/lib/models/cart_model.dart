// lib/models/cart_model.dart

/// 📦 Model rút gọn cho Product trả về bên trong Cart JSON
class CartProduct {
  final String id;
  final String name;
  final String thumbnail;
  final double price;
  final double finalPrice;

  CartProduct({
    required this.id,
    required this.name,
    required this.thumbnail,
    required this.price,
    required this.finalPrice,
  });

  factory CartProduct.fromJson(Map<String, dynamic> json) {
    return CartProduct(
      id: json['id']?.toString() ?? '',
      name: json['name'] as String? ?? 'Chưa xác định',
      thumbnail: json['thumbnail'] as String? ?? '',
      price: (json['price'] as num?)?.toDouble() ?? 0.0,
      finalPrice: (json['finalPrice'] as num?)?.toDouble() ?? 0.0,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'thumbnail': thumbnail,
      'price': price,
      'finalPrice': finalPrice,
    };
  }
}

/// 🛒 Định nghĩa 1 sản phẩm trong Giỏ hàng
class CartItem {
  final String? cartItemId;
  final CartProduct product;
  final String color;
  final String size;
  final int quantity;
  final int stock;
  final bool isOutOfStock;

  CartItem({
    this.cartItemId,
    required this.product,
    required this.color,
    required this.size,
    required this.quantity,
    this.stock = 0,
    this.isOutOfStock = false,
  });

  /// Khóa định danh độc nhất dùng để gộp dữ liệu (Merge Data)
  String get uniqueKey => '${product.id}_${color}_$size';

  /// Tính tổng tiền của item này
  double get totalPrice => product.finalPrice * quantity;

  factory CartItem.fromJson(Map<String, dynamic> json) {
    return CartItem(
      cartItemId: json['cartItemId']?.toString(),
      product: CartProduct.fromJson(json['product'] as Map<String, dynamic>),
      color: json['color'] as String? ?? 'N/A',
      size: json['size'] as String? ?? 'N/A',
      quantity: (json['quantity'] as num?)?.toInt() ?? 1,
      stock: (json['stock'] as num?)?.toInt() ?? 0,
      isOutOfStock: json['isOutOfStock'] as bool? ?? false,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'cartItemId': cartItemId,
      'product': product.toJson(),
      'color': color,
      'size': size,
      'quantity': quantity,
      'stock': stock,
      'isOutOfStock': isOutOfStock,
    };
  }

  /// Trình sao chép (Merge / Update) giúp chỉnh sửa giá trị cục bộ dễ dàng
  CartItem copyWith({
    String? cartItemId,
    CartProduct? product,
    String? color,
    String? size,
    int? quantity,
    int? stock,
    bool? isOutOfStock,
  }) {
    return CartItem(
      cartItemId: cartItemId ?? this.cartItemId,
      product: product ?? this.product,
      color: color ?? this.color,
      size: size ?? this.size,
      quantity: quantity ?? this.quantity,
      stock: stock ?? this.stock,
      isOutOfStock: isOutOfStock ?? this.isOutOfStock,
    );
  }
}

/// 🗃️ Container tổng chứa cả Giỏ hàng (dùng khi fetch GET API)
class CartData {
  final String cartId;
  final String userId;
  final String updatedAt;
  final List<CartItem> items;
  final int totalItems;

  CartData({
    required this.cartId,
    required this.userId,
    required this.updatedAt,
    required this.items,
    required this.totalItems,
  });

  factory CartData.fromJson(Map<String, dynamic> json) {
    final itemsList = json['items'] as List<dynamic>? ?? [];
    return CartData(
      cartId: json['cartId'] as String? ?? '',
      userId: json['userId'] as String? ?? '',
      updatedAt: json['updatedAt'] as String? ?? '',
      items: itemsList.map((i) => CartItem.fromJson(i as Map<String, dynamic>)).toList(),
      totalItems: (json['totalItems'] as num?)?.toInt() ?? 0,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'cartId': cartId,
      'userId': userId,
      'updatedAt': updatedAt,
      'items': items.map((i) => i.toJson()).toList(),
      'totalItems': totalItems,
    };
  }
}
