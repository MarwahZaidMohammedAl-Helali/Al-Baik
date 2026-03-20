import 'package:dartz/dartz.dart';

import '../../../../core/error/failures.dart';
import '../entities/cart.dart';
import '../entities/cart_item.dart';

abstract class CartRepository {
  Future<Either<Failure, Cart>> getCart();
  
  Future<Either<Failure, Cart>> addToCart({
    required String productId,
    required int quantity,
  });
  
  Future<Either<Failure, Cart>> updateCartItem({
    required String cartItemId,
    required int quantity,
  });
  
  Future<Either<Failure, Cart>> removeFromCart({
    required String cartItemId,
  });
  
  Future<Either<Failure, void>> clearCart();
  
  Future<Either<Failure, Cart>> syncCart();
}