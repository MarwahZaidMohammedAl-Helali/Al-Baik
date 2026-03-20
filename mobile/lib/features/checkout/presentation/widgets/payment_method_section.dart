import 'package:flutter/material.dart';

import '../../domain/entities/payment_method.dart';

class PaymentMethodSection extends StatelessWidget {
  final PaymentMethod? selectedPaymentMethod;
  final List<PaymentMethod> availablePaymentMethods;
  final Function(PaymentMethod) onPaymentMethodSelected;

  const PaymentMethodSection({
    super.key,
    this.selectedPaymentMethod,
    required this.availablePaymentMethods,
    required this.onPaymentMethodSelected,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Add New Payment Method Button
        SizedBox(
          width: double.infinity,
          child: OutlinedButton.icon(
            onPressed: () {
              // TODO: Navigate to add payment method page
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('Add payment method functionality coming soon'),
                ),
              );
            },
            icon: const Icon(Icons.add),
            label: const Text('Add New Payment Method'),
          ),
        ),
        
        const SizedBox(height: 16),
        
        // Saved Payment Methods
        if (availablePaymentMethods.isNotEmpty) ...[
          Text(
            'Saved Payment Methods',
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 12),
          
          ...availablePaymentMethods.map((paymentMethod) => _PaymentMethodCard(
            paymentMethod: paymentMethod,
            isSelected: selectedPaymentMethod?.id == paymentMethod.id,
            onTap: () => onPaymentMethodSelected(paymentMethod),
          )),
        ] else ...[
          // Empty State with Mock Payment Methods
          Text(
            'Payment Methods',
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 12),
          
          // Mock payment methods for demo
          ..._getMockPaymentMethods().map((paymentMethod) => _PaymentMethodCard(
            paymentMethod: paymentMethod,
            isSelected: selectedPaymentMethod?.id == paymentMethod.id,
            onTap: () => onPaymentMethodSelected(paymentMethod),
          )),
        ],
      ],
    );
  }

  List<PaymentMethod> _getMockPaymentMethods() {
    return [
      const PaymentMethod(
        id: 'card_1',
        type: PaymentType.creditCard,
        displayName: 'Visa Credit Card',
        last4Digits: '4242',
        expiryMonth: '12',
        expiryYear: '25',
        cardholderName: 'John Doe',
        isDefault: true,
      ),
      const PaymentMethod(
        id: 'paypal_1',
        type: PaymentType.paypal,
        displayName: 'PayPal',
      ),
      const PaymentMethod(
        id: 'apple_pay_1',
        type: PaymentType.applePay,
        displayName: 'Apple Pay',
      ),
    ];
  }
}

class _PaymentMethodCard extends StatelessWidget {
  final PaymentMethod paymentMethod;
  final bool isSelected;
  final VoidCallback onTap;

  const _PaymentMethodCard({
    required this.paymentMethod,
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(8),
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            border: Border.all(
              color: isSelected 
                  ? Theme.of(context).primaryColor 
                  : Colors.grey[300]!,
              width: isSelected ? 2 : 1,
            ),
            borderRadius: BorderRadius.circular(8),
            color: isSelected 
                ? Theme.of(context).primaryColor.withOpacity(0.05)
                : null,
          ),
          child: Row(
            children: [
              // Radio Button
              Radio<bool>(
                value: true,
                groupValue: isSelected,
                onChanged: (_) => onTap(),
                activeColor: Theme.of(context).primaryColor,
              ),
              
              const SizedBox(width: 12),
              
              // Payment Method Icon
              Container(
                width: 40,
                height: 28,
                decoration: BoxDecoration(
                  color: Colors.grey[100],
                  borderRadius: BorderRadius.circular(4),
                ),
                child: Icon(
                  _getPaymentIcon(paymentMethod.type),
                  size: 20,
                  color: Colors.grey[600],
                ),
              ),
              
              const SizedBox(width: 12),
              
              // Payment Method Details
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Text(
                          paymentMethod.displayName,
                          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        if (paymentMethod.isDefault) ...[
                          const SizedBox(width: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 8,
                              vertical: 2,
                            ),
                            decoration: BoxDecoration(
                              color: Theme.of(context).primaryColor,
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: const Text(
                              'Default',
                              style: TextStyle(
                                color: Colors.white,
                                fontSize: 10,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                          ),
                        ],
                      ],
                    ),
                    if (paymentMethod.last4Digits != null) ...[
                      const SizedBox(height: 4),
                      Text(
                        paymentMethod.maskedCardNumber,
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          color: Colors.grey[600],
                        ),
                      ),
                    ],
                    if (paymentMethod.expiryDate.isNotEmpty) ...[
                      const SizedBox(height: 2),
                      Text(
                        'Expires ${paymentMethod.expiryDate}',
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: Colors.grey[600],
                        ),
                      ),
                    ],
                  ],
                ),
              ),
              
              // Edit Button
              IconButton(
                onPressed: () {
                  // TODO: Navigate to edit payment method page
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('Edit payment method functionality coming soon'),
                    ),
                  );
                },
                icon: const Icon(Icons.edit_outlined),
                iconSize: 20,
              ),
            ],
          ),
        ),
      ),
    );
  }

  IconData _getPaymentIcon(PaymentType type) {
    switch (type) {
      case PaymentType.creditCard:
      case PaymentType.debitCard:
        return Icons.credit_card;
      case PaymentType.paypal:
        return Icons.account_balance_wallet;
      case PaymentType.applePay:
        return Icons.phone_iphone;
      case PaymentType.googlePay:
        return Icons.phone_android;
      case PaymentType.bankTransfer:
        return Icons.account_balance;
    }
  }
}