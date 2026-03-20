import 'package:flutter/material.dart';

import '../../domain/entities/cart.dart';

class CartSummary extends StatelessWidget {
  final Cart cart;
  final bool isUpdating;
  final VoidCallback onCheckout;

  const CartSummary({
    super.key,
    required this.cart,
    required this.isUpdating,
    required this.onCheckout,
  });

  @override
  Widget build(BuildContext context) {
    final availableItems = cart.availableItems;
    final unavailableItems = cart.unavailableItems;
    final subtotal = availableItems.fold(0.0, (sum, item) => sum + item.totalPrice);
    final tax = subtotal * 0.08; // 8% tax rate
    final total = subtotal + tax;

    return Container(
      decoration: BoxDecoration(
        color: Theme.of(context).cardColor,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.1),
            blurRadius: 8,
            offset: const Offset(0, -2),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Order Summary Header
            Row(
              children: [
                Icon(
                  Icons.receipt_long,
                  color: Theme.of(context).primaryColor,
                ),
                const SizedBox(width: 8),
                Text(
                  'Order Summary',
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
            
            const SizedBox(height: 16),
            
            // Summary Details
            _buildSummaryRow(
              context,
              'Items (${availableItems.length})',
              '\$${subtotal.toStringAsFixed(2)}',
            ),
            
            const SizedBox(height: 8),
            
            _buildSummaryRow(
              context,
              'Tax (8%)',
              '\$${tax.toStringAsFixed(2)}',
            ),
            
            if (unavailableItems.isNotEmpty) ...[
              const SizedBox(height: 8),
              _buildSummaryRow(
                context,
                'Unavailable Items (${unavailableItems.length})',
                'Excluded',
                isWarning: true,
              ),
            ],
            
            const Divider(height: 24),
            
            // Total
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Total',
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
                Text(
                  '\$${total.toStringAsFixed(2)}',
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.bold,
                    color: Theme.of(context).primaryColor,
                  ),
                ),
              ],
            ),
            
            const SizedBox(height: 16),
            
            // Checkout Button
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: isUpdating || availableItems.isEmpty ? null : onCheckout,
                style: ElevatedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                child: isUpdating
                    ? const SizedBox(
                        height: 20,
                        width: 20,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : Text(
                        availableItems.isEmpty 
                            ? 'No Items Available'
                            : 'Proceed to Checkout',
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
              ),
            ),
            
            // Unavailable Items Warning
            if (unavailableItems.isNotEmpty) ...[
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.orange.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.orange),
                ),
                child: Row(
                  children: [
                    const Icon(
                      Icons.info_outline,
                      color: Colors.orange,
                      size: 20,
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        '${unavailableItems.length} item(s) are unavailable and will be excluded from checkout.',
                        style: TextStyle(
                          color: Colors.orange[800],
                          fontSize: 12,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildSummaryRow(
    BuildContext context,
    String label,
    String value, {
    bool isWarning = false,
  }) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
            color: isWarning ? Colors.orange[700] : Colors.grey[600],
          ),
        ),
        Text(
          value,
          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
            fontWeight: FontWeight.w500,
            color: isWarning ? Colors.orange[700] : null,
          ),
        ),
      ],
    );
  }
}