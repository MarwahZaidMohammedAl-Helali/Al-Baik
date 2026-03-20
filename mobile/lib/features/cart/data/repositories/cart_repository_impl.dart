import 'package:dartz/dartz.dart';

import '../../../../core/error/exceptions.dart';
import '../../../../core/error/failures.dart';
import '../../../../core/network/network_info.dart';
import '../../../products/domain/repositories/product_repository.dart';
import '../../domain/entities/cart.dart';
import '../../domain/entities/cart_item.dart';
import '../../domain/repositories/cart_repository.dart';
import '../datasources/cart_local_data_source.dart';
import '../datasources/cart_remote_data_source.dart';
import '../models/cart_model.dart';

class CartRepositoryImpl implements CartRepository {
  final CartLocalDataSource localDataSource;
  final CartRemoteDataSource remoteDataSource;
  final ProductRepository productRepository;
  final NetworkInfo networkInfo;

  CartRepositoryImpl({
    required this.localDataSource,
    required this.remoteDataSource,
    required this.productRepository,
    required this.networkInfo,
  });

  @override
  Future<Either<Failure, Cart>> getCart() async {
    try {
      // Always get from local storage first for immediate response
      final localCart = await localDataSource.getCart();
      
      // If connected, try to sync with server
      if (await networkInfo.isConnected) {
        try {
          final remoteCart = await remoteDataSource.syncCart(localCart);
          await localDataSource.saveCart(remoteCart);
          return Right(remoteCart.toEntity());
        } catch (e) {
          // If sync fails, return local cart
          return Right(localCart.toEntity());
        }
      }
      
      return Right(localCart.toEntity());
    } on CacheException catch (e) {
      return Left(CacheFailure(e.message));
    } catch (e) {
      return Left(ServerFailure('Failed to get cart: ${e.toString()}'));
    }
  }

  @override
  Future<Either<Failure, Cart>> addToCart({
    required String productId,
    required int quantity,
  }) async {
    try {
      // Get current cart
      final currentCartResult = await getCart();
      if (currentCartResult.isLeft()) {
        return currentCartResult;
      }
      
      final currentCart = currentCartResult.getOrElse(() => const Cart(items: []));
      
      // Get product details
      final productResult = await productRepository.getProductById(productId);
      if (productResult.isLeft()) {
        return Left(productResult.fold((l) => l, (r) => ServerFailure('Product not found')));
      }
      
      final product = productResult.getOrElse(() => throw Exception('Product not found'));
      
      // Check if item already exists in cart
      final existingItemIndex = currentCart.items.indexWhere(
        (item) => item.product.id == productId,
      );
      
      List<CartItem> updatedItems;
      if (existingItemIndex != -1) {
        // Update existing item quantity
        final existingItem = currentCart.items[existingItemIndex];
        final newQuantity = existingItem.quantity + quantity;
        
        updatedItems = List.from(currentCart.items);
        updatedItems[existingItemIndex] = existingItem.copyWith(quantity: newQuantity);
      } else {
        // Add new item
        final newItem = CartItem(
          id: DateTime.now().millisecondsSinceEpoch.toString(),
          product: product,
          quantity: quantity,
          unitPrice: product.getPriceForRole('customer'), // TODO: Get user role
          addedAt: DateTime.now(),
        );
        
        updatedItems = [...currentCart.items, newItem];
      }
      
      final updatedCart = Cart(
        items: updatedItems,
        updatedAt: DateTime.now(),
      );
      
      // Save locally
      await localDataSource.saveCart(CartModel.fromEntity(updatedCart));
      
      // Try to sync with server if connected
      if (await networkInfo.isConnected) {
        try {
          final remoteCart = await remoteDataSource.addToCart(
            productId: productId,
            quantity: quantity,
          );
          await localDataSource.saveCart(remoteCart);
          return Right(remoteCart.toEntity());
        } catch (e) {
          // If server sync fails, return local cart
          return Right(updatedCart);
        }
      }
      
      return Right(updatedCart);
    } on CacheException catch (e) {
      return Left(CacheFailure(e.message));
    } on ServerException catch (e) {
      return Left(ServerFailure(e.message, statusCode: e.statusCode));
    } catch (e) {
      return Left(ServerFailure('Failed to add to cart: ${e.toString()}'));
    }
  }

  @override
  Future<Either<Failure, Cart>> updateCartItem({
    required String cartItemId,
    required int quantity,
  }) async {
    try {
      // Get current cart
      final currentCartResult = await getCart();
      if (currentCartResult.isLeft()) {
        return currentCartResult;
      }
      
      final currentCart = currentCartResult.getOrElse(() => const Cart(items: []));
      
      // Find and update the item
      final itemIndex = currentCart.items.indexWhere((item) => item.id == cartItemId);
      if (itemIndex == -1) {
        return const Left(ServerFailure('Cart item not found'));
      }
      
      final updatedItems = List<CartItem>.from(currentCart.items);
      if (quantity <= 0) {
        // Remove item if quantity is 0 or negative
        updatedItems.removeAt(itemIndex);
      } else {
        // Update quantity
        updatedItems[itemIndex] = updatedItems[itemIndex].copyWith(quantity: quantity);
      }
      
      final updatedCart = Cart(
        items: updatedItems,
        updatedAt: DateTime.now(),
      );
      
      // Save locally
      await localDataSource.saveCart(CartModel.fromEntity(updatedCart));
      
      // Try to sync with server if connected
      if (await networkInfo.isConnected) {
        try {
          final remoteCart = await remoteDataSource.updateCartItem(
            cartItemId: cartItemId,
            quantity: quantity,
          );
          await localDataSource.saveCart(remoteCart);
          return Right(remoteCart.toEntity());
        } catch (e) {
          // If server sync fails, return local cart
          return Right(updatedCart);
        }
      }
      
      return Right(updatedCart);
    } on CacheException catch (e) {
      return Left(CacheFailure(e.message));
    } on ServerException catch (e) {
      return Left(ServerFailure(e.message, statusCode: e.statusCode));
    } catch (e) {
      return Left(ServerFailure('Failed to update cart item: ${e.toString()}'));
    }
  }

  @override
  Future<Either<Failure, Cart>> removeFromCart({
    required String cartItemId,
  }) async {
    return updateCartItem(cartItemId: cartItemId, quantity: 0);
  }

  @override
  Future<Either<Failure, void>> clearCart() async {
    try {
      // Clear locally
      await localDataSource.clearCart();
      
      // Try to clear on server if connected
      if (await networkInfo.isConnected) {
        try {
          await remoteDataSource.clearCart();
        } catch (e) {
          // If server clear fails, local is still cleared
        }
      }
      
      return const Right(null);
    } on CacheException catch (e) {
      return Left(CacheFailure(e.message));
    } catch (e) {
      return Left(ServerFailure('Failed to clear cart: ${e.toString()}'));
    }
  }

  @override
  Future<Either<Failure, Cart>> syncCart() async {
    try {
      if (await networkInfo.isConnected) {
        final localCart = await localDataSource.getCart();
        final remoteCart = await remoteDataSource.syncCart(localCart);
        await localDataSource.saveCart(remoteCart);
        return Right(remoteCart.toEntity());
      } else {
        return const Left(NetworkFailure('No internet connection'));
      }
    } on CacheException catch (e) {
      return Left(CacheFailure(e.message));
    } on ServerException catch (e) {
      return Left(ServerFailure(e.message, statusCode: e.statusCode));
    } catch (e) {
      return Left(ServerFailure('Failed to sync cart: ${e.toString()}'));
    }
  }
}