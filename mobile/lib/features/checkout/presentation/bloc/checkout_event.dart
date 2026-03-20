part of 'checkout_bloc.dart';

abstract class CheckoutEvent extends Equatable {
  const CheckoutEvent();

  @override
  List<Object?> get props => [];
}

class LoadCheckoutData extends CheckoutEvent {
  final Cart cart;

  const LoadCheckoutData(this.cart);

  @override
  List<Object> get props => [cart];
}

class UpdateShippingAddress extends CheckoutEvent {
  final Address address;

  const UpdateShippingAddress(this.address);

  @override
  List<Object> get props => [address];
}

class UpdateBillingAddress extends CheckoutEvent {
  final Address address;

  const UpdateBillingAddress(this.address);

  @override
  List<Object> get props => [address];
}

class UpdatePaymentMethod extends CheckoutEvent {
  final PaymentMethod paymentMethod;

  const UpdatePaymentMethod(this.paymentMethod);

  @override
  List<Object> get props => [paymentMethod];
}

class ApplyDiscountCode extends CheckoutEvent {
  final String discountCode;

  const ApplyDiscountCode(this.discountCode);

  @override
  List<Object> get props => [discountCode];
}

class RemoveDiscountCode extends CheckoutEvent {
  const RemoveDiscountCode();
}

class RecalculateCheckout extends CheckoutEvent {
  const RecalculateCheckout();
}

class PlaceOrder extends CheckoutEvent {
  const PlaceOrder();
}