part of 'checkout_bloc.dart';

abstract class CheckoutState extends Equatable {
  const CheckoutState();

  @override
  List<Object?> get props => [];
}

class CheckoutInitial extends CheckoutState {}

class CheckoutLoading extends CheckoutState {}

class CheckoutLoaded extends CheckoutState {
  final CheckoutData checkoutData;
  final List<Address> availableAddresses;
  final List<PaymentMethod> availablePaymentMethods;
  final bool isApplyingDiscount;
  final bool isPlacingOrder;
  final String? discountError;
  final String? orderError;

  const CheckoutLoaded({
    required this.checkoutData,
    required this.availableAddresses,
    required this.availablePaymentMethods,
    this.isApplyingDiscount = false,
    this.isPlacingOrder = false,
    this.discountError,
    this.orderError,
  });

  CheckoutLoaded copyWith({
    CheckoutData? checkoutData,
    List<Address>? availableAddresses,
    List<PaymentMethod>? availablePaymentMethods,
    bool? isApplyingDiscount,
    bool? isPlacingOrder,
    String? discountError,
    String? orderError,
  }) {
    return CheckoutLoaded(
      checkoutData: checkoutData ?? this.checkoutData,
      availableAddresses: availableAddresses ?? this.availableAddresses,
      availablePaymentMethods: availablePaymentMethods ?? this.availablePaymentMethods,
      isApplyingDiscount: isApplyingDiscount ?? this.isApplyingDiscount,
      isPlacingOrder: isPlacingOrder ?? this.isPlacingOrder,
      discountError: discountError,
      orderError: orderError,
    );
  }

  @override
  List<Object?> get props => [
        checkoutData,
        availableAddresses,
        availablePaymentMethods,
        isApplyingDiscount,
        isPlacingOrder,
        discountError,
        orderError,
      ];
}

class CheckoutError extends CheckoutState {
  final String message;

  const CheckoutError(this.message);

  @override
  List<Object> get props => [message];
}

class CheckoutOrderPlaced extends CheckoutState {
  final checkout_order.Order order;

  const CheckoutOrderPlaced(this.order);

  @override
  List<Object> get props => [order];
}