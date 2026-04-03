import 'dart:convert';
import 'package:http/http.dart' as http;

class ApiService {
  static const String baseUrl = 'https://al-baik-api.albaik-ecommerce-api.workers.dev/api';
  
  // Singleton pattern
  static final ApiService _instance = ApiService._internal();
  factory ApiService() => _instance;
  ApiService._internal();

  String? _token;

  void setToken(String token) {
    _token = token;
  }

  Map<String, String> get _headers {
    final headers = {
      'Content-Type': 'application/json',
    };
    if (_token != null) {
      headers['Authorization'] = 'Bearer $_token';
    }
    return headers;
  }

  // Authentication
  Future<Map<String, dynamic>> login(String email, String password) async {
    final response = await http.post(
      Uri.parse('$baseUrl/auth/login'),
      headers: _headers,
      body: jsonEncode({
        'email': email,
        'password': password,
      }),
    );

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      if (data['token'] != null) {
        setToken(data['token']);
      }
      return data;
    } else {
      throw Exception('Login failed: ${response.body}');
    }
  }

  Future<Map<String, dynamic>> register(Map<String, dynamic> userData) async {
    final response = await http.post(
      Uri.parse('$baseUrl/auth/register'),
      headers: _headers,
      body: jsonEncode(userData),
    );

    if (response.statusCode == 201) {
      final data = jsonDecode(response.body);
      if (data['token'] != null) {
        setToken(data['token']);
      }
      return data;
    } else {
      throw Exception('Registration failed: ${response.body}');
    }
  }

  // Products
  Future<Map<String, dynamic>> getProducts({
    int page = 1,
    int limit = 20,
    String? search,
    String? categoryId,
  }) async {
    final queryParams = <String, String>{
      'page': page.toString(),
      'limit': limit.toString(),
    };
    
    if (search != null && search.isNotEmpty) {
      queryParams['search'] = search;
    }
    
    if (categoryId != null && categoryId.isNotEmpty) {
      queryParams['categoryId'] = categoryId;
    }

    final uri = Uri.parse('$baseUrl/products').replace(queryParameters: queryParams);
    final response = await http.get(uri, headers: _headers);

    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    } else {
      throw Exception('Failed to load products: ${response.body}');
    }
  }

  Future<Map<String, dynamic>> getProduct(String id) async {
    final response = await http.get(
      Uri.parse('$baseUrl/products/$id'),
      headers: _headers,
    );

    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    } else {
      throw Exception('Failed to load product: ${response.body}');
    }
  }

  // Categories
  Future<Map<String, dynamic>> getCategories() async {
    final response = await http.get(
      Uri.parse('$baseUrl/categories'),
      headers: _headers,
    );

    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    } else {
      throw Exception('Failed to load categories: ${response.body}');
    }
  }

  Future<Map<String, dynamic>> getCategoryProducts(String categoryId, {int limit = 10}) async {
    final uri = Uri.parse('$baseUrl/categories/$categoryId/top-products').replace(
      queryParameters: {'limit': limit.toString()},
    );
    final response = await http.get(uri, headers: _headers);

    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    } else {
      throw Exception('Failed to load category products: ${response.body}');
    }
  }

  // Admin functions
  Future<Map<String, dynamic>> getAdminStats() async {
    final response = await http.get(
      Uri.parse('$baseUrl/admin/stats'),
      headers: _headers,
    );

    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    } else {
      throw Exception('Failed to load admin stats: ${response.body}');
    }
  }

  // Admin - Categories
  Future<Map<String, dynamic>> createCategory(Map<String, dynamic> categoryData) async {
    final response = await http.post(
      Uri.parse('$baseUrl/categories'),
      headers: _headers,
      body: jsonEncode(categoryData),
    );

    if (response.statusCode == 201) {
      return jsonDecode(response.body);
    } else {
      throw Exception('Failed to create category: ${response.body}');
    }
  }

  Future<Map<String, dynamic>> updateCategory(String categoryId, Map<String, dynamic> categoryData) async {
    final response = await http.put(
      Uri.parse('$baseUrl/categories/$categoryId'),
      headers: _headers,
      body: jsonEncode(categoryData),
    );

    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    } else {
      throw Exception('Failed to update category: ${response.body}');
    }
  }

  Future<Map<String, dynamic>> deleteCategory(String categoryId) async {
    final response = await http.delete(
      Uri.parse('$baseUrl/categories/$categoryId'),
      headers: _headers,
    );

    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    } else {
      throw Exception('Failed to delete category: ${response.body}');
    }
  }

  // Admin - Products
  Future<Map<String, dynamic>> createProduct(Map<String, dynamic> productData) async {
    final response = await http.post(
      Uri.parse('$baseUrl/products'),
      headers: _headers,
      body: jsonEncode(productData),
    );

    if (response.statusCode == 201) {
      return jsonDecode(response.body);
    } else {
      throw Exception('Failed to create product: ${response.body}');
    }
  }

  Future<Map<String, dynamic>> updateProduct(String productId, Map<String, dynamic> productData) async {
    final response = await http.put(
      Uri.parse('$baseUrl/products/$productId'),
      headers: _headers,
      body: jsonEncode(productData),
    );

    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    } else {
      throw Exception('Failed to update product: ${response.body}');
    }
  }

  Future<Map<String, dynamic>> deleteProduct(String productId) async {
    final response = await http.delete(
      Uri.parse('$baseUrl/products/$productId'),
      headers: _headers,
    );

    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    } else {
      throw Exception('Failed to delete product: ${response.body}');
    }
  }

  Future<Map<String, dynamic>> updateProductTopStatus(String productId, bool isTopProduct) async {
    final response = await http.put(
      Uri.parse('$baseUrl/products/$productId/top-status'),
      headers: _headers,
      body: jsonEncode({'isTopProduct': isTopProduct}),
    );

    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    } else {
      throw Exception('Failed to update product status: ${response.body}');
    }
  }
}