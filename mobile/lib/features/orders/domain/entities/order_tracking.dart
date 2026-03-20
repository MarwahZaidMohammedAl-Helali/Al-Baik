import 'package:equatable/equatable.dart';

class OrderTracking extends Equatable {
  final String orderId;
  final String? trackingNumber;
  final String? carrier;
  final String? currentLocation;
  final DateTime? estimatedDelivery;
  final List<TrackingEvent> events;
  final TrackingStatus status;

  const OrderTracking({
    required this.orderId,
    this.trackingNumber,
    this.carrier,
    this.currentLocation,
    this.estimatedDelivery,
    required this.events,
    required this.status,
  });

  TrackingEvent? get latestEvent => events.isNotEmpty ? events.first : null;
  
  bool get isDelivered => status == TrackingStatus.delivered;
  
  bool get isInTransit => status == TrackingStatus.inTransit;
  
  bool get hasTracking => trackingNumber != null && trackingNumber!.isNotEmpty;

  OrderTracking copyWith({
    String? orderId,
    String? trackingNumber,
    String? carrier,
    String? currentLocation,
    DateTime? estimatedDelivery,
    List<TrackingEvent>? events,
    TrackingStatus? status,
  }) {
    return OrderTracking(
      orderId: orderId ?? this.orderId,
      trackingNumber: trackingNumber ?? this.trackingNumber,
      carrier: carrier ?? this.carrier,
      currentLocation: currentLocation ?? this.currentLocation,
      estimatedDelivery: estimatedDelivery ?? this.estimatedDelivery,
      events: events ?? this.events,
      status: status ?? this.status,
    );
  }

  @override
  List<Object?> get props => [
        orderId,
        trackingNumber,
        carrier,
        currentLocation,
        estimatedDelivery,
        events,
        status,
      ];
}

class TrackingEvent extends Equatable {
  final String id;
  final String title;
  final String description;
  final String? location;
  final DateTime timestamp;
  final TrackingEventType type;

  const TrackingEvent({
    required this.id,
    required this.title,
    required this.description,
    this.location,
    required this.timestamp,
    required this.type,
  });

  @override
  List<Object?> get props => [id, title, description, location, timestamp, type];
}

enum TrackingStatus {
  pending,
  confirmed,
  processing,
  shipped,
  inTransit,
  outForDelivery,
  delivered,
  exception,
  cancelled,
}

enum TrackingEventType {
  orderPlaced,
  orderConfirmed,
  processing,
  shipped,
  inTransit,
  outForDelivery,
  delivered,
  exception,
  cancelled,
}

extension TrackingStatusExtension on TrackingStatus {
  String get displayName {
    switch (this) {
      case TrackingStatus.pending:
        return 'Pending';
      case TrackingStatus.confirmed:
        return 'Confirmed';
      case TrackingStatus.processing:
        return 'Processing';
      case TrackingStatus.shipped:
        return 'Shipped';
      case TrackingStatus.inTransit:
        return 'In Transit';
      case TrackingStatus.outForDelivery:
        return 'Out for Delivery';
      case TrackingStatus.delivered:
        return 'Delivered';
      case TrackingStatus.exception:
        return 'Exception';
      case TrackingStatus.cancelled:
        return 'Cancelled';
    }
  }

  String get description {
    switch (this) {
      case TrackingStatus.pending:
        return 'Your order is being reviewed';
      case TrackingStatus.confirmed:
        return 'Your order has been confirmed';
      case TrackingStatus.processing:
        return 'Your order is being prepared';
      case TrackingStatus.shipped:
        return 'Your order has been shipped';
      case TrackingStatus.inTransit:
        return 'Your order is on its way';
      case TrackingStatus.outForDelivery:
        return 'Your order is out for delivery';
      case TrackingStatus.delivered:
        return 'Your order has been delivered';
      case TrackingStatus.exception:
        return 'There was an issue with your order';
      case TrackingStatus.cancelled:
        return 'Your order has been cancelled';
    }
  }
}