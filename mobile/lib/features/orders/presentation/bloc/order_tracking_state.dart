import 'package:equatable/equatable.dart';

import '../../domain/entities/order_tracking.dart';
import '../../../checkout/domain/entities/order.dart';

abstract class OrderTrackingState extends Equatable {
  const OrderTrackingState();

  @override
  List<Object?> get props => [];
}

class OrderTrackingInitial extends OrderTrackingState {}

class OrderTrackingLoading extends OrderTrackingState {}

class OrdersLoaded extends OrderTrackingState {
  final List<Order> orders;

  const OrdersLoaded(this.orders);

  @override
  List<Object?> get props => [orders];
}

class OrderTrackingLoaded extends OrderTrackingState {
  final OrderTracking tracking;

  const OrderTrackingLoaded(this.tracking);

  @override
  List<Object?> get props => [tracking];
}

class OrderHistoryLoaded extends OrderTrackingState {
  final List<TrackingEvent> events;

  const OrderHistoryLoaded(this.events);

  @override
  List<Object?> get props => [events];
}

class OrderTrackingError extends OrderTrackingState {
  final String message;

  const OrderTrackingError(this.message);

  @override
  List<Object?> get props => [message];
}