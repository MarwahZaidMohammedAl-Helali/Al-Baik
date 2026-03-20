import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../core/di/injection_container.dart';
import '../../../products/presentation/bloc/products_bloc.dart';
import '../../../products/presentation/bloc/products_event.dart';
import '../../../products/presentation/bloc/products_state.dart';
import '../../../products/domain/entities/product.dart';

class AdminInventoryManagementPage extends StatelessWidget {
  const AdminInventoryManagementPage({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (context) => sl<ProductsBloc>()..add(LoadProducts()),
      child: const AdminInventoryManagementView(),
    );
  }
}

class AdminInventoryManagementView extends StatefulWidget {
  const AdminInventoryManagementView({super.key});

  @override
  State<AdminInventoryManagementView> createState() => _AdminInventoryManagementViewState();
}

class _AdminInventoryManagementViewState extends State<AdminInventoryManagementView>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  String _searchQuery = '';

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 4, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Inventory Management'),
        bottom: TabBar(
          controller: _tabController,
          isScrollable: true,
          tabs: const [
            Tab(text: 'All Items'),
            Tab(text: 'Low Stock'),
            Tab(text: 'Out of Stock'),
            Tab(text: 'Alerts'),
          ],
        ),
      ),
      body: Column(
        children: [
          // Search and Actions Bar
          Container(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    decoration: InputDecoration(
                      hintText: 'Search inventory...',
                      prefixIcon: const Icon(Icons.search),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(8),
                      ),
                      contentPadding: const EdgeInsets.symmetric(
                        horizontal: 16,
                        vertical: 12,
                      ),
                    ),
                    onChanged: (query) {
                      setState(() {
                        _searchQuery = query;
                      });
                    },
                  ),
                ),
                const SizedBox(width: 12),
                IconButton(
                  icon: const Icon(Icons.file_download),
                  onPressed: () => _exportInventory(context),
                  tooltip: 'Export Inventory',
                ),
              ],
            ),
          ),
          
          // Tab Content
          Expanded(
            child: TabBarView(
              controller: _tabController,
              children: [
                _InventoryList(
                  filter: InventoryFilter.all,
                  searchQuery: _searchQuery,
                ),
                _InventoryList(
                  filter: InventoryFilter.lowStock,
                  searchQuery: _searchQuery,
                ),
                _InventoryList(
                  filter: InventoryFilter.outOfStock,
                  searchQuery: _searchQuery,
                ),
                const _InventoryAlerts(),
              ],
            ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => _showBulkUpdateDialog(context),
        child: const Icon(Icons.edit),
        tooltip: 'Bulk Update',
      ),
    );
  }

  void _exportInventory(BuildContext context) {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Inventory exported successfully'),
        backgroundColor: Colors.green,
      ),
    );
  }

  void _showBulkUpdateDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => const _BulkUpdateDialog(),
    );
  }
}

enum InventoryFilter { all, lowStock, outOfStock }

class _InventoryList extends StatelessWidget {
  final InventoryFilter filter;
  final String searchQuery;

  const _InventoryList({
    required this.filter,
    required this.searchQuery,
  });

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<ProductsBloc, ProductsState>(
      builder: (context, state) {
        if (state is ProductsLoading) {
          return const Center(
            child: CircularProgressIndicator(),
          );
        }
        
        if (state is ProductsError) {
          return Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(
                  Icons.error_outline,
                  size: 64,
                  color: Colors.red[300],
                ),
                const SizedBox(height: 16),
                Text(
                  'Error loading inventory',
                  style: Theme.of(context).textTheme.headlineSmall,
                ),
                const SizedBox(height: 8),
                Text(
                  state.message,
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: Colors.grey[600],
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 24),
                ElevatedButton(
                  onPressed: () {
                    context.read<ProductsBloc>().add(LoadProducts());
                  },
                  child: const Text('Retry'),
                ),
              ],
            ),
          );
        }
        
        if (state is ProductsLoaded) {
          final filteredProducts = _filterProducts(state.products);
          
          if (filteredProducts.isEmpty) {
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
                    _getEmptyMessage(),
                    style: Theme.of(context).textTheme.headlineSmall,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    _getEmptySubtitle(),
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: Colors.grey[600],
                    ),
                  ),
                ],
              ),
            );
          }
          
          return RefreshIndicator(
            onRefresh: () async {
              context.read<ProductsBloc>().add(LoadProducts());
            },
            child: ListView.builder(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              itemCount: filteredProducts.length,
              itemBuilder: (context, index) {
                final product = filteredProducts[index];
                return _InventoryCard(
                  product: product,
                  onUpdateStock: () => _showUpdateStockDialog(context, product),
                );
              },
            ),
          );
        }
        
        return const SizedBox.shrink();
      },
    );
  }

  List<Product> _filterProducts(List<Product> products) {
    var filtered = products;
    
    // Apply filter
    switch (filter) {
      case InventoryFilter.lowStock:
        filtered = products.where((p) => p.stockQuantity > 0 && p.stockQuantity < 10).toList();
        break;
      case InventoryFilter.outOfStock:
        filtered = products.where((p) => p.stockQuantity == 0).toList();
        break;
      case InventoryFilter.all:
        break;
    }
    
    // Apply search
    if (searchQuery.isNotEmpty) {
      filtered = filtered.where((product) =>
          product.name.toLowerCase().contains(searchQuery.toLowerCase()) ||
          product.sku.toLowerCase().contains(searchQuery.toLowerCase())).toList();
    }
    
    return filtered;
  }

  String _getEmptyMessage() {
    switch (filter) {
      case InventoryFilter.lowStock:
        return 'No Low Stock Items';
      case InventoryFilter.outOfStock:
        return 'No Out of Stock Items';
      case InventoryFilter.all:
        return 'No Inventory Items';
    }
  }

  String _getEmptySubtitle() {
    switch (filter) {
      case InventoryFilter.lowStock:
        return 'All items have sufficient stock';
      case InventoryFilter.outOfStock:
        return 'All items are in stock';
      case InventoryFilter.all:
        return 'Add products to manage inventory';
    }
  }

  void _showUpdateStockDialog(BuildContext context, Product product) {
    showDialog(
      context: context,
      builder: (context) => _UpdateStockDialog(product: product),
    );
  }
}

class _InventoryCard extends StatelessWidget {
  final Product product;
  final VoidCallback onUpdateStock;

  const _InventoryCard({
    required this.product,
    required this.onUpdateStock,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            // Product Image
            Container(
              width: 60,
              height: 60,
              decoration: BoxDecoration(
                color: Colors.grey[200],
                borderRadius: BorderRadius.circular(8),
              ),
              child: product.imageUrl != null
                  ? ClipRRect(
                      borderRadius: BorderRadius.circular(8),
                      child: Image.network(
                        product.imageUrl!,
                        fit: BoxFit.cover,
                        errorBuilder: (context, error, stackTrace) =>
                            const Icon(Icons.image, color: Colors.grey),
                      ),
                    )
                  : const Icon(Icons.image, color: Colors.grey),
            ),
            
            const SizedBox(width: 16),
            
            // Product Info
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    product.name,
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                  
                  const SizedBox(height: 4),
                  
                  Text(
                    'SKU: ${product.sku}',
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: Colors.grey[600],
                    ),
                  ),
                  
                  const SizedBox(height: 8),
                  
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 12,
                          vertical: 6,
                        ),
                        decoration: BoxDecoration(
                          color: _getStockColor(product.stockQuantity).withOpacity(0.2),
                          borderRadius: BorderRadius.circular(16),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(
                              _getStockIcon(product.stockQuantity),
                              size: 16,
                              color: _getStockColor(product.stockQuantity),
                            ),
                            const SizedBox(width: 4),
                            Text(
                              '${product.stockQuantity} units',
                              style: TextStyle(
                                color: _getStockColor(product.stockQuantity),
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ],
                        ),
                      ),
                      
                      const SizedBox(width: 12),
                      
                      Text(
                        '\$${product.price.toStringAsFixed(2)}',
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          fontWeight: FontWeight.w600,
                          color: Colors.grey[700],
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            
            // Update Button
            IconButton(
              onPressed: onUpdateStock,
              icon: const Icon(Icons.edit),
              tooltip: 'Update Stock',
            ),
          ],
        ),
      ),
    );
  }

  Color _getStockColor(int stock) {
    if (stock == 0) return Colors.red;
    if (stock < 10) return Colors.orange;
    return Colors.green;
  }

  IconData _getStockIcon(int stock) {
    if (stock == 0) return Icons.error;
    if (stock < 10) return Icons.warning;
    return Icons.check_circle;
  }
}

class _InventoryAlerts extends StatelessWidget {
  const _InventoryAlerts();

  @override
  Widget build(BuildContext context) {
    final alerts = _getMockAlerts();
    
    if (alerts.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.notifications_none,
              size: 64,
              color: Colors.grey[400],
            ),
            const SizedBox(height: 16),
            Text(
              'No Alerts',
              style: Theme.of(context).textTheme.headlineSmall,
            ),
            const SizedBox(height: 8),
            Text(
              'All inventory levels are normal',
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                color: Colors.grey[600],
              ),
            ),
          ],
        ),
      );
    }
    
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: alerts.length,
      itemBuilder: (context, index) {
        final alert = alerts[index];
        return _AlertCard(alert: alert);
      },
    );
  }

  List<InventoryAlert> _getMockAlerts() {
    return [
      InventoryAlert(
        id: '1',
        productName: 'Wireless Headphones',
        sku: 'WH-001',
        type: AlertType.lowStock,
        currentStock: 5,
        threshold: 10,
        createdAt: DateTime.now().subtract(const Duration(hours: 2)),
      ),
      InventoryAlert(
        id: '2',
        productName: 'Bluetooth Speaker',
        sku: 'BS-002',
        type: AlertType.outOfStock,
        currentStock: 0,
        threshold: 5,
        createdAt: DateTime.now().subtract(const Duration(hours: 6)),
      ),
    ];
  }
}

class _AlertCard extends StatelessWidget {
  final InventoryAlert alert;

  const _AlertCard({required this.alert});

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            Container(
              width: 48,
              height: 48,
              decoration: BoxDecoration(
                color: _getAlertColor(alert.type).withOpacity(0.2),
                borderRadius: BorderRadius.circular(24),
              ),
              child: Icon(
                _getAlertIcon(alert.type),
                color: _getAlertColor(alert.type),
              ),
            ),
            
            const SizedBox(width: 16),
            
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    alert.productName,
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  
                  const SizedBox(height: 4),
                  
                  Text(
                    'SKU: ${alert.sku}',
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: Colors.grey[600],
                    ),
                  ),
                  
                  const SizedBox(height: 8),
                  
                  Text(
                    _getAlertMessage(alert),
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: _getAlertColor(alert.type),
                    ),
                  ),
                  
                  const SizedBox(height: 4),
                  
                  Text(
                    _formatTime(alert.createdAt),
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: Colors.grey[500],
                    ),
                  ),
                ],
              ),
            ),
            
            IconButton(
              onPressed: () {
                // TODO: Dismiss alert
              },
              icon: const Icon(Icons.close),
              tooltip: 'Dismiss',
            ),
          ],
        ),
      ),
    );
  }

  Color _getAlertColor(AlertType type) {
    switch (type) {
      case AlertType.lowStock:
        return Colors.orange;
      case AlertType.outOfStock:
        return Colors.red;
    }
  }

  IconData _getAlertIcon(AlertType type) {
    switch (type) {
      case AlertType.lowStock:
        return Icons.warning;
      case AlertType.outOfStock:
        return Icons.error;
    }
  }

  String _getAlertMessage(InventoryAlert alert) {
    switch (alert.type) {
      case AlertType.lowStock:
        return 'Low stock: ${alert.currentStock} units remaining (threshold: ${alert.threshold})';
      case AlertType.outOfStock:
        return 'Out of stock - immediate restocking required';
    }
  }

  String _formatTime(DateTime dateTime) {
    final now = DateTime.now();
    final difference = now.difference(dateTime);
    
    if (difference.inHours < 1) {
      return '${difference.inMinutes} minutes ago';
    } else if (difference.inHours < 24) {
      return '${difference.inHours} hours ago';
    } else {
      return '${difference.inDays} days ago';
    }
  }
}

class _UpdateStockDialog extends StatefulWidget {
  final Product product;

  const _UpdateStockDialog({required this.product});

  @override
  State<_UpdateStockDialog> createState() => _UpdateStockDialogState();
}

class _UpdateStockDialogState extends State<_UpdateStockDialog> {
  final _formKey = GlobalKey<FormState>();
  late TextEditingController _stockController;
  late TextEditingController _reasonController;
  String _updateType = 'set';

  @override
  void initState() {
    super.initState();
    _stockController = TextEditingController(text: widget.product.stockQuantity.toString());
    _reasonController = TextEditingController();
  }

  @override
  void dispose() {
    _stockController.dispose();
    _reasonController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: Text('Update Stock - ${widget.product.name}'),
      content: Form(
        key: _formKey,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              'Current Stock: ${widget.product.stockQuantity} units',
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                fontWeight: FontWeight.w600,
              ),
            ),
            
            const SizedBox(height: 16),
            
            DropdownButtonFormField<String>(
              value: _updateType,
              decoration: const InputDecoration(
                labelText: 'Update Type',
                border: OutlineInputBorder(),
              ),
              items: const [
                DropdownMenuItem(value: 'set', child: Text('Set to')),
                DropdownMenuItem(value: 'add', child: Text('Add')),
                DropdownMenuItem(value: 'subtract', child: Text('Subtract')),
              ],
              onChanged: (value) {
                if (value != null) {
                  setState(() {
                    _updateType = value;
                  });
                }
              },
            ),
            
            const SizedBox(height: 16),
            
            TextFormField(
              controller: _stockController,
              decoration: const InputDecoration(
                labelText: 'Quantity',
                border: OutlineInputBorder(),
              ),
              keyboardType: TextInputType.number,
              validator: (value) {
                if (value == null || value.isEmpty) {
                  return 'Please enter quantity';
                }
                if (int.tryParse(value) == null) {
                  return 'Please enter a valid number';
                }
                return null;
              },
            ),
            
            const SizedBox(height: 16),
            
            TextFormField(
              controller: _reasonController,
              decoration: const InputDecoration(
                labelText: 'Reason (optional)',
                border: OutlineInputBorder(),
              ),
              maxLines: 2,
            ),
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: const Text('Cancel'),
        ),
        ElevatedButton(
          onPressed: () {
            if (_formKey.currentState!.validate()) {
              Navigator.of(context).pop();
              // TODO: Implement stock update
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('Stock updated successfully'),
                  backgroundColor: Colors.green,
                ),
              );
            }
          },
          child: const Text('Update'),
        ),
      ],
    );
  }
}

class _BulkUpdateDialog extends StatefulWidget {
  const _BulkUpdateDialog();

  @override
  State<_BulkUpdateDialog> createState() => _BulkUpdateDialogState();
}

class _BulkUpdateDialogState extends State<_BulkUpdateDialog> {
  String _selectedAction = 'increase';
  final _percentageController = TextEditingController();

  @override
  void dispose() {
    _percentageController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Bulk Update Inventory'),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          DropdownButtonFormField<String>(
            value: _selectedAction,
            decoration: const InputDecoration(
              labelText: 'Action',
              border: OutlineInputBorder(),
            ),
            items: const [
              DropdownMenuItem(value: 'increase', child: Text('Increase by %')),
              DropdownMenuItem(value: 'decrease', child: Text('Decrease by %')),
              DropdownMenuItem(value: 'set_minimum', child: Text('Set minimum stock')),
            ],
            onChanged: (value) {
              if (value != null) {
                setState(() {
                  _selectedAction = value;
                });
              }
            },
          ),
          
          const SizedBox(height: 16),
          
          TextFormField(
            controller: _percentageController,
            decoration: InputDecoration(
              labelText: _selectedAction == 'set_minimum' ? 'Minimum Stock' : 'Percentage',
              border: const OutlineInputBorder(),
            ),
            keyboardType: TextInputType.number,
          ),
        ],
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: const Text('Cancel'),
        ),
        ElevatedButton(
          onPressed: () {
            Navigator.of(context).pop();
            // TODO: Implement bulk update
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Text('Bulk update completed successfully'),
                backgroundColor: Colors.green,
              ),
            );
          },
          child: const Text('Apply'),
        ),
      ],
    );
  }
}

// Data Models
class InventoryAlert {
  final String id;
  final String productName;
  final String sku;
  final AlertType type;
  final int currentStock;
  final int threshold;
  final DateTime createdAt;

  InventoryAlert({
    required this.id,
    required this.productName,
    required this.sku,
    required this.type,
    required this.currentStock,
    required this.threshold,
    required this.createdAt,
  });
}

enum AlertType { lowStock, outOfStock }