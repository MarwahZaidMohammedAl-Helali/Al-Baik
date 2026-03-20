import 'package:equatable/equatable.dart';

import '../../../cart/domain/entities/cart_item.dart';
import 'address.dart';
import 'payment_method.dart';

class Order extends Equatable {
  final String id;
  final String orderNumber;
  final String userId;
  final List<CartItem> items;
  final Address shippingAddress;
  final Address billingAddress;
  final PaymentMethod paymentMethod;
  final OrderStatus status;
  final double subtotal;
  final double discountAmount;
  final double taxAmount;
  final double shippingCost;
  final double totalAmount;
  final String? discountCode;
  final String? trackingNumber;
  final DateTime? estimatedDelivery;
  final DateTime createdAt;
  final DateTime updatedAt;

  const Order({
    required this.id,
    required this.orderNumber,
    required this.userId,
    required this.items,
    required this.shippingAddress,
    required this.billingAddress,
    required this.paymentMethod,
    required this.status,
    required this.subtotal,
    this.discountAmount = 0.0,
    this.taxAmount = 0.0,
    this.shippingCost = 0.0,
    required this.totalAmount,
    this.discountCode,
    this.trackingNumber,
    this.estimatedDelivery,
    required this.createdAt,
    required this.updatedAt,
  });

  int get totalItems => items.fold(0, (sum, item) => sum + item.quantity);

  bool get isTrackable => trackingNumber != null && trackingNumber!.isNotEmpty;

  bool get canBeCancelled => 
      status == OrderStatus.pending || 
      status == OrderStatus.confirmed;

  Order copyWith({
    String? id,
    String? orderNumber,
    String? userId,
    List<CartItem>? items,
    Address? shippingAddress,
    Address? billingAddress,
    PaymentMethod? paymentMethod,
    OrderStatus? status,
    double? subtotal,
    double? discountAmount,
    double? taxAmount,
    double? shippingCost,
    double? totalAmount,
    String? discountCode,
    String? trackingNumber,
    DateTime? estimatedDelivery,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return Order(
      id: id ?? this.id,
      orderNumber: orderNumber ?? this.orderNumber,
      userId: userId ?? this.userId,
      items: items ?? this.items,
      shippingAddress: shippingAddress ?? this.shippingAddress,
      billingAddress: billingAddress ?? this.billingAddress,
      paymentMethod: paymentMethod ?? this.paymentMethod,
      status: status ?? this.status,
      subtotal: subtotal ?? this.subtotal,
      discountAmount: discountAmount ?? this.discountAmount,
      taxAmount: taxAmount ?? this.taxAmount,
      shippingCost: shippingCost ?? this.shippingCost,
      totalAmount: totalAmount ?? this.totalAmount,
      discountCode: discountCode ?? this.discountCode,
      trackingNumber: trackingNumber ?? this.trackingNumber,
      estimatedDelivery: estimatedDelivery ?? this.estimatedDelivery,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }

  @override
  List<Object?> get props => [
        id,
        orderNumber,
        userId,
        items,
        shippingAddress,
        billingAddress,
        paymentMethod,
        status,
        subtotal,
        discountAmount,
        taxAmount,
        shippingCost,
        totalAmount,
        discountCode,
        trackingNumber,
        estimatedDelivery,
        createdAt,
        updatedAt,
      ];
}

enum OrderStatus {
  pending,
  confirmed,
  processing,
  shipped,
  delivered,
  cancelled,
  refunded,
}

extension OrderStatusExtension on OrderStatus {
  String get displayName {
    switch (this) {
      case OrderStatus.pending:
        return 'Pending';
      case OrderStatus.confirmed:
        return 'Confirmed';
      case OrderStatus.processing:
        return 'Processing';
      case OrderStatus.shipped:
        return 'Shipped';
      case OrderStatus.delivered:
        return 'Delivered';
      case OrderStatus.cancelled:
        return 'Cancelled';
      case OrderStatus.refunded:
        return 'Refunded';
    }
  }

  String get description {
    switch (this) {
      case OrderStatus.pending:
        return 'Your order is being reviewed';
      case OrderStatus.confirmed:
        return 'Your order has been confirmed';
      case OrderStatus.processing:
        return 'Your order is being prepared';
      case OrderStatus.shipped:
        return 'Your order is on its way';
      case OrderStatus.delivered:
        return 'Your order has been delivered';
      case OrderStatus.cancelled:
        return 'Your order has been cancelled';
      case OrderStatus.refunded:
        return 'Your order has been refunded';
    }
  }
}