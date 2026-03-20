import 'package:dartz/dartz.dart';

import '../../../../core/error/failures.dart';
import '../../../../core/usecases/usecase.dart';
import '../repositories/order_tracking_repository.dart';
import '../entities/order_tracking.dart';

class GetOrderHistoryUseCase implements UseCase<List<TrackingEvent>, String> {
  final OrderTrackingRepository repository;

  GetOrderHistoryUseCase(this.repository);

  @override
  Future<Either<Failure, List<TrackingEvent>>> call(String orderId) async {
    return await repository.getOrderHistory(orderId);
  }
}