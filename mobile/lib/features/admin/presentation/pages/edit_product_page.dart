import 'package:flutter/material.dart';
import '../../../../services/api_service.dart';

class EditProductPage extends StatefulWidget {
  final Map<String, dynamic> product;

  const EditProductPage({super.key, required this.product});

  @override
  State<EditProductPage> createState() => _EditProductPageState();
}

class _EditProductPageState extends State<EditProductPage> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _descriptionController = TextEditingController();
  final _priceController = TextEditingController();
  final _skuController = TextEditingController();
  final _stockController = TextEditingController();
  final _tagsController = TextEditingController();
  final _imageUrlController = TextEditingController();
  
  String _selectedCategoryId = '';
  String _selectedCurrency = 'JOD';
  bool _inStock = true;
  bool _isLoading = false;
  
  List<Map<String, dynamic>> _categories = [];

  @override
  void initState() {
    super.initState();
    _initializeForm();
    _loadCategories();
  }

  void _initializeForm() {
    _nameController.text = widget.product['nameAr'] ?? widget.product['name'] ?? '';
    _descriptionController.text = widget.product['descriptionAr'] ?? widget.product['description'] ?? '';
    _priceController.text = (widget.product['price'] ?? 0).toString();
    _skuController.text = widget.product['sku'] ?? '';
    _stockController.text = (widget.product['stockQuantity'] ?? 0).toString();
    _imageUrlController.text = widget.product['mainImage'] ?? '';
    _selectedCategoryId = widget.product['categoryId'] ?? '';
    _selectedCurrency = widget.product['currency'] ?? 'JOD';
    _inStock = widget.product['inStock'] ?? true;
    
    // Handle tags
    if (widget.product['tags'] != null && widget.product['tags'] is List) {
      _tagsController.text = (widget.product['tags'] as List).join(', ');
    }
  }

  Future<void> _loadCategories() async {
    try {
      final apiService = ApiService();
      final response = await apiService.getCategories();
      
      if (mounted) {
        setState(() {
          _categories = List<Map<String, dynamic>>.from(response['categories'] ?? []);
        });
      }
    } catch (e) {
      print('Error loading categories: $e');
    }
  }

  @override
  void dispose() {
    _nameController.dispose();
    _descriptionController.dispose();
    _priceController.dispose();
    _skuController.dispose();
    _stockController.dispose();
    _tagsController.dispose();
    _imageUrlController.dispose();
    super.dispose();
  }

  Future<void> _updateProduct() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isLoading = true);

    try {
      final apiService = ApiService();
      
      final productData = {
        'name': _nameController.text.trim(),
        'nameAr': _nameController.text.trim(),
        'description': _descriptionController.text.trim().isEmpty 
            ? null 
            : _descriptionController.text.trim(),
        'descriptionAr': _descriptionController.text.trim().isEmpty 
            ? null 
            : _descriptionController.text.trim(),
        'price': double.tryParse(_priceController.text) ?? 0,
        'currency': _selectedCurrency,
        'sku': _skuController.text.trim().isEmpty ? null : _skuController.text.trim(),
        'categoryId': _selectedCategoryId,
        'mainImage': _imageUrlController.text.trim().isEmpty ? null : _imageUrlController.text.trim(),
        'stockQuantity': int.tryParse(_stockController.text) ?? 0,
        'inStock': _inStock,
        'tags': _tagsController.text.trim().isEmpty 
            ? [] 
            : _tagsController.text.split(',').map((tag) => tag.trim()).where((tag) => tag.isNotEmpty).toList(),
      };

      await apiService.updateProduct(widget.product['id'], productData);

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('تم تحديث المنتج بنجاح'),
            backgroundColor: Colors.green,
          ),
        );
        Navigator.pop(context);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('خطأ في تحديث المنتج: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        backgroundColor: Colors.grey[50],
        appBar: AppBar(
          title: const Text('تعديل المنتج'),
          backgroundColor: const Color(0xFFD32F2F),
          foregroundColor: Colors.white,
          elevation: 0,
        ),
        body: Form(
          key: _formKey,
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Header Card
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.grey.withOpacity(0.1),
                        blurRadius: 10,
                        offset: const Offset(0, 2),
                      ),
                    ],
                  ),
                  child: Column(
                    children: [
                      Container(
                        width: 80,
                        height: 80,
                        decoration: BoxDecoration(
                          color: Colors.grey[100],
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(12),
                          child: widget.product['mainImage'] != null
                              ? Image.network(
                                  widget.product['mainImage'],
                                  fit: BoxFit.cover,
                                  errorBuilder: (context, error, stackTrace) {
                                    return const Center(
                                      child: Icon(Icons.inventory_2, size: 32, color: Colors.grey),
                                    );
                                  },
                                )
                              : const Center(
                                  child: Icon(Icons.inventory_2, size: 32, color: Colors.grey),
                                ),
                        ),
                      ),
                      const SizedBox(height: 16),
                      const Text(
                        'تعديل بيانات المنتج',
                        style: TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.bold,
                          color: Colors.black87,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'ID: ${widget.product['id']}',
                        style: TextStyle(
                          fontSize: 14,
                          color: Colors.grey[600],
                        ),
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 24),

                // Basic Info
                _buildSection(
                  'المعلومات الأساسية',
                  [
                    _buildTextField(
                      controller: _nameController,
                      label: 'اسم المنتج *',
                      hint: 'مثال: iPhone 15 Pro Max',
                      validator: (value) {
                        if (value == null || value.trim().isEmpty) {
                          return 'يرجى إدخال اسم المنتج';
                        }
                        return null;
                      },
                    ),
                    const SizedBox(height: 16),
                    _buildTextField(
                      controller: _descriptionController,
                      label: 'الوصف',
                      hint: 'وصف تفصيلي للمنتج...',
                      maxLines: 3,
                    ),
                    const SizedBox(height: 16),
                    _buildDropdown(
                      label: 'القسم *',
                      value: _selectedCategoryId.isEmpty ? null : _selectedCategoryId,
                      items: _categories.map((category) => DropdownMenuItem<String>(
                        value: category['id'],
                        child: Text(category['nameAr'] ?? category['name'] ?? 'قسم'),
                      )).toList(),
                      onChanged: (value) => setState(() => _selectedCategoryId = value ?? ''),
                      validator: (value) {
                        if (value == null || value.isEmpty) {
                          return 'يرجى اختيار القسم';
                        }
                        return null;
                      },
                    ),
                  ],
                ),

                const SizedBox(height: 24),

                // Pricing & Stock
                _buildSection(
                  'السعر والمخزون',
                  [
                    Row(
                      children: [
                        Expanded(
                          flex: 2,
                          child: _buildTextField(
                            controller: _priceController,
                            label: 'السعر *',
                            hint: '0.00',
                            keyboardType: TextInputType.number,
                            validator: (value) {
                              if (value == null || value.trim().isEmpty) {
                                return 'يرجى إدخال السعر';
                              }
                              if (double.tryParse(value) == null) {
                                return 'يرجى إدخال رقم صحيح';
                              }
                              return null;
                            },
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: _buildDropdown(
                            label: 'العملة',
                            value: _selectedCurrency,
                            items: const [
                              DropdownMenuItem(value: 'JOD', child: Text('JOD')),
                              DropdownMenuItem(value: 'USD', child: Text('USD')),
                              DropdownMenuItem(value: 'EUR', child: Text('EUR')),
                            ],
                            onChanged: (value) => setState(() => _selectedCurrency = value ?? 'JOD'),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    Row(
                      children: [
                        Expanded(
                          child: _buildTextField(
                            controller: _stockController,
                            label: 'الكمية المتوفرة *',
                            hint: '0',
                            keyboardType: TextInputType.number,
                            validator: (value) {
                              if (value == null || value.trim().isEmpty) {
                                return 'يرجى إدخال الكمية';
                              }
                              if (int.tryParse(value) == null) {
                                return 'يرجى إدخال رقم صحيح';
                              }
                              return null;
                            },
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: _buildTextField(
                            controller: _skuController,
                            label: 'رمز المنتج (SKU)',
                            hint: 'اختياري',
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          'حالة التوفر',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w600,
                            color: Colors.black87,
                          ),
                        ),
                        Switch(
                          value: _inStock,
                          onChanged: (value) => setState(() => _inStock = value),
                          activeColor: const Color(0xFFD32F2F),
                        ),
                      ],
                    ),
                    Text(
                      _inStock ? 'المنتج متوفر للبيع' : 'المنتج غير متوفر',
                      style: TextStyle(
                        fontSize: 14,
                        color: Colors.grey[600],
                      ),
                    ),
                  ],
                ),

                const SizedBox(height: 24),

                // Additional Info
                _buildSection(
                  'معلومات إضافية',
                  [
                    _buildTextField(
                      controller: _imageUrlController,
                      label: 'رابط الصورة الرئيسية',
                      hint: 'https://example.com/image.jpg',
                    ),
                    const SizedBox(height: 16),
                    _buildTextField(
                      controller: _tagsController,
                      label: 'الكلمات المفتاحية',
                      hint: 'مثال: هاتف, ذكي, آيفون (مفصولة بفواصل)',
                    ),
                  ],
                ),

                const SizedBox(height: 32),

                // Update Button
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: _isLoading ? null : _updateProduct,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFFD32F2F),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                      elevation: 2,
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
                            'تحديث المنتج',
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildSection(String title, List<Widget> children) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.grey.withOpacity(0.1),
            blurRadius: 10,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: const TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: Colors.black87,
            ),
          ),
          const SizedBox(height: 16),
          ...children,
        ],
      ),
    );
  }

  Widget _buildTextField({
    required TextEditingController controller,
    required String label,
    String? hint,
    int maxLines = 1,
    TextInputType? keyboardType,
    String? Function(String?)? validator,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w600,
            color: Colors.black87,
          ),
        ),
        const SizedBox(height: 8),
        TextFormField(
          controller: controller,
          textAlign: TextAlign.right,
          maxLines: maxLines,
          keyboardType: keyboardType,
          validator: validator,
          decoration: InputDecoration(
            hintText: hint,
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide(color: Colors.grey[300]!),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: Color(0xFFD32F2F)),
            ),
            contentPadding: const EdgeInsets.all(16),
          ),
        ),
      ],
    );
  }

  Widget _buildDropdown<T>({
    required String label,
    required T? value,
    required List<DropdownMenuItem<T>> items,
    required void Function(T?) onChanged,
    String? Function(T?)? validator,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w600,
            color: Colors.black87,
          ),
        ),
        const SizedBox(height: 8),
        DropdownButtonFormField<T>(
          value: value,
          items: items,
          onChanged: onChanged,
          validator: validator,
          decoration: InputDecoration(
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide(color: Colors.grey[300]!),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: Color(0xFFD32F2F)),
            ),
            contentPadding: const EdgeInsets.all(16),
          ),
        ),
      ],
    );
  }
}