class Product {
  final String id;
  final String name;
  final String nameAr;
  final String description;
  final double price;
  final String currency;
  final String? mainImage;
  final List<String> images;
  final String? videoUrl;
  final bool inStock;
  final int stockQuantity;
  final double rating;
  final int reviewCount;
  final int salesCount;
  final String categoryId;
  final bool isTopProduct;
  final bool isActive;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  Product({
    required this.id,
    required this.name,
    required this.nameAr,
    required this.description,
    required this.price,
    this.currency = 'د.أ',
    this.mainImage,
    this.images = const [],
    this.videoUrl,
    this.inStock = true,
    this.stockQuantity = 0,
    this.rating = 0.0,
    this.reviewCount = 0,
    this.salesCount = 0,
    required this.categoryId,
    this.isTopProduct = false,
    this.isActive = true,
    this.createdAt,
    this.updatedAt,
  });

  factory Product.fromJson(Map<String, dynamic> json) {
    return Product(
      id: json['id'] ?? '',
      name: json['name'] ?? '',
      nameAr: json['nameAr'] ?? '',
      description: json['description'] ?? '',
      price: (json['price'] ?? 0).toDouble(),
      currency: json['currency'] ?? 'د.أ',
      mainImage: json['mainImage'],
      images: json['images'] is List 
          ? List<String>.from(json['images']) 
          : [],
      videoUrl: json['videoUrl'],
      inStock: json['inStock'] == 1 || json['inStock'] == true,
      stockQuantity: json['stockQuantity'] ?? 0,
      rating: (json['rating'] ?? 0).toDouble(),
      reviewCount: json['reviewCount'] ?? 0,
      salesCount: json['salesCount'] ?? 0,
      categoryId: json['categoryId'] ?? '',
      isTopProduct: json['isTopProduct'] == 1 || json['isTopProduct'] == true,
      isActive: json['isActive'] == 1 || json['isActive'] == true,
      createdAt: json['createdAt'] != null ? DateTime.tryParse(json['createdAt']) : null,
      updatedAt: json['updatedAt'] != null ? DateTime.tryParse(json['updatedAt']) : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'nameAr': nameAr,
      'description': description,
      'price': price,
      'currency': currency,
      'mainImage': mainImage,
      'images': images,
      'videoUrl': videoUrl,
      'inStock': inStock,
      'stockQuantity': stockQuantity,
      'rating': rating,
      'reviewCount': reviewCount,
      'salesCount': salesCount,
      'categoryId': categoryId,
      'isTopProduct': isTopProduct,
      'isActive': isActive,
      'createdAt': createdAt?.toIso8601String(),
      'updatedAt': updatedAt?.toIso8601String(),
    };
  }

  Product copyWith({
    String? id,
    String? name,
    String? nameAr,
    String? description,
    double? price,
    String? currency,
    String? mainImage,
    List<String>? images,
    String? videoUrl,
    bool? inStock,
    int? stockQuantity,
    double? rating,
    int? reviewCount,
    int? salesCount,
    String? categoryId,
    bool? isTopProduct,
    bool? isActive,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return Product(
      id: id ?? this.id,
      name: name ?? this.name,
      nameAr: nameAr ?? this.nameAr,
      description: description ?? this.description,
      price: price ?? this.price,
      currency: currency ?? this.currency,
      mainImage: mainImage ?? this.mainImage,
      images: images ?? this.images,
      videoUrl: videoUrl ?? this.videoUrl,
      inStock: inStock ?? this.inStock,
      stockQuantity: stockQuantity ?? this.stockQuantity,
      rating: rating ?? this.rating,
      reviewCount: reviewCount ?? this.reviewCount,
      salesCount: salesCount ?? this.salesCount,
      categoryId: categoryId ?? this.categoryId,
      isTopProduct: isTopProduct ?? this.isTopProduct,
      isActive: isActive ?? this.isActive,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }
}