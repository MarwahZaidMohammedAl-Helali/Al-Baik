import 'package:flutter/material.dart';

import '../../domain/entities/address.dart';

class ShippingAddressSection extends StatelessWidget {
  final Address? selectedAddress;
  final List<Address> availableAddresses;
  final Function(Address) onAddressSelected;

  const ShippingAddressSection({
    super.key,
    this.selectedAddress,
    required this.availableAddresses,
    required this.onAddressSelected,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Add New Address Button
        SizedBox(
          width: double.infinity,
          child: OutlinedButton.icon(
            onPressed: () {
              // TODO: Navigate to add address page
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('Add address functionality coming soon'),
                ),
              );
            },
            icon: const Icon(Icons.add),
            label: const Text('Add New Address'),
          ),
        ),
        
        const SizedBox(height: 16),
        
        // Saved Addresses
        if (availableAddresses.isNotEmpty) ...[
          Text(
            'Saved Addresses',
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 12),
          
          ...availableAddresses.map((address) => _AddressCard(
            address: address,
            isSelected: selectedAddress?.id == address.id,
            onTap: () => onAddressSelected(address),
          )),
        ] else ...[
          // Empty State
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              border: Border.all(color: Colors.grey[300]!),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Column(
              children: [
                Icon(
                  Icons.location_on_outlined,
                  size: 48,
                  color: Colors.grey[400],
                ),
                const SizedBox(height: 12),
                Text(
                  'No saved addresses',
                  style: Theme.of(context).textTheme.titleMedium,
                ),
                const SizedBox(height: 4),
                Text(
                  'Add a shipping address to continue',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: Colors.grey[600],
                  ),
                  textAlign: TextAlign.center,
                ),
              ],
            ),
          ),
        ],
      ],
    );
  }
}

class _AddressCard extends StatelessWidget {
  final Address address;
  final bool isSelected;
  final VoidCallback onTap;

  const _AddressCard({
    required this.address,
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
              
              // Address Details
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Text(
                          address.fullName,
                          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        if (address.isDefault) ...[
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
                    const SizedBox(height: 4),
                    Text(
                      address.fullAddress,
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: Colors.grey[600],
                      ),
                    ),
                    if (address.phone != null) ...[
                      const SizedBox(height: 2),
                      Text(
                        address.phone!,
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
                  // TODO: Navigate to edit address page
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('Edit address functionality coming soon'),
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
}