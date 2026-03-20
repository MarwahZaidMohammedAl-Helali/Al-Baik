import 'package:equatable/equatable.dart';

class PaymentMethod extends Equatable {
  final String id;
  final PaymentType type;
  final String displayName;
  final String? last4Digits;
  final String? expiryMonth;
  final String? expiryYear;
  final String? cardholderName;
  final bool isDefault;

  const PaymentMethod({
    required this.id,
    required this.type,
    required this.displayName,
    this.last4Digits,
    this.expiryMonth,
    this.expiryYear,
    this.cardholderName,
    this.isDefault = false,
  });

  String get maskedCardNumber {
    if (last4Digits != null) {
      return '**** **** **** $last4Digits';
    }
    return displayName;
  }

  String get expiryDate {
    if (expiryMonth != null && expiryYear != null) {
      return '$expiryMonth/$expiryYear';
    }
    return '';
  }

  PaymentMethod copyWith({
    String? id,
    PaymentType? type,
    String? displayName,
    String? last4Digits,
    String? expiryMonth,
    String? expiryYear,
    String? cardholderName,
    bool? isDefault,
  }) {
    return PaymentMethod(
      id: id ?? this.id,
      type: type ?? this.type,
      displayName: displayName ?? this.displayName,
      last4Digits: last4Digits ?? this.last4Digits,
      expiryMonth: expiryMonth ?? this.expiryMonth,
      expiryYear: expiryYear ?? this.expiryYear,
      cardholderName: cardholderName ?? this.cardholderName,
      isDefault: isDefault ?? this.isDefault,
    );
  }

  @override
  List<Object?> get props => [
        id,
        type,
        displayName,
        last4Digits,
        expiryMonth,
        expiryYear,
        cardholderName,
        isDefault,
      ];
}

enum PaymentType {
  creditCard,
  debitCard,
  paypal,
  applePay,
  googlePay,
  bankTransfer,
}