import 'package:dartz/dartz.dart';

import '../../../../core/error/failures.dart';
import '../entities/order_tracking.dart';
import '../../../checkout/domain/entities/order.dart';

abstract class OrderTrackingRepository {
  Future<Either<Failure, List<Order>>> getUserOrders(String userId);
  Future<Either<Failure, OrderTracking>> getOrderTracking(String orderId);
  Future<Either<Failure, List<TrackingEvent>>> getOrderHistory(String orderId);
  Future<Either<Failure, void>> updateOrderStatus(String orderId, TrackingStatus status);
}