import 'package:bloc/bloc.dart';
import 'package:equatable/equatable.dart';

import '../../domain/entities/product.dart';
import '../../domain/usecases/get_products_usecase.dart';
import '../../domain/usecases/search_products_usecase.dart';

part 'products_event.dart';
part 'products_state.dart';

class ProductsBloc extends Bloc<ProductsEvent, ProductsState> {
  final GetProductsUseCase getProductsUseCase;
  final SearchProductsUseCase searchProductsUseCase;

  ProductsBloc({
    required this.getProductsUseCase,
    required this.searchProductsUseCase,
  }) : super(ProductsInitial()) {
    on<LoadProducts>(_onLoadProducts);
    on<SearchProducts>(_onSearchProducts);
    on<LoadMoreProducts>(_onLoadMoreProducts);
    on<RefreshProducts>(_onRefreshProducts);
    on<FilterProducts>(_onFilterProducts);
  }

  Future<void> _onLoadProducts(
    LoadProducts event,
    Emitter<ProductsState> emit,
  ) async {
    emit(ProductsLoading());

    final result = await getProductsUseCase(
      GetProductsParams(
        page: 1,
        limit: 20,
        category: event.category,
        sortBy: event.sortBy,
        sortOrder: event.sortOrder,
      ),
    );

    result.fold(
      (failure) => emit(ProductsError(failure.message)),
      (products) => emit(ProductsLoaded(
        products: products,
        hasReachedMax: products.length < 20,
        currentPage: 1,
        category: event.category,
        sortBy: event.sortBy,
        sortOrder: event.sortOrder,
      )),
    );
  }

  Future<void> _onSearchProducts(
    SearchProducts event,
    Emitter<ProductsState> emit,
  ) async {
    emit(ProductsLoading());

    final result = await searchProductsUseCase(
      SearchProductsParams(
        query: event.query,
        category: event.category,
        page: 1,
        limit: 20,
      ),
    );

    result.fold(
      (failure) => emit(ProductsError(failure.message)),
      (products) => emit(ProductsSearchResults(
        products: products,
        query: event.query,
        hasReachedMax: products.length < 20,
        currentPage: 1,
        category: event.category,
      )),
    );
  }

  Future<void> _onLoadMoreProducts(
    LoadMoreProducts event,
    Emitter<ProductsState> emit,
  ) async {
    final currentState = state;
    if (currentState is ProductsLoaded && !currentState.hasReachedMax) {
      final result = await getProductsUseCase(
        GetProductsParams(
          page: currentState.currentPage + 1,
          limit: 20,
          category: currentState.category,
          sortBy: currentState.sortBy,
          sortOrder: currentState.sortOrder,
        ),
      );

      result.fold(
        (failure) => emit(ProductsError(failure.message)),
        (newProducts) => emit(currentState.copyWith(
          products: [...currentState.products, ...newProducts],
          hasReachedMax: newProducts.length < 20,
          currentPage: currentState.currentPage + 1,
        )),
      );
    } else if (currentState is ProductsSearchResults && !currentState.hasReachedMax) {
      final result = await searchProductsUseCase(
        SearchProductsParams(
          query: currentState.query,
          category: currentState.category,
          page: currentState.currentPage + 1,
          limit: 20,
        ),
      );

      result.fold(
        (failure) => emit(ProductsError(failure.message)),
        (newProducts) => emit(currentState.copyWith(
          products: [...currentState.products, ...newProducts],
          hasReachedMax: newProducts.length < 20,
          currentPage: currentState.currentPage + 1,
        )),
      );
    }
  }

  Future<void> _onRefreshProducts(
    RefreshProducts event,
    Emitter<ProductsState> emit,
  ) async {
    final currentState = state;
    if (currentState is ProductsLoaded) {
      add(LoadProducts(
        category: currentState.category,
        sortBy: currentState.sortBy,
        sortOrder: currentState.sortOrder,
      ));
    } else if (currentState is ProductsSearchResults) {
      add(SearchProducts(
        query: currentState.query,
        category: currentState.category,
      ));
    } else {
      add(const LoadProducts());
    }
  }

  Future<void> _onFilterProducts(
    FilterProducts event,
    Emitter<ProductsState> emit,
  ) async {
    add(LoadProducts(
      category: event.category,
      sortBy: event.sortBy,
      sortOrder: event.sortOrder,
    ));
  }
}