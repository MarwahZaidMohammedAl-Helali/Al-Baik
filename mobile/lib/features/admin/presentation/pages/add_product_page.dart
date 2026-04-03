import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/di/injection_container.dart';
import '../../../../services/api_service.dart';
import '../../../products/presentation/bloc/products_bloc.dart';
import '../../../products/presentation/bloc/products_event.dart';

class AddProductPage extends StatefulWidget {
  const AddProductPage({super.key});

  @override
  State<AddProductPage> createState() => _AddProductPageState();
}

class _AddProductPageState extends State<AddProductPage> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _nameArController = TextEditingController();
  final _descriptionController = TextEditingController();
  final _descriptionArController = TextEditingController();
  final _priceController = TextEditingController();
  final _skuController = TextEditingController();
  final _stockController = TextEditingController();
  final _imageUrlController = TextEditingController();
  final _videoUrlController = TextEditingController();
  
  String _selectedCurrency = 'JOD';
  String? _selectedCategoryId;
  List<Map<String, dynamic>> _categories = [];
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    _loadCategories();
  }

  @override
  void dispose() {
    _nameController.dispose();
    _nameArController.dispose();
    _descriptionController.dispose();
    _descriptionArController.dispose();
    _priceController.dispose();
    _skuController.dispose();
    _stockController.dispose();
    _imageUrlController.dispose();
    _videoUrlController.dispose();
    super.dispose();
  }

  Future<void> _loadCategories() async {
    try {
      final apiService = ApiService();
      final response = await apiService.getCategories();
      setState(() {
        _categories = List<Map<String, dynamic>>.from(response['categories'] ?? []);
      });
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to load categories: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  Future<void> _saveProduct() async {
    if (!_formKey.currentState!.validate()) {
      return;
    }

    if (_selectedCategoryId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please select a category'),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }

    setState(() {
      _isLoading = true;
    });

    try {
      final apiService = ApiService();
      
      final productData = {
        'name': _nameController.text.trim(),
        'nameAr': _nameArController.text.trim().isEmpty 
            ? _nameController.text.trim() 
            : _nameArController.text.trim(),
        'description': _descriptionController.text.trim(),
        'descriptionAr': _descriptionArController.text.trim().isEmpty 
            ? _descriptionController.text.trim() 
            : _descriptionArController.text.trim(),
        'price': double.parse(_priceController.text),
        'currency': _selectedCurrency,
        'sku': _skuController.text.trim().isEmpty ? null : _skuController.text.trim(),
        'categoryId': _selectedCategoryId,
        'mainImage': _imageUrlController.text.trim().isEmpty ? null : _imageUrlController.text.trim(),
        'images': _imageUrlController.text.trim().isEmpty ? [] : [_imageUrlController.text.trim()],
        'videoUrl': _videoUrlController.text.trim().isEmpty ? null : _videoUrlController.text.trim(),
        'stockQuantity': int.parse(_stockController.text),
        'tags': [],
        'specifications': {},
      };

      await apiService.createProduct(productData);

      if (mounted) {
        // Refresh products list
        context.read<ProductsBloc>().add(const LoadProducts());
        
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Product created successfully!'),
            backgroundColor: Colors.green,
          ),
        );
        
        context.pop();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to create product: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Add Product'),
        backgroundColor: Theme.of(context).primaryColor,
        foregroundColor: Colors.white,
        actions: [
          if (_isLoading)
            const Center(
              child: Padding(
                padding: EdgeInsets.all(16.0),
                child: SizedBox(
                  width: 20,
                  height: 20,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                  ),
                ),
              ),
            )
          else
            TextButton(
              onPressed: _saveProduct,
              child: const Text(
                'Save',
                style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
              ),
            ),
        ],
      ),
      body: Form(
        key: _formKey,
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Product Name
              TextFormField(
                controller: _nameController,
                decoration: const InputDecoration(
                  labelText: 'Product Name *',
                  border: OutlineInputBorder(),
                ),
                validator: (value) {
                  if (value == null || value.trim().isEmpty) {
                    return 'Product name is required';
                  }
                  return null;
                },
              ),
              
              const SizedBox(height: 16),
              
              // Arabic Product Name
              TextFormField(
                controller: _nameArController,
                decoration: const InputDecoration(
                  labelText: 'Arabic Product Name',
                  border: OutlineInputBorder(),
                  helperText: 'Optional - will use English name if empty',
                ),
                textDirection: TextDirection.rtl,
              ),
              
              const SizedBox(height: 16),
              
              // Category
              DropdownButtonFormField<String>(
                value: _selectedCategoryId,
                decoration: const InputDecoration(
                  labelText: 'Category *',
                  border: OutlineInputBorder(),
                ),
                items: _categories.map((category) {
                  return DropdownMenuItem<String>(
                    value: category['id'],
                    child: Text(category['nameAr'] ?? category['name']),
                  );
                }).toList(),
                onChanged: (value) {
                  setState(() {
                    _selectedCategoryId = value;
                  });
                },
                validator: (value) {
                  if (value == null) {
                    return 'Please select a category';
                  }
                  return null;
                },
              ),
              
              const SizedBox(height: 16),
              
              // Description
              TextFormField(
                controller: _descriptionController,
                decoration: const InputDecoration(
                  labelText: 'Description',
                  border: OutlineInputBorder(),
                ),
                maxLines: 3,
              ),
              
              const SizedBox(height: 16),
              
              // Arabic Description
              TextFormField(
                controller: _descriptionArController,
                decoration: const InputDecoration(
                  labelText: 'Arabic Description',
                  border: OutlineInputBorder(),
                  helperText: 'Optional - will use English description if empty',
                ),
                maxLines: 3,
                textDirection: TextDirection.rtl,
              ),
              
              const SizedBox(height: 16),
              
              // Price and Currency
              Row(
                children: [
                  Expanded(
                    flex: 2,
                    child: TextFormField(
                      controller: _priceController,
                      decoration: const InputDecoration(
                        labelText: 'Price *',
                        border: OutlineInputBorder(),
                      ),
                      keyboardType: TextInputType.number,
                      validator: (value) {
                        if (value == null || value.trim().isEmpty) {
                          return 'Price is required';
                        }
                        if (double.tryParse(value) == null) {
                          return 'Enter a valid price';
                        }
                        return null;
                      },
                    ),
                  ),
                  
                  const SizedBox(width: 16),
                  
                  Expanded(
                    child: DropdownButtonFormField<String>(
                      value: _selectedCurrency,
                      decoration: const InputDecoration(
                        labelText: 'Currency',
                        border: OutlineInputBorder(),
                      ),
                      items: const [
                        DropdownMenuItem(value: 'JOD', child: Text('JOD')),
                        DropdownMenuItem(value: 'USD', child: Text('USD')),
                        DropdownMenuItem(value: 'EUR', child: Text('EUR')),
                      ],
                      onChanged: (value) {
                        setState(() {
                          _selectedCurrency = value!;
                        });
                      },
                    ),
                  ),
                ],
              ),
              
              const SizedBox(height: 16),
              
              // SKU
              TextFormField(
                controller: _skuController,
                decoration: const InputDecoration(
                  labelText: 'SKU',
                  border: OutlineInputBorder(),
                  helperText: 'Optional - will be auto-generated if empty',
                ),
              ),
              
              const SizedBox(height: 16),
              
              // Stock Quantity
              TextFormField(
                controller: _stockController,
                decoration: const InputDecoration(
                  labelText: 'Stock Quantity *',
                  border: OutlineInputBorder(),
                ),
                keyboardType: TextInputType.number,
                validator: (value) {
                  if (value == null || value.trim().isEmpty) {
                    return 'Stock quantity is required';
                  }
                  if (int.tryParse(value) == null) {
                    return 'Enter a valid quantity';
                  }
                  return null;
                },
              ),
              
              const SizedBox(height: 16),
              
              // Image URL
              TextFormField(
                controller: _imageUrlController,
                decoration: const InputDecoration(
                  labelText: 'Image URL',
                  border: OutlineInputBorder(),
                  helperText: 'Optional - URL to product image',
                ),
                keyboardType: TextInputType.url,
              ),
              
              const SizedBox(height: 16),
              
              // Video URL
              TextFormField(
                controller: _videoUrlController,
                decoration: const InputDecoration(
                  labelText: 'Video URL',
                  border: OutlineInputBorder(),
                  helperText: 'Optional - URL to product video',
                ),
                keyboardType: TextInputType.url,
              ),
              
              const SizedBox(height: 32),
              
              // Save Button
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _isLoading ? null : _saveProduct,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Theme.of(context).primaryColor,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                  ),
                  child: _isLoading
                      ? const SizedBox(
                          height: 20,
                          width: 20,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                          ),
                        )
                      : const Text(
                          'Create Product',
                          style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                        ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}