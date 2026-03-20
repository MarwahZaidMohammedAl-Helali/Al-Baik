import 'package:equatable/equatable.dart';

class Address extends Equatable {
  final String id;
  final String firstName;
  final String lastName;
  final String street;
  final String city;
  final String state;
  final String zipCode;
  final String country;
  final String? phone;
  final bool isDefault;
  final AddressType type;

  const Address({
    required this.id,
    required this.firstName,
    required this.lastName,
    required this.street,
    required this.city,
    required this.state,
    required this.zipCode,
    required this.country,
    this.phone,
    this.isDefault = false,
    required this.type,
  });

  String get fullName => '$firstName $lastName';
  
  String get fullAddress => '$street, $city, $state $zipCode, $country';

  Address copyWith({
    String? id,
    String? firstName,
    String? lastName,
    String? street,
    String? city,
    String? state,
    String? zipCode,
    String? country,
    String? phone,
    bool? isDefault,
    AddressType? type,
  }) {
    return Address(
      id: id ?? this.id,
      firstName: firstName ?? this.firstName,
      lastName: lastName ?? this.lastName,
      street: street ?? this.street,
      city: city ?? this.city,
      state: state ?? this.state,
      zipCode: zipCode ?? this.zipCode,
      country: country ?? this.country,
      phone: phone ?? this.phone,
      isDefault: isDefault ?? this.isDefault,
      type: type ?? this.type,
    );
  }

  @override
  List<Object?> get props => [
        id,
        firstName,
        lastName,
        street,
        city,
        state,
        zipCode,
        country,
        phone,
        isDefault,
        type,
      ];
}

enum AddressType {
  shipping,
  billing,
  both,
}