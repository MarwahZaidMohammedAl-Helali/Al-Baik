import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

import '../../../../core/error/exceptions.dart';
import '../models/cart_model.dart';

abstract class CartLocalDataSource {
  Future<CartModel> getCart();
  Future<void> saveCart(CartModel cart);
  Future<void> clearCart();
}

class CartLocalDataSourceImpl implements CartLocalDataSource {
  static const String _cartKey = 'shopping_cart';
  final SharedPreferences sharedPreferences;

  CartLocalDataSourceImpl({required this.sharedPreferences});

  @override
  Future<CartModel> getCart() async {
    try {
      final cartString = sharedPreferences.getString(_cartKey);
      if (cartString == null || cartString.isEmpty) {
        return CartModel(
          items: const [],
          updatedAt: DateTime.now(),
        );
      }
      
      final cartJson = json.decode(cartString) as Map<String, dynamic>;
      return CartModel.fromJson(cartJson);
    } catch (e) {
      throw CacheException('Failed to get cart from local storage: ${e.toString()}');
    }
  }

  @override
  Future<void> saveCart(CartModel cart) async {
    try {
      final cartJson = cart.toJson();
      final cartString = json.encode(cartJson);
      await sharedPreferences.setString(_cartKey, cartString);
    } catch (e) {
      throw CacheException('Failed to save cart to local storage: ${e.toString()}');
    }
  }

  @override
  Future<void> clearCart() async {
    try {
      await sharedPreferences.remove(_cartKey);
    } catch (e) {
      throw CacheException('Failed to clear cart from local storage: ${e.toString()}');
    }
  }
}