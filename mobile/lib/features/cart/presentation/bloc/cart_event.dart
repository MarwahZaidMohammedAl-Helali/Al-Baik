part of 'cart_bloc.dart';

abstract class CartEvent extends Equatable {
  const CartEvent();

  @override
  List<Object> get props => [];
}

class LoadCart extends CartEvent {
  const LoadCart();
}

class AddToCart extends CartEvent {
  final String productId;
  final int quantity;

  const AddToCart({
    required this.productId,
    required this.quantity,
  });

  @override
  List<Object> get props => [productId, quantity];
}

class UpdateCartItem extends CartEvent {
  final String cartItemId;
  final int quantity;

  const UpdateCartItem({
    required this.cartItemId,
    required this.quantity,
  });

  @override
  List<Object> get props => [cartItemId, quantity];
}

class RemoveFromCart extends CartEvent {
  final String cartItemId;

  const RemoveFromCart({required this.cartItemId});

  @override
  List<Object> get props => [cartItemId];
}

class ClearCart extends CartEvent {
  const ClearCart();
}

class RefreshCart extends CartEvent {
  const RefreshCart();
}