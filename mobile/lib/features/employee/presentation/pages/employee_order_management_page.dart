import 'package:flutter/material.dart';

import '../../../checkout/domain/entities/order.dart';
import '../../../orders/domain/entities/order_tracking.dart';

class EmployeeOrderManagementPage extends StatefulWidget {
  const EmployeeOrderManagementPage({super.key});

  @override
  State<EmployeeOrderManagementPage> createState() => _EmployeeOrderManagementPageState();
}

class _EmployeeOrderManagementPageState extends State<EmployeeOrderManagementPage>
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
        title: const Text('Order Management'),
        backgroundColor: Colors.orange[600],
        foregroundColor: Colors.white,
        bottom: TabBar(
          controller: _tabController,
          isScrollable: true,
          tabs: const [
            Tab(text: 'Pending'),
            Tab(text: 'Processing'),
            Tab(text: 'Ready to Ship'),
            Tab(text: 'Recent'),
          ],
        ),
      ),
      body: Column(
        children: [
          // Search and Filter Bar
          Container(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    decoration: InputDecoration(
                      hintText: 'Search orders...',
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
                  icon: const Icon(Icons.filter_list),
                  onPressed: () => _showFilterDialog(context),
                ),
              ],
            ),
          ),
          
          // Info Banner
          Container(
            margin: const EdgeInsets.symmetric(horizontal: 16),
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.orange[50],
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: Colors.orange[200]!),
            ),
            child: Row(
              children: [
                Icon(
                  Icons.info_outline,
                  color: Colors.orange[600],
                  size: 20,
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'You can update order status and manage fulfillment. Contact admin for order cancellations.',
                    style: TextStyle(
                      color: Colors.orange[700],
                      fontSize: 12,
                    ),
                  ),
                ),
              ],
            ),
          ),
          
          const SizedBox(height: 16),
          
          // Tab Content
          Expanded(
            child: TabBarView(
              controller: _tabController,
              children: [
                _OrdersList(
                  status: OrderStatus.pending,
                  searchQuery: _searchQuery,
                ),
                _OrdersList(
                  status: OrderStatus.processing,
                  searchQuery: _searchQuery,
                ),
                _OrdersList(
                  status: OrderStatus.shipped,
                  searchQuery: _searchQuery,
                ),
                _OrdersList(
                  status: null, // Recent orders
                  searchQuery: _searchQuery,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  void _showFilterDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Filter Orders'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              title: const Text('All Orders'),
              leading: Radio<String>(
                value: 'all',
                groupValue: 'all',
                onChanged: (value) {},
              ),
            ),
            ListTile(
              title: const Text('High Priority'),
              leading: Radio<String>(
                value: 'high_priority',
                groupValue: 'all',
                onChanged: (value) {},
              ),
            ),
            ListTile(
              title: const Text('Overdue'),
              leading: Radio<String>(
                value: 'overdue',
                groupValue: 'all',
                onChanged: (value) {},
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
              // TODO: Apply filter
            },
            child: const Text('Apply'),
          ),
        ],
      ),
    );
  }
}

class _OrdersList extends StatelessWidget {
  final OrderStatus? status;
  final String searchQuery;

  const _OrdersList({
    required this.status,
    required this.searchQuery,
  });

  @override
  Widget build(BuildContext context) {
    final orders = _getFilteredOrders();
    
    if (orders.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.receipt_long_outlined,
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
        // TODO: Refresh orders
      },
      child: ListView.builder(
        padding: const EdgeInsets.symmetric(horizontal: 16),
        itemCount: orders.length,
        itemBuilder: (context, index) {
          final order = orders[index];
          return _EmployeeOrderCard(
            order: order,
            onUpdateStatus: () => _showUpdateStatusDialog(context, order),
            onViewDetails: () => _showOrderDetails(context, order),
          );
        },
      ),
    );
  }

  List<Order> _getFilteredOrders() {
    // TODO: Replace with actual order data from repository
    final mockOrders = _getMockOrders();
    
    var filtered = mockOrders;
    
    if (status != null) {
      filtered = mockOrders.where((order) => order.status == status).toList();
    }
    
    if (searchQuery.isNotEmpty) {
      filtered = filtered.where((order) =>
          order.orderNumber.toLowerCase().contains(searchQuery.toLowerCase()) ||
          order.id.toLowerCase().contains(searchQuery.toLowerCase())).toList();
    }
    
    return filtered;
  }

  List<Order> _getMockOrders() {
    return [
      Order(
        id: '1',
        orderNumber: 'WE-12345',
        userId: 'user1',
        items: [],
        shippingAddress: _getMockAddress(),
        billingAddress: _getMockAddress(),
        paymentMethod: _getMockPaymentMethod(),
        status: OrderStatus.pending,
        subtotal: 99.99,
        totalAmount: 113.98,
        createdAt: DateTime.now().subtract(const Duration(hours: 2)),
        updatedAt: DateTime.now().subtract(const Duration(hours: 1)),
      ),
      Order(
        id: '2',
        orderNumber: 'WE-12346',
        userId: 'user2',
        items: [],
        shippingAddress: _getMockAddress(),
        billingAddress: _getMockAddress(),
        paymentMethod: _getMockPaymentMethod(),
        status: OrderStatus.processing,
        subtotal: 149.99,
        totalAmount: 169.98,
        createdAt: DateTime.now().subtract(const Duration(hours: 4)),
        updatedAt: DateTime.now().subtract(const Duration(hours: 2)),
      ),
      Order(
        id: '3',
        orderNumber: 'WE-12347',
        userId: 'user3',
        items: [],
        shippingAddress: _getMockAddress(),
        billingAddress: _getMockAddress(),
        paymentMethod: _getMockPaymentMethod(),
        status: OrderStatus.shipped,
        subtotal: 79.99,
        totalAmount: 89.98,
        trackingNumber: 'TRK123456789',
        estimatedDelivery: DateTime.now().add(const Duration(days: 2)),
        createdAt: DateTime.now().subtract(const Duration(days: 1)),
        updatedAt: DateTime.now().subtract(const Duration(hours: 6)),
      ),
    ];
  }

  String _getEmptyMessage() {
    if (status == null) return 'No Recent Orders';
    switch (status!) {
      case OrderStatus.pending:
        return 'No Pending Orders';
      case OrderStatus.processing:
        return 'No Processing Orders';
      case OrderStatus.shipped:
        return 'No Ready to Ship Orders';
      default:
        return 'No Orders';
    }
  }

  String _getEmptySubtitle() {
    if (status == null) return 'Recent orders will appear here';
    switch (status!) {
      case OrderStatus.pending:
        return 'New orders will appear here';
      case OrderStatus.processing:
        return 'Orders being processed will appear here';
      case OrderStatus.shipped:
        return 'Orders ready for shipping will appear here';
      default:
        return 'Orders will appear here';
    }
  }

  void _showUpdateStatusDialog(BuildContext context, Order order) {
    showDialog(
      context: context,
      builder: (context) => _UpdateOrderStatusDialog(order: order),
    );
  }

  void _showOrderDetails(BuildContext context, Order order) {
    showDialog(
      context: context,
      builder: (context) => _OrderDetailsDialog(order: order),
    );
  }
}

class _EmployeeOrderCard extends StatelessWidget {
  final Order order;
  final VoidCallback onUpdateStatus;
  final VoidCallback onViewDetails;

  const _EmployeeOrderCard({
    required this.order,
    required this.onUpdateStatus,
    required this.onViewDetails,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Order Header
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Order #${order.orderNumber}',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
                _StatusChip(status: order.status),
              ],
            ),
            
            const SizedBox(height: 8),
            
            // Order Info
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Customer: ${order.shippingAddress.fullName}',
                        style: Theme.of(context).textTheme.bodyMedium,
                      ),
                      const SizedBox(height: 2),
                      Text(
                        'Total: \$${order.totalAmount.toStringAsFixed(2)}',
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          fontWeight: FontWeight.w600,
                          color: Theme.of(context).primaryColor,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        'Placed: ${_formatDate(order.createdAt)}',
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: Colors.grey[600],
                        ),
                      ),
                    ],
                  ),
                ),
                
                // Priority Indicator
                if (_isHighPriority(order))
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 6,
                      vertical: 2,
                    ),
                    decoration: BoxDecoration(
                      color: Colors.red.withOpacity(0.2),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      'HIGH PRIORITY',
                      style: TextStyle(
                        color: Colors.red[700],
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
              ],
            ),
            
            const SizedBox(height: 12),
            
            // Action Buttons
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: onViewDetails,
                    child: const Text('View Details'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: ElevatedButton(
                    onPressed: onUpdateStatus,
                    child: const Text('Update Status'),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  bool _isHighPriority(Order order) {
    // Mock logic for high priority
    return order.totalAmount > 150 || 
           DateTime.now().difference(order.createdAt).inHours > 24;
  }

  String _formatDate(DateTime date) {
    return '${date.day}/${date.month}/${date.year} ${date.hour.toString().padLeft(2, '0')}:${date.minute.toString().padLeft(2, '0')}';
  }
}

class _StatusChip extends StatelessWidget {
  final OrderStatus status;

  const _StatusChip({required this.status});

  @override
  Widget build(BuildContext context) {
    Color backgroundColor;
    Color textColor;
    
    switch (status) {
      case OrderStatus.pending:
        backgroundColor = Colors.orange.withOpacity(0.2);
        textColor = Colors.orange[700]!;
        break;
      case OrderStatus.confirmed:
        backgroundColor = Colors.blue.withOpacity(0.2);
        textColor = Colors.blue[700]!;
        break;
      case OrderStatus.processing:
        backgroundColor = Colors.purple.withOpacity(0.2);
        textColor = Colors.purple[700]!;
        break;
      case OrderStatus.shipped:
        backgroundColor = Colors.indigo.withOpacity(0.2);
        textColor = Colors.indigo[700]!;
        break;
      case OrderStatus.delivered:
        backgroundColor = Colors.green.withOpacity(0.2);
        textColor = Colors.green[700]!;
        break;
      case OrderStatus.cancelled:
        backgroundColor = Colors.red.withOpacity(0.2);
        textColor = Colors.red[700]!;
        break;
      case OrderStatus.refunded:
        backgroundColor = Colors.grey.withOpacity(0.2);
        textColor = Colors.grey[700]!;
        break;
    }
    
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: backgroundColor,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(
        status.displayName,
        style: TextStyle(
          color: textColor,
          fontSize: 12,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}

class _UpdateOrderStatusDialog extends StatefulWidget {
  final Order order;

  const _UpdateOrderStatusDialog({required this.order});

  @override
  State<_UpdateOrderStatusDialog> createState() => _UpdateOrderStatusDialogState();
}

class _UpdateOrderStatusDialogState extends State<_UpdateOrderStatusDialog> {
  late OrderStatus _selectedStatus;
  final _trackingController = TextEditingController();
  final _notesController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _selectedStatus = _getNextStatus(widget.order.status);
    if (widget.order.trackingNumber != null) {
      _trackingController.text = widget.order.trackingNumber!;
    }
  }

  @override
  void dispose() {
    _trackingController.dispose();
    _notesController.dispose();
    super.dispose();
  }

  OrderStatus _getNextStatus(OrderStatus currentStatus) {
    switch (currentStatus) {
      case OrderStatus.pending:
        return OrderStatus.confirmed;
      case OrderStatus.confirmed:
        return OrderStatus.processing;
      case OrderStatus.processing:
        return OrderStatus.shipped;
      case OrderStatus.shipped:
        return OrderStatus.delivered;
      default:
        return currentStatus;
    }
  }

  List<OrderStatus> _getAvailableStatuses() {
    switch (widget.order.status) {
      case OrderStatus.pending:
        return [OrderStatus.confirmed, OrderStatus.cancelled];
      case OrderStatus.confirmed:
        return [OrderStatus.processing, OrderStatus.cancelled];
      case OrderStatus.processing:
        return [OrderStatus.shipped, OrderStatus.cancelled];
      case OrderStatus.shipped:
        return [OrderStatus.delivered];
      default:
        return [widget.order.status];
    }
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: Text('Update Order #${widget.order.orderNumber}'),
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              'Current Status: ${widget.order.status.displayName}',
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                fontWeight: FontWeight.w600,
              ),
            ),
            
            const SizedBox(height: 16),
            
            DropdownButtonFormField<OrderStatus>(
              value: _selectedStatus,
              decoration: const InputDecoration(
                labelText: 'New Status',
                border: OutlineInputBorder(),
              ),
              items: _getAvailableStatuses().map((status) {
                return DropdownMenuItem(
                  value: status,
                  child: Text(status.displayName),
                );
              }).toList(),
              onChanged: (status) {
                if (status != null) {
                  setState(() {
                    _selectedStatus = status;
                  });
                }
              },
            ),
            
            const SizedBox(height: 16),
            
            if (_selectedStatus == OrderStatus.shipped) ...[
              TextFormField(
                controller: _trackingController,
                decoration: const InputDecoration(
                  labelText: 'Tracking Number',
                  border: OutlineInputBorder(),
                  hintText: 'Enter tracking number',
                ),
              ),
              const SizedBox(height: 16),
            ],
            
            TextFormField(
              controller: _notesController,
              decoration: const InputDecoration(
                labelText: 'Notes (optional)',
                border: OutlineInputBorder(),
                hintText: 'Add any notes about this update',
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
            Navigator.of(context).pop();
            // TODO: Implement status update
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text('Order #${widget.order.orderNumber} updated to ${_selectedStatus.displayName}'),
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

class _OrderDetailsDialog extends StatelessWidget {
  final Order order;

  const _OrderDetailsDialog({required this.order});

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: Text('Order #${order.orderNumber}'),
      content: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            _DetailSection(
              title: 'Order Information',
              children: [
                _DetailRow('Status', order.status.displayName),
                _DetailRow('Total Amount', '\$${order.totalAmount.toStringAsFixed(2)}'),
                _DetailRow('Order Date', _formatDate(order.createdAt)),
                _DetailRow('Last Updated', _formatDate(order.updatedAt)),
                if (order.trackingNumber != null)
                  _DetailRow('Tracking Number', order.trackingNumber!),
                if (order.estimatedDelivery != null)
                  _DetailRow('Est. Delivery', _formatDate(order.estimatedDelivery!)),
              ],
            ),
            
            const SizedBox(height: 16),
            
            _DetailSection(
              title: 'Customer Information',
              children: [
                _DetailRow('Name', order.shippingAddress.fullName),
                _DetailRow('Email', 'customer@example.com'), // TODO: Get from user data
                if (order.shippingAddress.phone != null)
                  _DetailRow('Phone', order.shippingAddress.phone!),
              ],
            ),
            
            const SizedBox(height: 16),
            
            _DetailSection(
              title: 'Shipping Address',
              children: [
                Text(order.shippingAddress.fullAddress),
              ],
            ),
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: const Text('Close'),
        ),
      ],
    );
  }

  String _formatDate(DateTime date) {
    return '${date.day}/${date.month}/${date.year} ${date.hour.toString().padLeft(2, '0')}:${date.minute.toString().padLeft(2, '0')}';
  }
}

class _DetailSection extends StatelessWidget {
  final String title;
  final List<Widget> children;

  const _DetailSection({
    required this.title,
    required this.children,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: Theme.of(context).textTheme.titleSmall?.copyWith(
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 8),
        ...children,
      ],
    );
  }
}

class _DetailRow extends StatelessWidget {
  final String label;
  final String value;

  const _DetailRow(this.label, this.value);

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 100,
            child: Text(
              '$label:',
              style: const TextStyle(
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
          Expanded(
            child: Text(value),
          ),
        ],
      ),
    );
  }
}

// Mock data helpers
import '../../../checkout/domain/entities/address.dart';
import '../../../checkout/domain/entities/payment_method.dart';

Address _getMockAddress() {
  return const Address(
    id: 'addr_1',
    firstName: 'John',
    lastName: 'Doe',
    street: '123 Main St',
    city: 'New York',
    state: 'NY',
    zipCode: '10001',
    country: 'USA',
    phone: '+1 (555) 123-4567',
    type: AddressType.shipping,
  );
}

PaymentMethod _getMockPaymentMethod() {
  return const PaymentMethod(
    id: 'pm_1',
    type: PaymentType.creditCard,
    displayName: 'Visa Credit Card',
    last4Digits: '4242',
  );
}