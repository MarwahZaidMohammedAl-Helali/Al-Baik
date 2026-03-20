import 'package:dartz/dartz.dart';
import 'package:equatable/equatable.dart';

import '../../../../core/error/failures.dart';
import '../../../../core/usecases/usecase.dart';
import '../entities/product.dart';
import '../repositories/product_repository.dart';

class SearchProductsUseCase implements UseCase<List<Product>, SearchProductsParams> {
  final ProductRepository repository;

  SearchProductsUseCase(this.repository);

  @override
  Future<Either<Failure, List<Product>>> call(SearchProductsParams params) async {
    return await repository.searchProducts(
      query: params.query,
      category: params.category,
      page: params.page,
      limit: params.limit,
    );
  }
}

class SearchProductsParams extends Equatable {
  final String query;
  final String? category;
  final int page;
  final int limit;

  const SearchProductsParams({
    required this.query,
    this.category,
    this.page = 1,
    this.limit = 20,
  });

  @override
  List<Object?> get props => [query, category, page, limit];
}