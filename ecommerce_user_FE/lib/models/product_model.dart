/// 📦 Product Model - Mô hình dữ liệu sản phẩm theo cấu trúc database
import '../utils/date_helper.dart';

class SizeVariant {
  final String id;
  final String size;
  final int stock;

  SizeVariant({
    required this.id,
    required this.size,
    required this.stock,
  });

  factory SizeVariant.fromJson(Map<String, dynamic> json) {
    return SizeVariant(
      id: json['_id'] is Map ? json['_id']['\$oid'] : json['_id'] ?? '',
      size: json['size'] ?? '',
      stock: json['stock'] ?? 0,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      '_id': id,
      'size': size,
      'stock': stock,
    };
  }
}

class ColorVariant {
  final String id;
  final String color;
  final List<String> images;
  final List<SizeVariant> sizes;

  ColorVariant({
    required this.id,
    required this.color,
    required this.images,
    required this.sizes,
  });

  factory ColorVariant.fromJson(Map<String, dynamic> json) {
    return ColorVariant(
      id: json['_id'] is Map ? json['_id']['\$oid'] : json['_id'] ?? '',
      color: json['color'] ?? '',
      images: List<String>.from(json['images'] ?? []),
      sizes: (json['sizes'] as List?)
              ?.map((e) => SizeVariant.fromJson(e))
              .toList() ??
          [],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      '_id': id,
      'color': color,
      'images': images,
      'sizes': sizes.map((e) => e.toJson()).toList(),
    };
  }

  int get totalStock {
    int total = 0;
    for (var size in sizes) {
      total += size.stock;
    }
    return total;
  }
}

class Product {
  final String id;
  final String name;
  final String shortDescription;
  final String description;
  final String thumbnail;
  final double price;
  final int discount;
  final double finalPrice;
  final List<ColorVariant> colorVariants;
  final List<String> tags;
  final bool isActive;
  final DateTime? createdAt;
  final DateTime? updatedAt;
  // Extra fields for display
  final double averageRating;
  final int reviewCount;
  final int soldCount;
  final bool isFavorite;

  Product({
    required this.id,
    required this.name,
    required this.shortDescription,
    required this.description,
    required this.thumbnail,
    required this.price,
    required this.discount,
    required this.finalPrice,
    required this.colorVariants,
    required this.tags,
    this.isActive = true,
    this.createdAt,
    this.updatedAt,
    this.averageRating = 0,
    this.reviewCount = 0,
    this.soldCount = 0,
    this.isFavorite = false,
  });

  factory Product.fromJson(Map<String, dynamic> json) {
    return Product(
      id: json['_id'] is Map ? json['_id']['\$oid'] : json['_id'] ?? '',
      name: json['name'] ?? '',
      shortDescription: json['shortDescription'] ?? '',
      description: json['description'] ?? '',
      thumbnail: json['thumbnail'] ?? '',
      price: (json['price'] ?? 0).toDouble(),
      discount: json['discount'] ?? 0,
      finalPrice: (json['finalPrice'] ?? json['price'] ?? 0).toDouble(),
      colorVariants: (json['colorVariants'] as List?)
              ?.map((e) => ColorVariant.fromJson(e))
              .toList() ??
          [],
      tags: List<String>.from(json['tags'] ?? []),
      isActive: json['isActive'] ?? true,
      createdAt: DateHelper.parseUtc(
          json['createdAt'] is Map
              ? json['createdAt']['\$date']
              : json['createdAt']?.toString()),
      updatedAt: DateHelper.parseUtc(
          json['updatedAt'] is Map
              ? json['updatedAt']['\$date']
              : json['updatedAt']?.toString()),
      averageRating: (json['averageRating'] ?? 0).toDouble(),
      reviewCount: json['reviewCount'] ?? 0,
      soldCount: json['soldCount'] ?? 0,
      isFavorite: json['isFavorite'] ?? false,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      '_id': id,
      'name': name,
      'shortDescription': shortDescription,
      'description': description,
      'thumbnail': thumbnail,
      'price': price,
      'discount': discount,
      'finalPrice': finalPrice,
      'colorVariants': colorVariants.map((e) => e.toJson()).toList(),
      'tags': tags,
      'isActive': isActive,
    };
  }

  /// Lấy tổng tồn kho
  int get totalStock {
    int total = 0;
    for (var variant in colorVariants) {
      total += variant.totalStock;
    }
    return total;
  }

  /// Lấy danh sách màu
  List<String> get availableColors {
    return colorVariants.map((e) => e.color).toList();
  }

  /// Lấy danh sách size theo màu
  List<String> getAvailableSizes(String color) {
    final variant = colorVariants.firstWhere(
      (e) => e.color == color,
      orElse: () => colorVariants.first,
    );
    return variant.sizes.map((e) => e.size).toList();
  }

  /// Lấy tồn kho theo màu và size
  int getStockByVariant(String color, String size) {
    final colorVar = colorVariants.firstWhere(
      (e) => e.color == color,
      orElse: () => colorVariants.first,
    );
    final sizeVar = colorVar.sizes.firstWhere(
      (e) => e.size == size,
      orElse: () => colorVar.sizes.first,
    );
    return sizeVar.stock;
  }

  /// Lấy hình ảnh theo màu
  List<String> getImagesByColor(String color) {
    final variant = colorVariants.firstWhere(
      (e) => e.color == color,
      orElse: () => colorVariants.first,
    );
    return variant.images;
  }

  /// Getter cho % giảm giá (dùng trong ProductCard)
  int get discountPercent => discount;

  /// Getter cho giá gốc (dùng trong ProductCard)
  double get originalPrice => price;

  /// Getter cho rating (dùng trong ProductCard)
  double get rating => averageRating;

  /// Getter cho số lượng reviews (dùng trong ProductCard)
  int get reviews => reviewCount;
}
