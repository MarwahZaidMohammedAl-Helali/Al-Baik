import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../bloc/products_bloc.dart';

class ProductFilterBar extends StatelessWidget {
  const ProductFilterBar({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<ProductsBloc, ProductsState>(
      builder: (context, state) {
        String? currentCategory;
        String? currentSortBy;
        
        if (state is ProductsLoaded) {
          currentCategory = state.category;
          currentSortBy = state.sortBy;
        }
        
        return Container(
          height: 50,
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Row(
            children: [
              // Category Filter
              Expanded(
                child: _FilterChip(
                  label: currentCategory ?? 'All Categories',
                  isSelected: currentCategory != null,
                  onTap: () => _showCategoryFilter(context, currentCategory),
                ),
              ),
              const SizedBox(width: 8),
              
              // Sort Filter
              Expanded(
                child: _FilterChip(
                  label: _getSortLabel(currentSortBy),
                  isSelected: currentSortBy != null,
                  onTap: () => _showSortFilter(context, currentSortBy),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  String _getSortLabel(String? sortBy) {
    switch (sortBy) {
      case 'price':
        return 'Price';
      case 'name':
        return 'Name';
      case 'createdAt':
        return 'Newest';
      default:
        return 'Sort By';
    }
  }

  void _showCategoryFilter(BuildContext context, String? currentCategory) {
    showModalBottomSheet(
      context: context,
      builder: (context) => Container(
        padding: const EdgeInsets.all(16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Filter by Category',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 16),
            
            // All Categories
            ListTile(
              title: const Text('All Categories'),
              leading: Radio<String?>(
                value: null,
                groupValue: currentCategory,
                onChanged: (value) {
                  Navigator.pop(context);
                  context.read<ProductsBloc>().add(const FilterProducts());
                },
              ),
            ),
            
            // Sample categories - in real app, these would come from API
            ...['Electronics', 'Clothing', 'Home & Garden', 'Sports', 'Books']
                .map((category) => ListTile(
                      title: Text(category),
                      leading: Radio<String?>(
                        value: category,
                        groupValue: currentCategory,
                        onChanged: (value) {
                          Navigator.pop(context);
                          context.read<ProductsBloc>().add(
                                FilterProducts(category: value),
                              );
                        },
                      ),
                    )),
          ],
        ),
      ),
    );
  }

  void _showSortFilter(BuildContext context, String? currentSortBy) {
    showModalBottomSheet(
      context: context,
      builder: (context) => Container(
        padding: const EdgeInsets.all(16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Sort Products',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 16),
            
            ListTile(
              title: const Text('Default'),
              leading: Radio<String?>(
                value: null,
                groupValue: currentSortBy,
                onChanged: (value) {
                  Navigator.pop(context);
                  context.read<ProductsBloc>().add(const FilterProducts());
                },
              ),
            ),
            
            ListTile(
              title: const Text('Price: Low to High'),
              leading: Radio<String?>(
                value: 'price',
                groupValue: currentSortBy,
                onChanged: (value) {
                  Navigator.pop(context);
                  context.read<ProductsBloc>().add(
                        const FilterProducts(
                          sortBy: 'price',
                          sortOrder: 'asc',
                        ),
                      );
                },
              ),
            ),
            
            ListTile(
              title: const Text('Price: High to Low'),
              leading: Radio<String?>(
                value: 'price_desc',
                groupValue: currentSortBy == 'price' ? 'price_desc' : currentSortBy,
                onChanged: (value) {
                  Navigator.pop(context);
                  context.read<ProductsBloc>().add(
                        const FilterProducts(
                          sortBy: 'price',
                          sortOrder: 'desc',
                        ),
                      );
                },
              ),
            ),
            
            ListTile(
              title: const Text('Name A-Z'),
              leading: Radio<String?>(
                value: 'name',
                groupValue: currentSortBy,
                onChanged: (value) {
                  Navigator.pop(context);
                  context.read<ProductsBloc>().add(
                        const FilterProducts(
                          sortBy: 'name',
                          sortOrder: 'asc',
                        ),
                      );
                },
              ),
            ),
            
            ListTile(
              title: const Text('Newest First'),
              leading: Radio<String?>(
                value: 'createdAt',
                groupValue: currentSortBy,
                onChanged: (value) {
                  Navigator.pop(context);
                  context.read<ProductsBloc>().add(
                        const FilterProducts(
                          sortBy: 'createdAt',
                          sortOrder: 'desc',
                        ),
                      );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _FilterChip extends StatelessWidget {
  final String label;
  final bool isSelected;
  final VoidCallback onTap;

  const _FilterChip({
    required this.label,
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(20),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected 
              ? Theme.of(context).primaryColor.withOpacity(0.1)
              : Colors.grey[100],
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isSelected 
                ? Theme.of(context).primaryColor
                : Colors.grey[300]!,
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Flexible(
              child: Text(
                label,
                style: TextStyle(
                  color: isSelected 
                      ? Theme.of(context).primaryColor
                      : Colors.grey[700],
                  fontWeight: isSelected ? FontWeight.w500 : FontWeight.normal,
                ),
                overflow: TextOverflow.ellipsis,
              ),
            ),
            const SizedBox(width: 4),
            Icon(
              Icons.keyboard_arrow_down,
              size: 16,
              color: isSelected 
                  ? Theme.of(context).primaryColor
                  : Colors.grey[700],
            ),
          ],
        ),
      ),
    );
  }
}