import 'package:equatable/equatable.dart';

import 'cart_item.dart';

class Cart extends Equatable {
  final List<CartItem> items;
  final DateTime? updatedAt;

  const Cart({
    required this.items,
    this.updatedAt,
  });

  int get totalItems => items.fold(0, (sum, item) => sum + item.quantity);
  
  double get totalPrice => items.fold(0.0, (sum, item) => sum + item.totalPrice);
  
  bool get isEmpty => items.isEmpty;
  
  bool get isNotEmpty => items.isNotEmpty;
  
  List<CartItem> get availableItems => items.where((item) => item.isInStock).toList();
  
  List<CartItem> get unavailableItems => items.where((item) => !item.isInStock).toList();
  
  bool get hasUnavailableItems => unavailableItems.isNotEmpty;

  Cart copyWith({
    List<CartItem>? items,
    DateTime? updatedAt,
  }) {
    return Cart(
      items: items ?? this.items,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }

  @override
  List<Object?> get props => [items, updatedAt];
}