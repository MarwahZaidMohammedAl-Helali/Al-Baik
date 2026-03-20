import 'package:dartz/dartz.dart';

import '../../../../core/error/failures.dart';
import '../../../../core/usecases/usecase.dart';
import '../repositories/order_tracking_repository.dart';
import '../entities/order_tracking.dart';

class GetOrderTrackingUseCase implements UseCase<OrderTracking, String> {
  final OrderTrackingRepository repository;

  GetOrderTrackingUseCase(this.repository);

  @override
  Future<Either<Failure, OrderTracking>> call(String orderId) async {
    return await repository.getOrderTracking(orderId);
  }
}