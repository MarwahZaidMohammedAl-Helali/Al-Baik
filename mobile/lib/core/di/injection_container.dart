import 'package:dio/dio.dart';
import 'package:get_it/get_it.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:connectivity_plus/connectivity_plus.dart';

import '../network/api_client.dart';
import '../network/network_info.dart';
import '../storage/local_storage.dart';
import '../offline/offline_manager.dart';
import '../integration/integration_service.dart';
import '../../features/auth/data/datasources/auth_remote_data_source.dart';
import '../../features/auth/data/repositories/auth_repository_impl.dart';
import '../../features/auth/domain/repositories/auth_repository.dart';
import '../../features/auth/domain/usecases/login_usecase.dart';
import '../../features/auth/domain/usecases/logout_usecase.dart';
import '../../features/auth/domain/usecases/register_usecase.dart';
import '../../features/auth/presentation/bloc/auth_bloc.dart';
import '../../features/products/data/datasources/product_remote_data_source.dart';
import '../../features/products/data/repositories/product_repository_impl.dart';
import '../../features/products/domain/repositories/product_repository.dart';
import '../../features/products/domain/usecases/get_products_usecase.dart';
import '../../features/products/domain/usecases/get_product_by_id_usecase.dart';
import '../../features/products/domain/usecases/search_products_usecase.dart';
import '../../features/products/presentation/bloc/products_bloc.dart';
import '../../features/products/presentation/bloc/product_detail_bloc.dart';
import '../../features/cart/data/datasources/cart_local_data_source.dart';
import '../../features/cart/data/datasources/cart_remote_data_source.dart';
import '../../features/cart/data/repositories/cart_repository_impl.dart';
import '../../features/cart/domain/repositories/cart_repository.dart';
import '../../features/cart/domain/usecases/add_to_cart_usecase.dart';
import '../../features/cart/domain/usecases/get_cart_usecase.dart';
import '../../features/cart/domain/usecases/update_cart_item_usecase.dart';
import '../../features/cart/domain/usecases/remove_from_cart_usecase.dart';
import '../../features/cart/domain/usecases/clear_cart_usecase.dart';
import '../../features/cart/presentation/bloc/cart_bloc.dart';
import '../../features/checkout/data/repositories/checkout_repository_impl.dart';
import '../../features/checkout/domain/repositories/checkout_repository.dart';
import '../../features/checkout/domain/usecases/get_user_addresses_usecase.dart';
import '../../features/checkout/domain/usecases/calculate_checkout_usecase.dart';
import '../../features/checkout/domain/usecases/place_order_usecase.dart';
import '../../features/checkout/presentation/bloc/checkout_bloc.dart';
import '../../features/orders/data/datasources/order_tracking_remote_data_source.dart';
import '../../features/orders/data/repositories/order_tracking_repository_impl.dart';
import '../../features/orders/domain/repositories/order_tracking_repository.dart';
import '../../features/orders/domain/usecases/get_user_orders_usecase.dart';
import '../../features/orders/domain/usecases/get_order_tracking_usecase.dart';
import '../../features/orders/domain/usecases/get_order_history_usecase.dart';
import '../../features/orders/presentation/bloc/order_tracking_bloc.dart';

final sl = GetIt.instance;

Future<void> init() async {
  // External dependencies
  final sharedPreferences = await SharedPreferences.getInstance();
  sl.registerLazySingleton(() => sharedPreferences);
  sl.registerLazySingleton(() => Connectivity());
  
  // Core
  sl.registerLazySingleton<NetworkInfo>(() => NetworkInfoImpl());
  sl.registerLazySingleton(() => LocalStorage());
  
  // Offline and Integration
  sl.registerLazySingleton(() => OfflineManager(
    prefs: sl(),
    networkInfo: sl(),
    connectivity: sl(),
  ));
  sl.registerLazySingleton(() => IntegrationService());
  
  // HTTP Client
  sl.registerLazySingleton(() => Dio());
  sl.registerLazySingleton<ApiClient>(() => ApiClient(sl()));
  
  // Initialize integration service
  await sl<IntegrationService>().initialize(
    offlineManager: sl(),
    networkInfo: sl(),
  );
  
  // Auth Data sources
  sl.registerLazySingleton<AuthRemoteDataSource>(
    () => AuthRemoteDataSourceImpl(apiClient: sl()),
  );
  
  // Auth Repositories
  sl.registerLazySingleton<AuthRepository>(
    () => AuthRepositoryImpl(
      remoteDataSource: sl(),
      localStorage: sl(),
      networkInfo: sl(),
    ),
  );
  
  // Auth Use cases
  sl.registerLazySingleton(() => LoginUseCase(sl()));
  sl.registerLazySingleton(() => LogoutUseCase(sl()));
  sl.registerLazySingleton(() => RegisterUseCase(sl()));
  
  // Auth BLoCs
  sl.registerFactory(
    () => AuthBloc(
      loginUseCase: sl(),
      logoutUseCase: sl(),
      registerUseCase: sl(),
    ),
  );
  
  // Product Data sources
  sl.registerLazySingleton<ProductRemoteDataSource>(
    () => ProductRemoteDataSourceImpl(apiClient: sl()),
  );
  
  // Product Repositories
  sl.registerLazySingleton<ProductRepository>(
    () => ProductRepositoryImpl(
      remoteDataSource: sl(),
      networkInfo: sl(),
    ),
  );
  
  // Product Use cases
  sl.registerLazySingleton(() => GetProductsUseCase(sl()));
  sl.registerLazySingleton(() => GetProductByIdUseCase(sl()));
  sl.registerLazySingleton(() => SearchProductsUseCase(sl()));
  
  // Product BLoCs
  sl.registerFactory(
    () => ProductsBloc(
      getProductsUseCase: sl(),
      searchProductsUseCase: sl(),
    ),
  );
  
  sl.registerFactory(
    () => ProductDetailBloc(
      getProductByIdUseCase: sl(),
    ),
  );
  
  // Cart Data sources
  sl.registerLazySingleton<CartLocalDataSource>(
    () => CartLocalDataSourceImpl(sharedPreferences: sl()),
  );
  
  sl.registerLazySingleton<CartRemoteDataSource>(
    () => CartRemoteDataSourceImpl(apiClient: sl()),
  );
  
  // Cart Repositories
  sl.registerLazySingleton<CartRepository>(
    () => CartRepositoryImpl(
      localDataSource: sl(),
      remoteDataSource: sl(),
      productRepository: sl(),
      networkInfo: sl(),
    ),
  );
  
  // Cart Use cases
  sl.registerLazySingleton(() => GetCartUseCase(sl()));
  sl.registerLazySingleton(() => AddToCartUseCase(sl()));
  sl.registerLazySingleton(() => UpdateCartItemUseCase(sl()));
  sl.registerLazySingleton(() => RemoveFromCartUseCase(sl()));
  sl.registerLazySingleton(() => ClearCartUseCase(sl()));
  
  // Cart BLoCs
  sl.registerFactory(
    () => CartBloc(
      getCartUseCase: sl(),
      addToCartUseCase: sl(),
      updateCartItemUseCase: sl(),
      removeFromCartUseCase: sl(),
      clearCartUseCase: sl(),
    ),
  );
  
  // Checkout Repositories
  sl.registerLazySingleton<CheckoutRepository>(
    () => CheckoutRepositoryImpl(),
  );
  
  // Checkout Use cases
  sl.registerLazySingleton(() => GetUserAddressesUseCase(sl()));
  sl.registerLazySingleton(() => CalculateCheckoutUseCase(sl()));
  sl.registerLazySingleton(() => PlaceOrderUseCase(sl()));
  
  // Checkout BLoCs
  sl.registerFactory(
    () => CheckoutBloc(
      getUserAddressesUseCase: sl(),
      calculateCheckoutUseCase: sl(),
      placeOrderUseCase: sl(),
    ),
  );
  
  // Order Tracking Data sources
  sl.registerLazySingleton<OrderTrackingRemoteDataSource>(
    () => OrderTrackingRemoteDataSourceImpl(apiClient: sl()),
  );
  
  // Order Tracking Repositories
  sl.registerLazySingleton<OrderTrackingRepository>(
    () => OrderTrackingRepositoryImpl(
      remoteDataSource: sl(),
      networkInfo: sl(),
    ),
  );
  
  // Order Tracking Use cases
  sl.registerLazySingleton(() => GetUserOrdersUseCase(sl()));
  sl.registerLazySingleton(() => GetOrderTrackingUseCase(sl()));
  sl.registerLazySingleton(() => GetOrderHistoryUseCase(sl()));
  
  // Order Tracking BLoCs
  sl.registerFactory(
    () => OrderTrackingBloc(
      getUserOrdersUseCase: sl(),
      getOrderTrackingUseCase: sl(),
      getOrderHistoryUseCase: sl(),
    ),
  );
}