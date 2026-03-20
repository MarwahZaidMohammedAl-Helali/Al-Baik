import 'package:dartz/dartz.dart';

import '../../../../core/error/failures.dart';
import '../../../../core/usecases/usecase.dart';
import '../entities/address.dart';
import '../repositories/checkout_repository.dart';

class GetUserAddressesUseCase implements UseCase<List<Address>, NoParams> {
  final CheckoutRepository repository;

  GetUserAddressesUseCase(this.repository);

  @override
  Future<Either<Failure, List<Address>>> call(NoParams params) async {
    return await repository.getUserAddresses();
  }
}