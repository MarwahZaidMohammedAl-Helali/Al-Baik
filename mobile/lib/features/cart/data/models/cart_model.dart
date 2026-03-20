import '../../domain/entities/cart.dart';
import 'cart_item_model.dart';

class CartModel extends Cart {
  const CartModel({
    required super.items,
    super.updatedAt,
  });

  factory CartModel.fromJson(Map<String, dynamic> json) {
    final itemsData = json['items'] as List? ?? [];
    final items = itemsData
        .map((item) => CartItemModel.fromJson(item))
        .toList();

    return CartModel(
      items: items,
      updatedAt: json['updatedAt'] != null 
          ? DateTime.parse(json['updatedAt'])
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'items': items.map((item) => (item as CartItemModel).toJson()).toList(),
      'updatedAt': updatedAt?.toIso8601String(),
    };
  }

  Cart toEntity() {
    return Cart(
      items: items,
      updatedAt: updatedAt,
    );
  }

  factory CartModel.fromEntity(Cart cart) {
    return CartModel(
      items: cart.items,
      updatedAt: cart.updatedAt,
    );
  }
}