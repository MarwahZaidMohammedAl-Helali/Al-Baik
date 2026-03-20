import 'package:equatable/equatable.dart';

class Product extends Equatable {
  final String id;
  final String name;
  final String description;
  final String category;
  final double price;
  final double? wholesalePrice;
  final int stockQuantity;
  final int lowStockThreshold;
  final String? imageUrl;
  final List<String> tags;
  final bool isActive;
  final DateTime createdAt;
  final DateTime updatedAt;

  const Product({
    required this.id,
    required this.name,
    required this.description,
    required this.category,
    required this.price,
    this.wholesalePrice,
    required this.stockQuantity,
    required this.lowStockThreshold,
    this.imageUrl,
    required this.tags,
    required this.isActive,
    required this.createdAt,
    required this.updatedAt,
  });

  bool get isInStock => stockQuantity > 0;
  bool get isLowStock => stockQuantity <= lowStockThreshold;
  
  double getPriceForRole(String role) {
    if (role == 'customer' && wholesalePrice != null) {
      return wholesalePrice!;
    }
    return price;
  }

  @override
  List<Object?> get props => [
        id,
        name,
        description,
        category,
        price,
        wholesalePrice,
        stockQuantity,
        lowStockThreshold,
        imageUrl,
        tags,
        isActive,
        createdAt,
        updatedAt,
      ];
}