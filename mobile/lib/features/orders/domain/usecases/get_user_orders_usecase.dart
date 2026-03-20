import 'package:dartz/dartz.dart';

import '../../../../core/error/failures.dart';
import '../../../../core/usecases/usecase.dart';
import '../repositories/order_tracking_repository.dart';
import '../../../checkout/domain/entities/order.dart';

class GetUserOrdersUseCase implements UseCase<List<Order>, String> {
  final OrderTrackingRepository repository;

  GetUserOrdersUseCase(this.repository);

  @override
  Future<Either<Failure, List<Order>>> call(String userId) async {
    return await repository.getUserOrders(userId);
  }
}