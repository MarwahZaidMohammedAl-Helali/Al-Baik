part of 'products_bloc.dart';

abstract class ProductsEvent extends Equatable {
  const ProductsEvent();

  @override
  List<Object?> get props => [];
}

class LoadProducts extends ProductsEvent {
  final String? category;
  final String? sortBy;
  final String? sortOrder;

  const LoadProducts({
    this.category,
    this.sortBy,
    this.sortOrder,
  });

  @override
  List<Object?> get props => [category, sortBy, sortOrder];
}

class SearchProducts extends ProductsEvent {
  final String query;
  final String? category;

  const SearchProducts(this.query, {
    this.category,
  });

  @override
  List<Object?> get props => [query, category];
}

class LoadMoreProducts extends ProductsEvent {
  const LoadMoreProducts();
}

class RefreshProducts extends ProductsEvent {
  const RefreshProducts();
}

class FilterProducts extends ProductsEvent {
  final String? category;
  final String? sortBy;
  final String? sortOrder;

  const FilterProducts({
    this.category,
    this.sortBy,
    this.sortOrder,
  });

  @override
  List<Object?> get props => [category, sortBy, sortOrder];
}