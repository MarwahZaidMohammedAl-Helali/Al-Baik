import '../../../../core/constants/api_constants.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/error/exceptions.dart';
import '../models/product_model.dart';

abstract class ProductRemoteDataSource {
  Future<List<ProductModel>> getProducts({
    int page = 1,
    int limit = 20,
    String? category,
    String? search,
    String? sortBy,
    String? sortOrder,
  });
  
  Future<ProductModel> getProductById(String id);
  
  Future<List<String>> getCategories();
  
  Future<List<ProductModel>> searchProducts({
    required String query,
    String? category,
    int page = 1,
    int limit = 20,
  });
  
  Future<List<ProductModel>> getFeaturedProducts({
    int limit = 10,
  });
}

class ProductRemoteDataSourceImpl implements ProductRemoteDataSource {
  final ApiClient apiClient;

  ProductRemoteDataSourceImpl({required this.apiClient});

  @override
  Future<List<ProductModel>> getProducts({
    int page = 1,
    int limit = 20,
    String? category,
    String? search,
    String? sortBy,
    String? sortOrder,
  }) async {
    try {
      final queryParams = <String, dynamic>{
        'page': page,
        'limit': limit,
        if (category != null) 'category': category,
        if (search != null) 'search': search,
        if (sortBy != null) 'sortBy': sortBy,
        if (sortOrder != null) 'sortOrder': sortOrder,
      };

      final response = await apiClient.get(
        ApiConstants.products,
        queryParameters: queryParams,
      );

      if (response.data['success'] == true) {
        final productsData = response.data['data']['products'] as List;
        return productsData
            .map((json) => ProductModel.fromJson(json))
            .toList();
      } else {
        throw ServerException(
          response.data['error']['message'] ?? 'Failed to get products',
          statusCode: response.statusCode,
        );
      }
    } catch (e) {
      if (e is ServerException) rethrow;
      throw ServerException('Failed to get products: ${e.toString()}');
    }
  }

  @override
  Future<ProductModel> getProductById(String id) async {
    try {
      final response = await apiClient.get('${ApiConstants.products}/$id');

      if (response.data['success'] == true) {
        final productData = response.data['data'];
        return ProductModel.fromJson(productData);
      } else {
        throw ServerException(
          response.data['error']['message'] ?? 'Product not found',
          statusCode: response.statusCode,
        );
      }
    } catch (e) {
      if (e is ServerException) rethrow;
      throw ServerException('Failed to get product: ${e.toString()}');
    }
  }

  @override
  Future<List<String>> getCategories() async {
    try {
      final response = await apiClient.get(ApiConstants.productCategories);

      if (response.data['success'] == true) {
        final categoriesData = response.data['data'] as List;
        return categoriesData.cast<String>();
      } else {
        throw ServerException(
          response.data['error']['message'] ?? 'Failed to get categories',
          statusCode: response.statusCode,
        );
      }
    } catch (e) {
      if (e is ServerException) rethrow;
      throw ServerException('Failed to get categories: ${e.toString()}');
    }
  }

  @override
  Future<List<ProductModel>> searchProducts({
    required String query,
    String? category,
    int page = 1,
    int limit = 20,
  }) async {
    try {
      final queryParams = <String, dynamic>{
        'q': query,
        'page': page,
        'limit': limit,
        if (category != null) 'category': category,
      };

      final response = await apiClient.get(
        ApiConstants.productSearch,
        queryParameters: queryParams,
      );

      if (response.data['success'] == true) {
        final productsData = response.data['data']['products'] as List;
        return productsData
            .map((json) => ProductModel.fromJson(json))
            .toList();
      } else {
        throw ServerException(
          response.data['error']['message'] ?? 'Search failed',
          statusCode: response.statusCode,
        );
      }
    } catch (e) {
      if (e is ServerException) rethrow;
      throw ServerException('Search failed: ${e.toString()}');
    }
  }

  @override
  Future<List<ProductModel>> getFeaturedProducts({
    int limit = 10,
  }) async {
    try {
      final response = await apiClient.get(
        ApiConstants.products,
        queryParameters: {
          'featured': true,
          'limit': limit,
        },
      );

      if (response.data['success'] == true) {
        final productsData = response.data['data']['products'] as List;
        return productsData
            .map((json) => ProductModel.fromJson(json))
            .toList();
      } else {
        throw ServerException(
          response.data['error']['message'] ?? 'Failed to get featured products',
          statusCode: response.statusCode,
        );
      }
    } catch (e) {
      if (e is ServerException) rethrow;
      throw ServerException('Failed to get featured products: ${e.toString()}');
    }
  }
}