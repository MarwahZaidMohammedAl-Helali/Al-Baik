import 'package:dartz/dartz.dart';

import '../../../../core/error/failures.dart';
import '../../../../core/network/network_info.dart';
import '../../domain/entities/order_tracking.dart';
import '../../domain/repositories/order_tracking_repository.dart';
import '../datasources/order_tracking_remote_data_source.dart';
import '../../../checkout/domain/entities/order.dart';

class OrderTrackingRepositoryImpl implements OrderTrackingRepository {
  final OrderTrackingRemoteDataSource remoteDataSource;
  final NetworkInfo networkInfo;

  OrderTrackingRepositoryImpl({
    required this.remoteDataSource,
    required this.networkInfo,
  });

  @override
  Future<Either<Failure, List<Order>>> getUserOrders(String userId) async {
    if (await networkInfo.isConnected) {
      try {
        final orders = await remoteDataSource.getUserOrders(userId);
        return Right(orders);
      } catch (e) {
        return Left(ServerFailure('Failed to fetch user orders: ${e.toString()}'));
      }
    } else {
      return Left(NetworkFailure('No internet connection'));
    }
  }

  @override
  Future<Either<Failure, OrderTracking>> getOrderTracking(String orderId) async {
    if (await networkInfo.isConnected) {
      try {
        final tracking = await remoteDataSource.getOrderTracking(orderId);
        return Right(tracking);
      } catch (e) {
        return Left(ServerFailure('Failed to fetch order tracking: ${e.toString()}'));
      }
    } else {
      return Left(NetworkFailure('No internet connection'));
    }
  }

  @override
  Future<Either<Failure, List<TrackingEvent>>> getOrderHistory(String orderId) async {
    if (await networkInfo.isConnected) {
      try {
        final history = await remoteDataSource.getOrderHistory(orderId);
        return Right(history);
      } catch (e) {
        return Left(ServerFailure('Failed to fetch order history: ${e.toString()}'));
      }
    } else {
      return Left(NetworkFailure('No internet connection'));
    }
  }

  @override
  Future<Either<Failure, void>> updateOrderStatus(String orderId, TrackingStatus status) async {
    // This would typically be an admin/employee function
    // For now, return success as it's not implemented in the backend
    return const Right(null);
  }
}