import 'package:flutter/material.dart';

void main() {
  runApp(const WholesaleECommerceApp());
}

class WholesaleECommerceApp extends StatelessWidget {
  const WholesaleECommerceApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Wholesale E-Commerce',
      theme: ThemeData(
        primarySwatch: Colors.blue,
        useMaterial3: true,
      ),
      home: const HomePage(),
    );
  }
}

class HomePage extends StatefulWidget {
  const HomePage({super.key});

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  int _selectedIndex = 0;
  final List<CartItem> _cartItems = [];

  final List<Product> _products = [
    Product(
      id: '1',
      name: 'iPhone 15 Pro',
      price: 999.99,
      category: 'Smartphones',
      imageUrl: 'https://via.placeholder.com/150',
    ),
    Product(
      id: '2',
      name: 'MacBook Pro',
      price: 1999.99,
      category: 'Laptops',
      imageUrl: 'https://via.placeholder.com/150',
    ),
    Product(
      id: '3',
      name: 'AirPods Pro',
      price: 249.99,
      category: 'Accessories',
      imageUrl: 'https://via.placeholder.com/150',
    ),
    Product(
      id: '4',
      name: 'iPad Air',
      price: 599.99,
      category: 'Tablets',
      imageUrl: 'https://via.placeholder.com/150',
    ),
  ];

  void _addToCart(Product product) {
    setState(() {
      final existingIndex = _cartItems.indexWhere((item) => item.product.id == product.id);
      if (existingIndex >= 0) {
        _cartItems[existingIndex] = CartItem(
          product: product,
          quantity: _cartItems[existingIndex].quantity + 1,
        );
      } else {
        _cartItems.add(CartItem(product: product, quantity: 1));
      }
    });
    
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('${product.name} added to cart')),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Wholesale E-Commerce'),
        backgroundColor: Theme.of(context).primaryColor,
        foregroundColor: Colors.white,
        actions: [
          Stack(
            children: [
              IconButton(
                icon: const Icon(Icons.shopping_cart),
                onPressed: () {
                  setState(() {
                    _selectedIndex = 1;
                  });
                },
              ),
              if (_cartItems.isNotEmpty)
                Positioned(
                  right: 8,
                  top: 8,
                  child: Container(
                    padding: const EdgeInsets.all(2),
                    decoration: BoxDecoration(
                      color: Colors.red,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    constraints: const BoxConstraints(
                      minWidth: 16,
                      minHeight: 16,
                    ),
                    child: Text(
                      '${_cartItems.length}',
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 12,
                      ),
                      textAlign: TextAlign.center,
                    ),
                  ),
                ),
            ],
          ),
        ],
      ),
      body: IndexedStack(
        index: _selectedIndex,
        children: [
          _buildProductsPage(),
          _buildCartPage(),
          _buildOrdersPage(),
        ],
      ),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _selectedIndex,
        onTap: (index) {
          setState(() {
            _selectedIndex = index;
          });
        },
        items: const [
          BottomNavigationBarItem(
            icon: Icon(Icons.store),
            label: 'Products',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.shopping_cart),
            label: 'Cart',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.receipt),
            label: 'Orders',
          ),
        ],
      ),
    );
  }

  Widget _buildProductsPage() {
    return GridView.builder(
      padding: const EdgeInsets.all(16),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        childAspectRatio: 0.8,
        crossAxisSpacing: 16,
        mainAxisSpacing: 16,
      ),
      itemCount: _products.length,
      itemBuilder: (context, index) {
        final product = _products[index];
        return Card(
          clipBehavior: Clip.antiAlias,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Container(
                  width: double.infinity,
                  color: Colors.grey[100],
                  child: const Icon(
                    Icons.inventory_2,
                    size: 48,
                    color: Colors.grey,
                  ),
                ),
              ),
              Padding(
                padding: const EdgeInsets.all(8),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      product.name,
                      style: const TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 14,
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 4),
                    Text(
                      product.category,
                      style: TextStyle(
                        color: Colors.grey[600],
                        fontSize: 12,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          '\$${product.price.toStringAsFixed(2)}',
                          style: TextStyle(
                            color: Theme.of(context).primaryColor,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        ElevatedButton(
                          onPressed: () => _addToCart(product),
                          style: ElevatedButton.styleFrom(
                            minimumSize: const Size(60, 30),
                            padding: const EdgeInsets.symmetric(horizontal: 8),
                          ),
                          child: const Text('Add', style: TextStyle(fontSize: 12)),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildCartPage() {
    if (_cartItems.isEmpty) {
      return const Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.shopping_cart_outlined, size: 64, color: Colors.grey),
            SizedBox(height: 16),
            Text('Your cart is empty', style: TextStyle(fontSize: 18, color: Colors.grey)),
          ],
        ),
      );
    }

    final total = _cartItems.fold<double>(
      0,
      (sum, item) => sum + (item.product.price * item.quantity),
    );

    return Column(
      children: [
        Expanded(
          child: ListView.builder(
            itemCount: _cartItems.length,
            itemBuilder: (context, index) {
              final item = _cartItems[index];
              return ListTile(
                leading: Container(
                  width: 50,
                  height: 50,
                  color: Colors.grey[100],
                  child: const Icon(Icons.inventory_2),
                ),
                title: Text(item.product.name),
                subtitle: Text('\$${item.product.price.toStringAsFixed(2)}'),
                trailing: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    IconButton(
                      icon: const Icon(Icons.remove),
                      onPressed: () {
                        setState(() {
                          if (item.quantity > 1) {
                            _cartItems[index] = CartItem(
                              product: item.product,
                              quantity: item.quantity - 1,
                            );
                          } else {
                            _cartItems.removeAt(index);
                          }
                        });
                      },
                    ),
                    Text('${item.quantity}'),
                    IconButton(
                      icon: const Icon(Icons.add),
                      onPressed: () {
                        setState(() {
                          _cartItems[index] = CartItem(
                            product: item.product,
                            quantity: item.quantity + 1,
                          );
                        });
                      },
                    ),
                  ],
                ),
              );
            },
          ),
        ),
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.grey[100],
            border: Border(top: BorderSide(color: Colors.grey[300]!)),
          ),
          child: Column(
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Total:', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                  Text('\$${total.toStringAsFixed(2)}', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                ],
              ),
              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () {
                    setState(() {
                      _cartItems.clear();
                    });
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Order placed successfully!')),
                    );
                  },
                  child: const Text('Checkout'),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildOrdersPage() {
    return const Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.receipt_outlined, size: 64, color: Colors.grey),
          SizedBox(height: 16),
          Text('No orders yet', style: TextStyle(fontSize: 18, color: Colors.grey)),
          SizedBox(height: 8),
          Text('Your orders will appear here', style: TextStyle(color: Colors.grey)),
        ],
      ),
    );
  }
}

class Product {
  final String id;
  final String name;
  final double price;
  final String category;
  final String imageUrl;

  Product({
    required this.id,
    required this.name,
    required this.price,
    required this.category,
    required this.imageUrl,
  });
}

class CartItem {
  final Product product;
  final int quantity;

  CartItem({
    required this.product,
    required this.quantity,
  });
}