import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../../services/api_service.dart';

class AddCategoryPage extends StatefulWidget {
  const AddCategoryPage({super.key});

  @override
  State<AddCategoryPage> createState() => _AddCategoryPageState();
}

class _AddCategoryPageState extends State<AddCategoryPage> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _nameArController = TextEditingController();
  final _descriptionController = TextEditingController();
  final _descriptionArController = TextEditingController();
  
  String _selectedIcon = '📱';
  String _selectedColor = '#D32F2F';
  bool _isLoading = false;

  // Business-relevant icons
  final List<String> _recommendedIcons = [
    '📱', '💻', '⚡', '🔌', '📺', '🎧', '⌚', '📷', '🖨️', '💡',
    '🔋', '🖱️', '⌨️', '💾', '📀', '🎮', '🔊', '📻', '📞', '🖥️'
  ];

  final List<Map<String, String>> _colors = [
    {'name': 'Red', 'value': '#D32F2F'},
    {'name': 'Blue', 'value': '#1976D2'},
    {'name': 'Green', 'value': '#388E3C'},
    {'name': 'Orange', 'value': '#F57C00'},
    {'name': 'Purple', 'value': '#7B1FA2'},
    {'name': 'Teal', 'value': '#00796B'},
  ];

  @override
  void dispose() {
    _nameController.dispose();
    _nameArController.dispose();
    _descriptionController.dispose();
    _descriptionArController.dispose();
    super.dispose();
  }

  Future<void> _saveCategory() async {
    if (!_formKey.currentState!.validate()) {
      return;
    }

    setState(() {
      _isLoading = true;
    });

    try {
      final apiService = ApiService();
      
      final categoryData = {
        'name': _nameController.text.trim(),
        'nameAr': _nameArController.text.trim().isEmpty 
            ? _nameController.text.trim() 
            : _nameArController.text.trim(),
        'description': _descriptionController.text.trim().isEmpty ? null : _descriptionController.text.trim(),
        'descriptionAr': _descriptionArController.text.trim().isEmpty 
            ? _descriptionController.text.trim() 
            : _descriptionArController.text.trim(),
        'icon': _selectedIcon,
        'color': _selectedColor,
        'sortOrder': 0,
      };

      await apiService.createCategory(categoryData);

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Category created successfully!'),
            backgroundColor: Colors.green,
          ),
        );
        
        context.pop();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to create category: $e'),
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
        title: const Text('Add Category'),
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
              onPressed: _saveCategory,
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
              // Category Name
              TextFormField(
                controller: _nameController,
                decoration: const InputDecoration(
                  labelText: 'Category Name *',
                  border: OutlineInputBorder(),
                ),
                validator: (value) {
                  if (value == null || value.trim().isEmpty) {
                    return 'Category name is required';
                  }
                  return null;
                },
              ),
              
              const SizedBox(height: 16),
              
              // Arabic Category Name
              TextFormField(
                controller: _nameArController,
                decoration: const InputDecoration(
                  labelText: 'Arabic Category Name',
                  border: OutlineInputBorder(),
                  helperText: 'Optional - will use English name if empty',
                ),
                textDirection: TextDirection.rtl,
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
              
              const SizedBox(height: 24),
              
              // Icon Selection
              Text(
                'Category Icon',
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 8),
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  border: Border.all(color: Colors.grey.shade300),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Column(
                  children: [
                    // Selected Icon Preview
                    Container(
                      width: 60,
                      height: 60,
                      decoration: BoxDecoration(
                        color: Color(int.parse(_selectedColor.substring(1), radix: 16) + 0xFF000000).withOpacity(0.2),
                        borderRadius: BorderRadius.circular(30),
                      ),
                      child: Center(
                        child: Text(
                          _selectedIcon,
                          style: const TextStyle(fontSize: 30),
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                    
                    // Icon Grid
                    GridView.builder(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                        crossAxisCount: 10,
                        crossAxisSpacing: 8,
                        mainAxisSpacing: 8,
                      ),
                      itemCount: _recommendedIcons.length,
                      itemBuilder: (context, index) {
                        final icon = _recommendedIcons[index];
                        final isSelected = icon == _selectedIcon;
                        
                        return GestureDetector(
                          onTap: () {
                            setState(() {
                              _selectedIcon = icon;
                            });
                          },
                          child: Container(
                            decoration: BoxDecoration(
                              color: isSelected ? Theme.of(context).primaryColor.withOpacity(0.2) : Colors.grey.shade100,
                              border: Border.all(
                                color: isSelected ? Theme.of(context).primaryColor : Colors.grey.shade300,
                                width: isSelected ? 2 : 1,
                              ),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Center(
                              child: Text(
                                icon,
                                style: const TextStyle(fontSize: 20),
                              ),
                            ),
                          ),
                        );
                      },
                    ),
                  ],
                ),
              ),
              
              const SizedBox(height: 24),
              
              // Color Selection
              Text(
                'Category Color',
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 8),
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  border: Border.all(color: Colors.grey.shade300),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                  children: _colors.map((colorData) {
                    final color = Color(int.parse(colorData['value']!.substring(1), radix: 16) + 0xFF000000);
                    final isSelected = colorData['value'] == _selectedColor;
                    
                    return GestureDetector(
                      onTap: () {
                        setState(() {
                          _selectedColor = colorData['value']!;
                        });
                      },
                      child: Container(
                        width: 40,
                        height: 40,
                        decoration: BoxDecoration(
                          color: color,
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(
                            color: isSelected ? Colors.black : Colors.transparent,
                            width: 3,
                          ),
                        ),
                        child: isSelected
                            ? const Icon(
                                Icons.check,
                                color: Colors.white,
                                size: 20,
                              )
                            : null,
                      ),
                    );
                  }).toList(),
                ),
              ),
              
              const SizedBox(height: 32),
              
              // Save Button
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _isLoading ? null : _saveCategory,
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
                          'Create Category',
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