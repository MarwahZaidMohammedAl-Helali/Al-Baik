part of 'products_bloc.dart';

abstract class ProductsState extends Equatable {
  const ProductsState();

  @override
  List<Object?> get props => [];
}

class ProductsInitial extends ProductsState {}

class ProductsLoading extends ProductsState {}

class ProductsLoaded extends ProductsState {
  final List<Product> products;
  final bool hasReachedMax;
  final int currentPage;
  final String? category;
  final String? sortBy;
  final String? sortOrder;

  const ProductsLoaded({
    required this.products,
    required this.hasReachedMax,
    required this.currentPage,
    this.category,
    this.sortBy,
    this.sortOrder,
  });

  ProductsLoaded copyWith({
    List<Product>? products,
    bool? hasReachedMax,
    int? currentPage,
    String? category,
    String? sortBy,
    String? sortOrder,
  }) {
    return ProductsLoaded(
      products: products ?? this.products,
      hasReachedMax: hasReachedMax ?? this.hasReachedMax,
      currentPage: currentPage ?? this.currentPage,
      category: category ?? this.category,
      sortBy: sortBy ?? this.sortBy,
      sortOrder: sortOrder ?? this.sortOrder,
    );
  }

  @override
  List<Object?> get props => [
        products,
        hasReachedMax,
        currentPage,
        category,
        sortBy,
        sortOrder,
      ];
}

class ProductsSearchResults extends ProductsState {
  final List<Product> products;
  final String query;
  final bool hasReachedMax;
  final int currentPage;
  final String? category;

  const ProductsSearchResults({
    required this.products,
    required this.query,
    required this.hasReachedMax,
    required this.currentPage,
    this.category,
  });

  ProductsSearchResults copyWith({
    List<Product>? products,
    String? query,
    bool? hasReachedMax,
    int? currentPage,
    String? category,
  }) {
    return ProductsSearchResults(
      products: products ?? this.products,
      query: query ?? this.query,
      hasReachedMax: hasReachedMax ?? this.hasReachedMax,
      currentPage: currentPage ?? this.currentPage,
      category: category ?? this.category,
    );
  }

  @override
  List<Object?> get props => [
        products,
        query,
        hasReachedMax,
        currentPage,
        category,
      ];
}

class ProductsError extends ProductsState {
  final String message;

  const ProductsError(this.message);

  @override
  List<Object> get props => [message];
}