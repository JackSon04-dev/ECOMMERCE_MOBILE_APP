// import 'package:flutter/material.dart';
//
// /// 📂 Category Model
// class Category {
//   final String id;
//   final String name;
//   final String icon;
//   final Color color;
//   final int productCount;
//
//   Category({
//     required this.id,
//     required this.name,
//     required this.icon,
//     required this.color,
//     this.productCount = 0,
//   });
//
//   factory Category.fromJson(Map<String, dynamic> json) {
//     return Category(
//       id: json['_id'] ?? json['id'] ?? '',
//       name: json['name'] ?? 'Unknown',
//       icon: json['icon'] ?? 'category',
//       color: Color(int.parse(json['color'] ?? '0xFFFF9800')),
//       productCount: json['productCount'] ?? 0,
//     );
//   }
// }
//
