import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../core/di/injection_container.dart';
import '../../../products/presentation/bloc/products_bloc.dart';
import '../../../products/presentation/bloc/products_event.dart';
import '../../../products/presentation/bloc/products_state.dart';
import '../../../products/domain/entities/product.dart';

class EmployeeInventoryPage extends StatelessWidget {
  const EmployeeInventoryPage({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (context) => sl<ProductsBloc>()..add(LoadProducts()),
      child: const EmployeeInventoryView(),
    );
  }
}

class EmployeeInventoryView extends StatefulWidget {
  const EmployeeInventoryView({super.key});

  @override
  State<EmployeeInventoryView> createState() => _EmployeeInventoryViewState();
}

class _EmployeeInventoryViewState extends State<EmployeeInventoryView>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  String _searchQuery = '';

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
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
        title: const Text('Inventory Updates'),
        backgroundColor: Colors.purple[600],
        foregroundColor: Colors.white,
        bottom: TabBar(
          controller: _tabController,
          tabs: const [
            Tab(text: 'All Items'),
            Tab(text: 'Low Stock'),
            Tab(text: 'Recent Updates'),
          ],
        ),
      ),
      body: Column(
        children: [
          // Search and Quick Actions
          Container(
            padding: const EdgeInsets.all(16),
            child: Column(
              children: [
                TextField(
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
                
                const SizedBox(height: 12),
                
                // Quick Actions
                Row(
                  children: [
                    Expanded(
                      child: ElevatedButton.icon(
                        onPressed: () => _showQuickUpdateDialog(context),
                        icon: const Icon(Icons.speed),
                        label: const Text('Quick Update'),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.blue,
                          foregroundColor: Colors.white,
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: () => _showBarcodeScanner(context),
                        icon: const Icon(Icons.qr_code_scanner),
                        label: const Text('Scan Barcode'),
                      ),
                    ),
                  ],
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
                  filter: _InventoryFilter.all,
                  searchQuery: _searchQuery,
                ),
                _InventoryList(
                  filter: _InventoryFilter.lowStock,
                  searchQuery: _searchQuery,
                ),
                const _RecentUpdatesTab(),
              ],
            ),
          ),
        ],
      ),
    );
  }

  void _showQuickUpdateDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => const _QuickUpdateDialog(),
    );
  }

  void _showBarcodeScanner(BuildContext context) {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Barcode scanner would open here'),
        backgroundColor: Colors.blue,
      ),
    );
  }
}

enum _InventoryFilter { all, lowStock }

class _InventoryList extends StatelessWidget {
  final _InventoryFilter filter;
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
      case _InventoryFilter.lowStock:
        filtered = products.where((p) => p.stockQuantity < 10).toList();
        break;
      case _InventoryFilter.all:
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
      case _InventoryFilter.lowStock:
        return 'No Low Stock Items';
      case _InventoryFilter.all:
        return 'No Inventory Items';
    }
  }

  String _getEmptySubtitle() {
    switch (filter) {
      case _InventoryFilter.lowStock:
        return 'All items have sufficient stock';
      case _InventoryFilter.all:
        return 'Inventory items will appear here';
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
              width: 50,
              height: 50,
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
            
            const SizedBox(width: 12),
            
            // Product Info
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    product.name,
                    style: Theme.of(context).textTheme.titleSmall?.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  
                  const SizedBox(height: 2),
                  
                  Text(
                    'SKU: ${product.sku}',
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: Colors.grey[600],
                    ),
                  ),
                  
                  const SizedBox(height: 6),
                  
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 4,
                    ),
                    decoration: BoxDecoration(
                      color: _getStockColor(product.stockQuantity).withOpacity(0.2),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      '${product.stockQuantity} units',
                      style: TextStyle(
                        color: _getStockColor(product.stockQuantity),
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            
            // Quick Actions
            Column(
              children: [
                IconButton(
                  onPressed: onUpdateStock,
                  icon: const Icon(Icons.edit),
                  tooltip: 'Update Stock',
                  style: IconButton.styleFrom(
                    backgroundColor: Colors.blue.withOpacity(0.1),
                    foregroundColor: Colors.blue,
                  ),
                ),
                
                IconButton(
                  onPressed: () => _showQuickAdjustment(context, product),
                  icon: const Icon(Icons.add),
                  tooltip: 'Quick Add',
                  style: IconButton.styleFrom(
                    backgroundColor: Colors.green.withOpacity(0.1),
                    foregroundColor: Colors.green,
                  ),
                ),
              ],
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

  void _showQuickAdjustment(BuildContext context, Product product) {
    showDialog(
      context: context,
      builder: (context) => _QuickAdjustmentDialog(product: product),
    );
  }
}

class _RecentUpdatesTab extends StatelessWidget {
  const _RecentUpdatesTab();

  @override
  Widget build(BuildContext context) {
    final updates = _getMockUpdates();
    
    if (updates.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.history,
              size: 64,
              color: Colors.grey[400],
            ),
            const SizedBox(height: 16),
            Text(
              'No Recent Updates',
              style: Theme.of(context).textTheme.headlineSmall,
            ),
            const SizedBox(height: 8),
            Text(
              'Your inventory updates will appear here',
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
      itemCount: updates.length,
      itemBuilder: (context, index) {
        final update = updates[index];
        return _UpdateHistoryCard(update: update);
      },
    );
  }

  List<InventoryUpdate> _getMockUpdates() {
    return [
      InventoryUpdate(
        productName: 'Wireless Headphones',
        sku: 'WH-001',
        previousStock: 5,
        newStock: 25,
        reason: 'Restocked from supplier',
        updatedBy: 'Current Employee',
        updatedAt: DateTime.now().subtract(const Duration(minutes: 30)),
      ),
      InventoryUpdate(
        productName: 'Bluetooth Speaker',
        sku: 'BS-002',
        previousStock: 15,
        newStock: 12,
        reason: 'Sold 3 units',
        updatedBy: 'Current Employee',
        updatedAt: DateTime.now().subtract(const Duration(hours: 2)),
      ),
    ];
  }
}

class _UpdateHistoryCard extends StatelessWidget {
  final InventoryUpdate update;

  const _UpdateHistoryCard({required this.update});

  @override
  Widget build(BuildContext context) {
    final isIncrease = update.newStock > update.previousStock;
    final difference = (update.newStock - update.previousStock).abs();
    
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    update.productName,
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 8,
                    vertical: 4,
                  ),
                  decoration: BoxDecoration(
                    color: isIncrease ? Colors.green.withOpacity(0.2) : Colors.red.withOpacity(0.2),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        isIncrease ? Icons.arrow_upward : Icons.arrow_downward,
                        size: 12,
                        color: isIncrease ? Colors.green[700] : Colors.red[700],
                      ),
                      const SizedBox(width: 2),
                      Text(
                        '$difference',
                        style: TextStyle(
                          color: isIncrease ? Colors.green[700] : Colors.red[700],
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            
            const SizedBox(height: 4),
            
            Text(
              'SKU: ${update.sku}',
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                color: Colors.grey[600],
              ),
            ),
            
            const SizedBox(height: 8),
            
            Text(
              '${update.previousStock} → ${update.newStock} units',
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                fontWeight: FontWeight.w600,
              ),
            ),
            
            if (update.reason.isNotEmpty) ...[
              const SizedBox(height: 4),
              Text(
                'Reason: ${update.reason}',
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: Colors.grey[600],
                ),
              ),
            ],
            
            const SizedBox(height: 8),
            
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'By: ${update.updatedBy}',
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: Colors.grey[500],
                  ),
                ),
                Text(
                  _formatTime(update.updatedAt),
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: Colors.grey[500],
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  String _formatTime(DateTime dateTime) {
    final now = DateTime.now();
    final difference = now.difference(dateTime);
    
    if (difference.inMinutes < 1) {
      return 'Just now';
    } else if (difference.inMinutes < 60) {
      return '${difference.inMinutes}m ago';
    } else if (difference.inHours < 24) {
      return '${difference.inHours}h ago';
    } else {
      return '${difference.inDays}d ago';
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
                labelText: 'Reason',
                border: OutlineInputBorder(),
              ),
              validator: (value) {
                if (value == null || value.isEmpty) {
                  return 'Please enter a reason';
                }
                return null;
              },
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

class _QuickAdjustmentDialog extends StatefulWidget {
  final Product product;

  const _QuickAdjustmentDialog({required this.product});

  @override
  State<_QuickAdjustmentDialog> createState() => _QuickAdjustmentDialogState();
}

class _QuickAdjustmentDialogState extends State<_QuickAdjustmentDialog> {
  int _quantity = 1;

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: Text('Quick Add - ${widget.product.name}'),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            'Current Stock: ${widget.product.stockQuantity} units',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
              fontWeight: FontWeight.w600,
            ),
          ),
          
          const SizedBox(height: 20),
          
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              IconButton(
                onPressed: _quantity > 1 ? () => setState(() => _quantity--) : null,
                icon: const Icon(Icons.remove),
                style: IconButton.styleFrom(
                  backgroundColor: Colors.red.withOpacity(0.1),
                  foregroundColor: Colors.red,
                ),
              ),
              
              const SizedBox(width: 20),
              
              Text(
                '$_quantity',
                style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
              
              const SizedBox(width: 20),
              
              IconButton(
                onPressed: () => setState(() => _quantity++),
                icon: const Icon(Icons.add),
                style: IconButton.styleFrom(
                  backgroundColor: Colors.green.withOpacity(0.1),
                  foregroundColor: Colors.green,
                ),
              ),
            ],
          ),
          
          const SizedBox(height: 20),
          
          Text(
            'New Stock: ${widget.product.stockQuantity + _quantity} units',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
              color: Colors.green[700],
              fontWeight: FontWeight.w600,
            ),
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
            // TODO: Implement quick stock addition
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text('Added $_quantity units to ${widget.product.name}'),
                backgroundColor: Colors.green,
              ),
            );
          },
          child: const Text('Add Stock'),
        ),
      ],
    );
  }
}

class _QuickUpdateDialog extends StatefulWidget {
  const _QuickUpdateDialog();

  @override
  State<_QuickUpdateDialog> createState() => _QuickUpdateDialogState();
}

class _QuickUpdateDialogState extends State<_QuickUpdateDialog> {
  final _skuController = TextEditingController();
  final _quantityController = TextEditingController();

  @override
  void dispose() {
    _skuController.dispose();
    _quantityController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Quick Stock Update'),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          TextField(
            controller: _skuController,
            decoration: const InputDecoration(
              labelText: 'Product SKU',
              border: OutlineInputBorder(),
              hintText: 'Enter or scan SKU',
            ),
          ),
          
          const SizedBox(height: 16),
          
          TextField(
            controller: _quantityController,
            decoration: const InputDecoration(
              labelText: 'New Quantity',
              border: OutlineInputBorder(),
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
            // TODO: Implement quick update
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Text('Stock updated successfully'),
                backgroundColor: Colors.green,
              ),
            );
          },
          child: const Text('Update'),
        ),
      ],
    );
  }
}

// Data Models
class InventoryUpdate {
  final String productName;
  final String sku;
  final int previousStock;
  final int newStock;
  final String reason;
  final String updatedBy;
  final DateTime updatedAt;

  InventoryUpdate({
    required this.productName,
    required this.sku,
    required this.previousStock,
    required this.newStock,
    required this.reason,
    required this.updatedBy,
    required this.updatedAt,
  });
}