import 'package:bloc/bloc.dart';
import 'package:equatable/equatable.dart';

import '../../../../core/usecases/usecase.dart';
import '../../../cart/domain/entities/cart.dart';
import '../../domain/entities/address.dart';
import '../../domain/entities/checkout_data.dart';
import '../../domain/entities/order.dart' as checkout_order;
import '../../domain/entities/payment_method.dart';
import '../../domain/usecases/calculate_checkout_usecase.dart';
import '../../domain/usecases/get_user_addresses_usecase.dart';
import '../../domain/usecases/place_order_usecase.dart';

part 'checkout_event.dart';
part 'checkout_state.dart';

class CheckoutBloc extends Bloc<CheckoutEvent, CheckoutState> {
  final GetUserAddressesUseCase getUserAddressesUseCase;
  final CalculateCheckoutUseCase calculateCheckoutUseCase;
  final PlaceOrderUseCase placeOrderUseCase;

  CheckoutBloc({
    required this.getUserAddressesUseCase,
    required this.calculateCheckoutUseCase,
    required this.placeOrderUseCase,
  }) : super(CheckoutInitial()) {
    on<LoadCheckoutData>(_onLoadCheckoutData);
    on<UpdateShippingAddress>(_onUpdateShippingAddress);
    on<UpdateBillingAddress>(_onUpdateBillingAddress);
    on<UpdatePaymentMethod>(_onUpdatePaymentMethod);
    on<ApplyDiscountCode>(_onApplyDiscountCode);
    on<RemoveDiscountCode>(_onRemoveDiscountCode);
    on<PlaceOrder>(_onPlaceOrder);
    on<RecalculateCheckout>(_onRecalculateCheckout);
  }

  Future<void> _onLoadCheckoutData(
    LoadCheckoutData event,
    Emitter<CheckoutState> emit,
  ) async {
    emit(CheckoutLoading());

    // Load user addresses
    final addressesResult = await getUserAddressesUseCase(const NoParams());
    
    addressesResult.fold(
      (failure) => emit(CheckoutError(failure.message)),
      (addresses) {
        // Initialize checkout data with cart
        final checkoutData = CheckoutData(
          cart: event.cart,
          subtotal: event.cart.totalPrice,
          totalAmount: event.cart.totalPrice,
        );

        emit(CheckoutLoaded(
          checkoutData: checkoutData,
          availableAddresses: addresses,
          availablePaymentMethods: const [], // TODO: Load payment methods
        ));
      },
    );
  }

  Future<void> _onUpdateShippingAddress(
    UpdateShippingAddress event,
    Emitter<CheckoutState> emit,
  ) async {
    if (state is CheckoutLoaded) {
      final currentState = state as CheckoutLoaded;
      final updatedCheckoutData = currentState.checkoutData.copyWith(
        shippingAddress: event.address,
      );

      emit(currentState.copyWith(checkoutData: updatedCheckoutData));
      
      // Recalculate totals
      add(RecalculateCheckout());
    }
  }

  Future<void> _onUpdateBillingAddress(
    UpdateBillingAddress event,
    Emitter<CheckoutState> emit,
  ) async {
    if (state is CheckoutLoaded) {
      final currentState = state as CheckoutLoaded;
      final updatedCheckoutData = currentState.checkoutData.copyWith(
        billingAddress: event.address,
      );

      emit(currentState.copyWith(checkoutData: updatedCheckoutData));
    }
  }

  Future<void> _onUpdatePaymentMethod(
    UpdatePaymentMethod event,
    Emitter<CheckoutState> emit,
  ) async {
    if (state is CheckoutLoaded) {
      final currentState = state as CheckoutLoaded;
      final updatedCheckoutData = currentState.checkoutData.copyWith(
        paymentMethod: event.paymentMethod,
      );

      emit(currentState.copyWith(checkoutData: updatedCheckoutData));
    }
  }

  Future<void> _onApplyDiscountCode(
    ApplyDiscountCode event,
    Emitter<CheckoutState> emit,
  ) async {
    if (state is CheckoutLoaded) {
      final currentState = state as CheckoutLoaded;
      
      emit(currentState.copyWith(isApplyingDiscount: true));

      final updatedCheckoutData = currentState.checkoutData.copyWith(
        discountCode: event.discountCode,
      );

      // Recalculate with discount code
      final result = await calculateCheckoutUseCase(
        CalculateCheckoutParams(
          checkoutData: updatedCheckoutData,
          discountCode: event.discountCode,
        ),
      );

      result.fold(
        (failure) => emit(currentState.copyWith(
          isApplyingDiscount: false,
          discountError: failure.message,
        )),
        (calculatedData) => emit(currentState.copyWith(
          checkoutData: calculatedData,
          isApplyingDiscount: false,
          discountError: null,
        )),
      );
    }
  }

  Future<void> _onRemoveDiscountCode(
    RemoveDiscountCode event,
    Emitter<CheckoutState> emit,
  ) async {
    if (state is CheckoutLoaded) {
      final currentState = state as CheckoutLoaded;
      final updatedCheckoutData = currentState.checkoutData.copyWith(
        discountCode: null,
        discountAmount: 0.0,
      );

      emit(currentState.copyWith(checkoutData: updatedCheckoutData));
      
      // Recalculate without discount
      add(RecalculateCheckout());
    }
  }

  Future<void> _onRecalculateCheckout(
    RecalculateCheckout event,
    Emitter<CheckoutState> emit,
  ) async {
    if (state is CheckoutLoaded) {
      final currentState = state as CheckoutLoaded;

      final result = await calculateCheckoutUseCase(
        CalculateCheckoutParams(
          checkoutData: currentState.checkoutData,
          discountCode: currentState.checkoutData.discountCode,
        ),
      );

      result.fold(
        (failure) => emit(CheckoutError(failure.message)),
        (calculatedData) => emit(currentState.copyWith(
          checkoutData: calculatedData,
        )),
      );
    }
  }

  Future<void> _onPlaceOrder(
    PlaceOrder event,
    Emitter<CheckoutState> emit,
  ) async {
    if (state is CheckoutLoaded) {
      final currentState = state as CheckoutLoaded;
      
      if (!currentState.checkoutData.isComplete) {
        emit(CheckoutError('Please complete all required fields'));
        return;
      }

      emit(currentState.copyWith(isPlacingOrder: true));

      final result = await placeOrderUseCase(
        PlaceOrderParams(checkoutData: currentState.checkoutData),
      );

      result.fold(
        (failure) => emit(currentState.copyWith(
          isPlacingOrder: false,
          orderError: failure.message,
        )),
        (order) => emit(CheckoutOrderPlaced(order)),
      );
    }
  }
}