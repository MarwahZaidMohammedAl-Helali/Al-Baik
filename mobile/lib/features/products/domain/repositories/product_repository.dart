import 'package:dartz/dartz.dart';

import '../../../../core/error/failures.dart';
import '../entities/product.dart';

abstract class ProductRepository {
  Future<Either<Failure, List<Product>>> getProducts({
    int page = 1,
    int limit = 20,
    String? category,
    String? search,
    String? sortBy,
    String? sortOrder,
  });
  
  Future<Either<Failure, Product>> getProductById(String id);
  
  Future<Either<Failure, List<String>>> getCategories();
  
  Future<Either<Failure, List<Product>>> searchProducts({
    required String query,
    String? category,
    int page = 1,
    int limit = 20,
  });
  
  Future<Either<Failure, List<Product>>> getFeaturedProducts({
    int limit = 10,
  });
}