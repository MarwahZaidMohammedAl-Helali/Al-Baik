import 'package:dartz/dartz.dart';
import 'package:equatable/equatable.dart';

import '../../../../core/error/failures.dart';
import '../../../../core/usecases/usecase.dart';
import '../entities/checkout_data.dart';
import '../repositories/checkout_repository.dart';

class CalculateCheckoutUseCase implements UseCase<CheckoutData, CalculateCheckoutParams> {
  final CheckoutRepository repository;

  CalculateCheckoutUseCase(this.repository);

  @override
  Future<Either<Failure, CheckoutData>> call(CalculateCheckoutParams params) async {
    return await repository.calculateCheckout(
      checkoutData: params.checkoutData,
      discountCode: params.discountCode,
    );
  }
}

class CalculateCheckoutParams extends Equatable {
  final CheckoutData checkoutData;
  final String? discountCode;

  const CalculateCheckoutParams({
    required this.checkoutData,
    this.discountCode,
  });

  @override
  List<Object?> get props => [checkoutData, discountCode];
}