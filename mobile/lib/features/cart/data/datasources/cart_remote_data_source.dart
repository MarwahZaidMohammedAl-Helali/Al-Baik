import '../../../../core/constants/api_constants.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/error/exceptions.dart';
import '../models/cart_model.dart';

abstract class CartRemoteDataSource {
  Future<CartModel> getCart();
  Future<CartModel> addToCart({
    required String productId,
    required int quantity,
  });
  Future<CartModel> updateCartItem({
    required String cartItemId,
    required int quantity,
  });
  Future<CartModel> removeFromCart({
    required String cartItemId,
  });
  Future<void> clearCart();
  Future<CartModel> syncCart(CartModel localCart);
}

class CartRemoteDataSourceImpl implements CartRemoteDataSource {
  final ApiClient apiClient;

  CartRemoteDataSourceImpl({required this.apiClient});

  @override
  Future<CartModel> getCart() async {
    try {
      final response = await apiClient.get('/cart');

      if (response.data['success'] == true) {
        final cartData = response.data['data'];
        return CartModel.fromJson(cartData);
      } else {
        throw ServerException(
          response.data['error']['message'] ?? 'Failed to get cart',
          statusCode: response.statusCode,
        );
      }
    } catch (e) {
      if (e is ServerException) rethrow;
      throw ServerException('Failed to get cart: ${e.toString()}');
    }
  }

  @override
  Future<CartModel> addToCart({
    required String productId,
    required int quantity,
  }) async {
    try {
      final response = await apiClient.post(
        '/cart/items',
        data: {
          'productId': productId,
          'quantity': quantity,
        },
      );

      if (response.data['success'] == true) {
        final cartData = response.data['data'];
        return CartModel.fromJson(cartData);
      } else {
        throw ServerException(
          response.data['error']['message'] ?? 'Failed to add to cart',
          statusCode: response.statusCode,
        );
      }
    } catch (e) {
      if (e is ServerException) rethrow;
      throw ServerException('Failed to add to cart: ${e.toString()}');
    }
  }

  @override
  Future<CartModel> updateCartItem({
    required String cartItemId,
    required int quantity,
  }) async {
    try {
      final response = await apiClient.put(
        '/cart/items/$cartItemId',
        data: {
          'quantity': quantity,
        },
      );

      if (response.data['success'] == true) {
        final cartData = response.data['data'];
        return CartModel.fromJson(cartData);
      } else {
        throw ServerException(
          response.data['error']['message'] ?? 'Failed to update cart item',
          statusCode: response.statusCode,
        );
      }
    } catch (e) {
      if (e is ServerException) rethrow;
      throw ServerException('Failed to update cart item: ${e.toString()}');
    }
  }

  @override
  Future<CartModel> removeFromCart({
    required String cartItemId,
  }) async {
    try {
      final response = await apiClient.delete('/cart/items/$cartItemId');

      if (response.data['success'] == true) {
        final cartData = response.data['data'];
        return CartModel.fromJson(cartData);
      } else {
        throw ServerException(
          response.data['error']['message'] ?? 'Failed to remove from cart',
          statusCode: response.statusCode,
        );
      }
    } catch (e) {
      if (e is ServerException) rethrow;
      throw ServerException('Failed to remove from cart: ${e.toString()}');
    }
  }

  @override
  Future<void> clearCart() async {
    try {
      final response = await apiClient.delete('/cart');

      if (response.data['success'] != true) {
        throw ServerException(
          response.data['error']['message'] ?? 'Failed to clear cart',
          statusCode: response.statusCode,
        );
      }
    } catch (e) {
      if (e is ServerException) rethrow;
      throw ServerException('Failed to clear cart: ${e.toString()}');
    }
  }

  @override
  Future<CartModel> syncCart(CartModel localCart) async {
    try {
      final response = await apiClient.post(
        '/cart/sync',
        data: localCart.toJson(),
      );

      if (response.data['success'] == true) {
        final cartData = response.data['data'];
        return CartModel.fromJson(cartData);
      } else {
        throw ServerException(
          response.data['error']['message'] ?? 'Failed to sync cart',
          statusCode: response.statusCode,
        );
      }
    } catch (e) {
      if (e is ServerException) rethrow;
      throw ServerException('Failed to sync cart: ${e.toString()}');
    }
  }
}