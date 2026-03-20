import 'package:equatable/equatable.dart';

import '../../../cart/domain/entities/cart.dart';
import 'address.dart';
import 'payment_method.dart';

class CheckoutData extends Equatable {
  final Cart cart;
  final Address? shippingAddress;
  final Address? billingAddress;
  final PaymentMethod? paymentMethod;
  final String? discountCode;
  final double subtotal;
  final double discountAmount;
  final double taxAmount;
  final double shippingCost;
  final double totalAmount;

  const CheckoutData({
    required this.cart,
    this.shippingAddress,
    this.billingAddress,
    this.paymentMethod,
    this.discountCode,
    required this.subtotal,
    this.discountAmount = 0.0,
    this.taxAmount = 0.0,
    this.shippingCost = 0.0,
    required this.totalAmount,
  });

  bool get isComplete =>
      shippingAddress != null &&
      billingAddress != null &&
      paymentMethod != null &&
      cart.isNotEmpty;

  bool get hasDiscount => discountAmount > 0;

  CheckoutData copyWith({
    Cart? cart,
    Address? shippingAddress,
    Address? billingAddress,
    PaymentMethod? paymentMethod,
    String? discountCode,
    double? subtotal,
    double? discountAmount,
    double? taxAmount,
    double? shippingCost,
    double? totalAmount,
  }) {
    return CheckoutData(
      cart: cart ?? this.cart,
      shippingAddress: shippingAddress ?? this.shippingAddress,
      billingAddress: billingAddress ?? this.billingAddress,
      paymentMethod: paymentMethod ?? this.paymentMethod,
      discountCode: discountCode ?? this.discountCode,
      subtotal: subtotal ?? this.subtotal,
      discountAmount: discountAmount ?? this.discountAmount,
      taxAmount: taxAmount ?? this.taxAmount,
      shippingCost: shippingCost ?? this.shippingCost,
      totalAmount: totalAmount ?? this.totalAmount,
    );
  }

  @override
  List<Object?> get props => [
        cart,
        shippingAddress,
        billingAddress,
        paymentMethod,
        discountCode,
        subtotal,
        discountAmount,
        taxAmount,
        shippingCost,
        totalAmount,
      ];
}