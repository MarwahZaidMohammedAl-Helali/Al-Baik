part of 'cart_bloc.dart';

abstract class CartState extends Equatable {
  const CartState();

  @override
  List<Object?> get props => [];
}

class CartInitial extends CartState {}

class CartLoading extends CartState {}

class CartUpdating extends CartState {
  final Cart cart;

  const CartUpdating(this.cart);

  @override
  List<Object> get props => [cart];
}

class CartLoaded extends CartState {
  final Cart cart;

  const CartLoaded(this.cart);

  @override
  List<Object> get props => [cart];
}

class CartError extends CartState {
  final String message;
  final Cart? previousCart;

  const CartError(this.message, {this.previousCart});

  @override
  List<Object?> get props => [message, previousCart];
}