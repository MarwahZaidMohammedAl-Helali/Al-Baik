import 'package:dartz/dartz.dart';
import 'package:equatable/equatable.dart';

import '../../../../core/error/failures.dart';
import '../../../../core/usecases/usecase.dart';
import '../entities/checkout_data.dart';
import '../entities/order.dart' as checkout_order;
import '../repositories/checkout_repository.dart';

class PlaceOrderUseCase implements UseCase<checkout_order.Order, PlaceOrderParams> {
  final CheckoutRepository repository;

  PlaceOrderUseCase(this.repository);

  @override
  Future<Either<Failure, checkout_order.Order>> call(PlaceOrderParams params) async {
    return await repository.placeOrder(params.checkoutData);
  }
}

class PlaceOrderParams extends Equatable {
  final CheckoutData checkoutData;

  const PlaceOrderParams({required this.checkoutData});

  @override
  List<Object> get props => [checkoutData];
}