import '../../domain/entities/product.dart';

class ProductModel extends Product {
  const ProductModel({
    required super.id,
    required super.name,
    required super.description,
    required super.category,
    required super.price,
    super.wholesalePrice,
    required super.stockQuantity,
    required super.lowStockThreshold,
    super.imageUrl,
    required super.tags,
    required super.isActive,
    required super.createdAt,
    required super.updatedAt,
  });

  factory ProductModel.fromJson(Map<String, dynamic> json) {
    return ProductModel(
      id: json['_id'] ?? json['id'],
      name: json['name'],
      description: json['description'],
      category: json['category'],
      price: (json['price'] as num).toDouble(),
      wholesalePrice: json['wholesalePrice'] != null 
          ? (json['wholesalePrice'] as num).toDouble() 
          : null,
      stockQuantity: json['stockQuantity'] ?? 0,
      lowStockThreshold: json['lowStockThreshold'] ?? 0,
      imageUrl: json['imageUrl'],
      tags: List<String>.from(json['tags'] ?? []),
      isActive: json['isActive'] ?? true,
      createdAt: DateTime.parse(json['createdAt']),
      updatedAt: DateTime.parse(json['updatedAt']),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'description': description,
      'category': category,
      'price': price,
      'wholesalePrice': wholesalePrice,
      'stockQuantity': stockQuantity,
      'lowStockThreshold': lowStockThreshold,
      'imageUrl': imageUrl,
      'tags': tags,
      'isActive': isActive,
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt.toIso8601String(),
    };
  }

  Product toEntity() {
    return Product(
      id: id,
      name: name,
      description: description,
      category: category,
      price: price,
      wholesalePrice: wholesalePrice,
      stockQuantity: stockQuantity,
      lowStockThreshold: lowStockThreshold,
      imageUrl: imageUrl,
      tags: tags,
      isActive: isActive,
      createdAt: createdAt,
      updatedAt: updatedAt,
    );
  }
}