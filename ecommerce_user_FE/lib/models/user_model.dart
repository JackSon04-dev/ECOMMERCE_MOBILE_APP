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

  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id: json['id'] ?? '',
      username: json['username'] ?? '',
      email: json['email'] ?? '',
      address: json['address'],
      phoneNumber: json['phoneNumber'],
      role: json['role'] ?? 'user',
      isActive: json['isActive'] ?? true,
      createdAt: DateHelper.parseUtc(
          json['createdAt'] is Map
              ? json['createdAt']['\$date']
              : json['createdAt']?.toString()),
      updatedAt: DateHelper.parseUtc(
          json['updatedAt'] is Map
              ? json['updatedAt']['\$date']
              : json['updatedAt']?.toString()),
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

