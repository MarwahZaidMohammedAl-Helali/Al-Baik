import '../../domain/entities/order_tracking.dart';

class OrderTrackingModel extends OrderTracking {
  const OrderTrackingModel({
    required super.orderId,
    super.trackingNumber,
    super.carrier,
    super.currentLocation,
    super.estimatedDelivery,
    required super.events,
    required super.status,
  });

  factory OrderTrackingModel.fromJson(Map<String, dynamic> json) {
    return OrderTrackingModel(
      orderId: json['orderId'] as String,
      trackingNumber: json['trackingNumber'] as String?,
      carrier: json['carrier'] as String?,
      currentLocation: json['currentLocation'] as String?,
      estimatedDelivery: json['estimatedDelivery'] != null
          ? DateTime.parse(json['estimatedDelivery'] as String)
          : null,
      events: (json['events'] as List<dynamic>?)
              ?.map((e) => TrackingEventModel.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
      status: TrackingStatus.values.firstWhere(
        (status) => status.name == json['status'],
        orElse: () => TrackingStatus.pending,
      ),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'orderId': orderId,
      'trackingNumber': trackingNumber,
      'carrier': carrier,
      'currentLocation': currentLocation,
      'estimatedDelivery': estimatedDelivery?.toIso8601String(),
      'events': events.map((e) => (e as TrackingEventModel).toJson()).toList(),
      'status': status.name,
    };
  }

  OrderTrackingModel copyWith({
    String? orderId,
    String? trackingNumber,
    String? carrier,
    String? currentLocation,
    DateTime? estimatedDelivery,
    List<TrackingEvent>? events,
    TrackingStatus? status,
  }) {
    return OrderTrackingModel(
      orderId: orderId ?? this.orderId,
      trackingNumber: trackingNumber ?? this.trackingNumber,
      carrier: carrier ?? this.carrier,
      currentLocation: currentLocation ?? this.currentLocation,
      estimatedDelivery: estimatedDelivery ?? this.estimatedDelivery,
      events: events ?? this.events,
      status: status ?? this.status,
    );
  }
}

class TrackingEventModel extends TrackingEvent {
  const TrackingEventModel({
    required super.id,
    required super.title,
    required super.description,
    super.location,
    required super.timestamp,
    required super.type,
  });

  factory TrackingEventModel.fromJson(Map<String, dynamic> json) {
    return TrackingEventModel(
      id: json['id'] as String,
      title: json['title'] as String,
      description: json['description'] as String,
      location: json['location'] as String?,
      timestamp: DateTime.parse(json['timestamp'] as String),
      type: TrackingEventType.values.firstWhere(
        (type) => type.name == json['type'],
        orElse: () => TrackingEventType.orderPlaced,
      ),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'description': description,
      'location': location,
      'timestamp': timestamp.toIso8601String(),
      'type': type.name,
    };
  }
}