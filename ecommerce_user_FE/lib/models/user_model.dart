import '../utils/date_helper.dart';

class UserModel {
  final String id;
  final String username;
  final String email;
  final String? address;
  final String? phoneNumber;
  final String role;
  final bool isActive;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  UserModel({
    required this.id,
    required this.username,
    required this.email,
    this.address,
    this.phoneNumber,
    this.role = 'user',
    this.isActive = true,
    this.createdAt,
    this.updatedAt,
  });

  UserModel copyWith({
    String? id,
    String? username,
    String? email,
    String? address,
    String? phoneNumber,
    String? role,
    bool? isActive,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return UserModel(
      id: id ?? this.id,
      username: username ?? this.username,
      email: email ?? this.email,
      address: address ?? this.address,
      phoneNumber: phoneNumber ?? this.phoneNumber,
      role: role ?? this.role,
      isActive: isActive ?? this.isActive,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }

  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id: json['id'] ?? '',
      username: json['username'] ?? '',
      email: json['email'] ?? '',
      address: json['address'],
      phoneNumber: json['phoneNumber'],
      role: json['role'] ?? 'user',
      isActive: json['isActive'] ?? true,
      createdAt: DateHelper.parseUtc(json['createdAt']?.toString()),
      updatedAt: DateHelper.parseUtc(json['updatedAt']?.toString()),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'username': username,
      'email': email,
      'address': address,
      'phoneNumber': phoneNumber,
      'role': role,
      'isActive': isActive,
    };
  }
}

