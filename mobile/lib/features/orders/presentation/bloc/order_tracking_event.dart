import 'package:equatable/equatable.dart';

abstract class OrderTrackingEvent extends Equatable {
  const OrderTrackingEvent();

  @override
  List<Object?> get props => [];
}

class LoadUserOrders extends OrderTrackingEvent {
  final String userId;

  const LoadUserOrders(this.userId);

  @override
  List<Object?> get props => [userId];
}

class LoadOrderTracking extends OrderTrackingEvent {
  final String orderId;

  const LoadOrderTracking(this.orderId);

  @override
  List<Object?> get props => [orderId];
}

class LoadOrderHistory extends OrderTrackingEvent {
  final String orderId;

  const LoadOrderHistory(this.orderId);

  @override
  List<Object?> get props => [orderId];
}

class RefreshOrders extends OrderTrackingEvent {
  final String userId;

  const RefreshOrders(this.userId);

  @override
  List<Object?> get props => [userId];
}