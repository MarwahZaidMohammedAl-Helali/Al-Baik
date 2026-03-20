import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/di/injection_container.dart' as di;
import '../../../../core/integration/integration_service.dart';
import '../../../../core/error/error_handler.dart';
import '../../../../core/loading/loading_manager.dart';
import '../bloc/products_bloc.dart';
import '../widgets/product_card.dart';
import '../widgets/product_search_bar.dart';
import '../widgets/product_filter_bar.dart';

class ProductsPage extends StatelessWidget {
  const ProductsPage({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (context) => di.sl<ProductsBloc>()..add(const LoadProducts()),
      child: const ProductsView(),
    );
  }
}

class ProductsView extends StatefulWidget {
  const ProductsView({super.key});

  @override
  State<ProductsView> createState() => _ProductsViewState();
}

class _ProductsViewState extends State<ProductsView> with IntegrationAwareMixin {
  final _scrollController = ScrollController();
  final _searchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _scrollController.addListener(_onScroll);
  }

  @override
  void dispose() {
    _scrollController.dispose();
    _searchController.dispose();
    super.dispose();
  }

  @override
  void onConnectivityChanged(bool isConnected) {
    if (isConnected) {
      // Refresh data when coming back online
      context.read<ProductsBloc>().add(const LoadProducts());
      
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Back online! Refreshing data...'),
          backgroundColor: Colors.green,
          duration: Duration(seconds: 2),
        ),
      );
    }
  }

  void _onScroll() {
    if (_isBottom) {
      context.read<ProductsBloc>().add(const LoadMoreProducts());
    }
  }

  bool get _isBottom {
    if (!_scrollController.hasClients) return false;
    final maxScroll = _scrollController.position.maxScrollExtent;
    final currentScroll = _scrollController.offset;
    return currentScroll >= (maxScroll * 0.9);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Products'),
        actions: [
          IconButton(
            icon: const Icon(Icons.filter_list),
            onPressed: () => _showFilterDialog(context),
          ),
          if (isOffline)
            IconButton(
              icon: const Icon(Icons.wifi_off),
              onPressed: () => _showOfflineInfo(context),
            ),
        ],
      ),
      body: Column(
        children: [
          // Offline Banner
          buildOfflineBanner(),
          
          // Search Bar
          ProductSearchBar(
            controller: _searchController,
            onSearch: (query) {
              if (isOffline) {
                _showOfflineMessage(context, 'Search is not available offline');
                return;
              }
              
              if (query.isNotEmpty) {
                context.read<ProductsBloc>().add(SearchProducts(query: query));
              } else {
                context.read<ProductsBloc>().add(const LoadProducts());
              }
            },
          ),
          
          // Filter Bar
          const ProductFilterBar(),
          
          // Products List
          Expanded(
            child: BlocBuilder<ProductsBloc, ProductsState>(
              builder: (context, state) {
                if (state is ProductsLoading) {
                  return IntegratedLoadingWidget(
                    message: isOffline ? 'Loading cached products...' : 'Loading products...',
                    showOfflineIndicator: isOffline,
                  );
                } else if (state is ProductsError) {
                  return IntegratedErrorWidget(
                    message: state.message,
                    isOffline: isOffline,
                    onRetry: () {
                      if (isOffline) {
                        _showOfflineMessage(context, 'Cannot retry while offline');
                        return;
                      }
                      context.read<ProductsBloc>().add(const LoadProducts());
                    },
                  );
                } else if (state is ProductsLoaded || state is ProductsSearchResults) {
                  final products = state is ProductsLoaded 
                      ? state.products 
                      : (state as ProductsSearchResults).products;
                  
                  if (products.isEmpty) {
                    return Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(
                            Icons.inventory_2_outlined,
                            size: 64,
                            color: Colors.grey[400],
                          ),
                          const SizedBox(height: 16),
                          Text(
                            state is ProductsSearchResults 
                                ? 'No products found' 
                                : 'No products available',
                            style: Theme.of(context).textTheme.titleLarge,
                          ),
                          const SizedBox(height: 8),
                          Text(
                            state is ProductsSearchResults 
                                ? 'Try adjusting your search terms'
                                : isOffline 
                                    ? 'No cached products available'
                                    : 'Products will appear here when available',
                            style: Theme.of(context).textTheme.bodyMedium,
                            textAlign: TextAlign.center,
                          ),
                          if (isOffline) ...[
                            const SizedBox(height: 16),
                            Text(
                              'Connect to internet to load products',
                              style: TextStyle(
                                color: Colors.orange[600],
                                fontSize: 12,
                              ),
                            ),
                          ],
                        ],
                      ),
                    );
                  }

                  return RefreshIndicator(
                    onRefresh: () async {
                      if (isOffline) {
                        _showOfflineMessage(context, 'Cannot refresh while offline');
                        return;
                      }
                      
                      await executeIntegratedOperation(
                        operation: () async {
                          context.read<ProductsBloc>().add(const RefreshProducts());
                          // Wait a bit for the bloc to process
                          await Future.delayed(const Duration(milliseconds: 500));
                        },
                        loadingMessage: 'Refreshing products...',
                        successMessage: 'Products refreshed',
                        showSuccess: true,
                      );
                    },
                    child: GridView.builder(
                      controller: _scrollController,
                      padding: const EdgeInsets.all(16),
                      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                        crossAxisCount: 2,
                        childAspectRatio: 0.75,
                        crossAxisSpacing: 16,
                        mainAxisSpacing: 16,
                      ),
                      itemCount: products.length + 
                          ((state is ProductsLoaded && !state.hasReachedMax) ||
                           (state is ProductsSearchResults && !state.hasReachedMax) ? 1 : 0),
                      itemBuilder: (context, index) {
                        if (index >= products.length) {
                          return LoadingManager.buildLoadingWidget(
                            message: isOffline ? 'Loading from cache...' : 'Loading more...',
                          );
                        }
                        
                        final product = products[index];
                        return ProductCard(
                          product: product,
                          onTap: () => context.goNamed(
                            'product-detail',
                            pathParameters: {'productId': product.id},
                          ),
                          isOffline: isOffline,
                        );
                      },
                    ),
                  );
                }
                
                return const SizedBox.shrink();
              },
            ),
          ),
        ],
      ),
    );
  }

  void _showFilterDialog(BuildContext context) {
    if (isOffline) {
      _showOfflineMessage(context, 'Filters are not available offline');
      return;
    }
    
    showModalBottomSheet(
      context: context,
      builder: (context) => Container(
        padding: const EdgeInsets.all(16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Filter Products',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 16),
            // TODO: Add filter options (category, price range, etc.)
            const Text('Filter options coming soon'),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: TextButton(
                    onPressed: () => Navigator.pop(context),
                    child: const Text('Cancel'),
                  ),
                ),
                Expanded(
                  child: ElevatedButton(
                    onPressed: () {
                      Navigator.pop(context);
                      // TODO: Apply filters
                    },
                    child: const Text('Apply'),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  void _showOfflineMessage(BuildContext context, String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            const Icon(Icons.wifi_off, color: Colors.white, size: 16),
            const SizedBox(width: 8),
            Expanded(child: Text(message)),
          ],
        ),
        backgroundColor: Colors.orange[600],
        duration: const Duration(seconds: 3),
      ),
    );
  }

  void _showOfflineInfo(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Row(
          children: [
            Icon(Icons.wifi_off, color: Colors.orange),
            SizedBox(width: 8),
            Text('Offline Mode'),
          ],
        ),
        content: const Text(
          'You are currently offline. Some features may be limited:\n\n'
          '• Search is disabled\n'
          '• Filters are disabled\n'
          '• Cannot refresh data\n'
          '• Showing cached content only\n\n'
          'Connect to the internet to access all features.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('OK'),
          ),
        ],
      ),
    );
  }
}