import 'package:bloc/bloc.dart';
import 'package:equatable/equatable.dart';

import '../../../../core/usecases/usecase.dart';
import '../../domain/entities/cart.dart';
import '../../domain/usecases/add_to_cart_usecase.dart';
import '../../domain/usecases/get_cart_usecase.dart';
import '../../domain/usecases/update_cart_item_usecase.dart';
import '../../domain/usecases/remove_from_cart_usecase.dart';
import '../../domain/usecases/clear_cart_usecase.dart';

part 'cart_event.dart';
part 'cart_state.dart';

class CartBloc extends Bloc<CartEvent, CartState> {
  final GetCartUseCase getCartUseCase;
  final AddToCartUseCase addToCartUseCase;
  final UpdateCartItemUseCase updateCartItemUseCase;
  final RemoveFromCartUseCase removeFromCartUseCase;
  final ClearCartUseCase clearCartUseCase;

  CartBloc({
    required this.getCartUseCase,
    required this.addToCartUseCase,
    required this.updateCartItemUseCase,
    required this.removeFromCartUseCase,
    required this.clearCartUseCase,
  }) : super(CartInitial()) {
    on<LoadCart>(_onLoadCart);
    on<AddToCart>(_onAddToCart);
    on<UpdateCartItem>(_onUpdateCartItem);
    on<RemoveFromCart>(_onRemoveFromCart);
    on<ClearCart>(_onClearCart);
    on<RefreshCart>(_onRefreshCart);
  }

  Future<void> _onLoadCart(
    LoadCart event,
    Emitter<CartState> emit,
  ) async {
    emit(CartLoading());

    final result = await getCartUseCase(const NoParams());

    result.fold(
      (failure) => emit(CartError(failure.message)),
      (cart) => emit(CartLoaded(cart)),
    );
  }

  Future<void> _onAddToCart(
    AddToCart event,
    Emitter<CartState> emit,
  ) async {
    final currentState = state;
    if (currentState is CartLoaded) {
      emit(CartUpdating(currentState.cart));
    } else {
      emit(CartLoading());
    }

    final result = await addToCartUseCase(
      AddToCartParams(
        productId: event.productId,
        quantity: event.quantity,
      ),
    );

    result.fold(
      (failure) {
        if (currentState is CartLoaded) {
          emit(CartError(failure.message, previousCart: currentState.cart));
        } else {
          emit(CartError(failure.message));
        }
      },
      (cart) => emit(CartLoaded(cart)),
    );
  }

  Future<void> _onUpdateCartItem(
    UpdateCartItem event,
    Emitter<CartState> emit,
  ) async {
    final currentState = state;
    if (currentState is CartLoaded) {
      emit(CartUpdating(currentState.cart));
    }

    final result = await updateCartItemUseCase(
      UpdateCartItemParams(
        cartItemId: event.cartItemId,
        quantity: event.quantity,
      ),
    );

    result.fold(
      (failure) {
        if (currentState is CartLoaded) {
          emit(CartError(failure.message, previousCart: currentState.cart));
        } else {
          emit(CartError(failure.message));
        }
      },
      (cart) => emit(CartLoaded(cart)),
    );
  }

  Future<void> _onRemoveFromCart(
    RemoveFromCart event,
    Emitter<CartState> emit,
  ) async {
    final currentState = state;
    if (currentState is CartLoaded) {
      emit(CartUpdating(currentState.cart));
    }

    final result = await removeFromCartUseCase(
      RemoveFromCartParams(cartItemId: event.cartItemId),
    );

    result.fold(
      (failure) {
        if (currentState is CartLoaded) {
          emit(CartError(failure.message, previousCart: currentState.cart));
        } else {
          emit(CartError(failure.message));
        }
      },
      (cart) => emit(CartLoaded(cart)),
    );
  }

  Future<void> _onClearCart(
    ClearCart event,
    Emitter<CartState> emit,
  ) async {
    final currentState = state;
    if (currentState is CartLoaded) {
      emit(CartUpdating(currentState.cart));
    }

    final result = await clearCartUseCase(const NoParams());

    result.fold(
      (failure) {
        if (currentState is CartLoaded) {
          emit(CartError(failure.message, previousCart: currentState.cart));
        } else {
          emit(CartError(failure.message));
        }
      },
      (_) => emit(const CartLoaded(Cart(items: []))),
    );
  }

  Future<void> _onRefreshCart(
    RefreshCart event,
    Emitter<CartState> emit,
  ) async {
    add(const LoadCart());
  }
}