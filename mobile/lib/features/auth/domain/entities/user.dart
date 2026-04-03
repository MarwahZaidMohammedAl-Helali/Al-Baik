import 'package:equatable/equatable.dart';

class User extends Equatable {
  final String id;
  final String email;
  final String firstName;
  final String lastName;
  final String role;
  final String? phone;
  final String? company;
  final bool isActive;
  final DateTime createdAt;
  final DateTime updatedAt;

  const User({
    required this.id,
    required this.email,
    required this.firstName,
    required this.lastName,
    required this.role,
    this.phone,
    this.company,
    this.isActive = true,
    required this.createdAt,
    required this.updatedAt,
  });

  String get fullName => '$firstName $lastName';
  String get initials => '${firstName[0]}${lastName[0]}';
  
  bool get isAdmin => role == 'admin';
  bool get isEmployee => role == 'employee';
  bool get isCustomer => role == 'customer';

  @override
  List<Object?> get props => [
        id,
        email,
        firstName,
        lastName,
        role,
        phone,
        company,
        isActive,
        createdAt,
        updatedAt,
      ];
}