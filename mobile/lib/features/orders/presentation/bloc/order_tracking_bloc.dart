import 'package:flutter_bloc/flutter_bloc.dart';

import '../../domain/usecases/get_user_orders_usecase.dart';
import '../../domain/usecases/get_order_tracking_usecase.dart';
import '../../domain/usecases/get_order_history_usecase.dart';
import 'order_tracking_event.dart';
import 'order_tracking_state.dart';

class OrderTrackingBloc extends Bloc<OrderTrackingEvent, OrderTrackingState> {
  final GetUserOrdersUseCase getUserOrdersUseCase;
  final GetOrderTrackingUseCase getOrderTrackingUseCase;
  final GetOrderHistoryUseCase getOrderHistoryUseCase;

  OrderTrackingBloc({
    required this.getUserOrdersUseCase,
    required this.getOrderTrackingUseCase,
    required this.getOrderHistoryUseCase,
  }) : super(OrderTrackingInitial()) {
    on<LoadUserOrders>(_onLoadUserOrders);
    on<LoadOrderTracking>(_onLoadOrderTracking);
    on<LoadOrderHistory>(_onLoadOrderHistory);
    on<RefreshOrders>(_onRefreshOrders);
  }

  Future<void> _onLoadUserOrders(
    LoadUserOrders event,
    Emitter<OrderTrackingState> emit,
  ) async {
    emit(OrderTrackingLoading());
    
    final result = await getUserOrdersUseCase(event.userId);
    
    result.fold(
      (failure) => emit(OrderTrackingError(failure.message)),
      (orders) => emit(OrdersLoaded(orders)),
    );
  }

  Future<void> _onLoadOrderTracking(
    LoadOrderTracking event,
    Emitter<OrderTrackingState> emit,
  ) async {
    emit(OrderTrackingLoading());
    
    final result = await getOrderTrackingUseCase(event.orderId);
    
    result.fold(
      (failure) => emit(OrderTrackingError(failure.message)),
      (tracking) => emit(OrderTrackingLoaded(tracking)),
    );
  }

  Future<void> _onLoadOrderHistory(
    LoadOrderHistory event,
    Emitter<OrderTrackingState> emit,
  ) async {
    emit(OrderTrackingLoading());
    
    final result = await getOrderHistoryUseCase(event.orderId);
    
    result.fold(
      (failure) => emit(OrderTrackingError(failure.message)),
      (events) => emit(OrderHistoryLoaded(events)),
    );
  }

  Future<void> _onRefreshOrders(
    RefreshOrders event,
    Emitter<OrderTrackingState> emit,
  ) async {
    // Don't show loading for refresh
    final result = await getUserOrdersUseCase(event.userId);
    
    result.fold(
      (failure) => emit(OrderTrackingError(failure.message)),
      (orders) => emit(OrdersLoaded(orders)),
    );
  }
}