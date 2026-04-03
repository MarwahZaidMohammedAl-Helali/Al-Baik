import 'package:flutter/material.dart';
import 'package:video_player/video_player.dart';
import 'package:flutter/services.dart';
import 'package:path_provider/path_provider.dart';
import 'dart:io';
import 'dart:typed_data';

import 'services/api_service.dart';

// Cart item class
class CartItem {
  final Product product;
  int quantity;

  CartItem({required this.product, this.quantity = 1});
}

// Simple cart manager
class CartManager {
  static final CartManager _instance = CartManager._internal();
  factory CartManager() => _instance;
  CartManager._internal();

  final List<CartItem> _items = [];
  final ValueNotifier<int> cartItemCount = ValueNotifier<int>(0);

  List<CartItem> get items => _items;

  void addToCart(Product product) {
    // Check if product already exists in cart
    final existingIndex = _items.indexWhere((item) => item.product.id == product.id);
    
    if (existingIndex >= 0) {
      // Increase quantity if product exists
      _items[existingIndex].quantity++;
    } else {
      // Add new product to cart
      _items.add(CartItem(product: product));
    }
    
    cartItemCount.value = _items.fold(0, (sum, item) => sum + item.quantity);
  }

  void removeFromCart(String productId) {
    _items.removeWhere((item) => item.product.id == productId);
    cartItemCount.value = _items.fold(0, (sum, item) => sum + item.quantity);
  }

  void updateQuantity(String productId, int quantity) {
    final index = _items.indexWhere((item) => item.product.id == productId);
    if (index >= 0) {
      if (quantity <= 0) {
        _items.removeAt(index);
      } else {
        _items[index].quantity = quantity;
      }
      cartItemCount.value = _items.fold(0, (sum, item) => sum + item.quantity);
    }
  }

  double get totalPrice {
    return _items.fold(0.0, (sum, item) {
      final price = double.tryParse(item.product.price.replaceAll(RegExp(r'[^\d.]'), '')) ?? 0.0;
      return sum + (price * item.quantity);
    });
  }

  void clearCart() {
    _items.clear();
    cartItemCount.value = 0;
  }
}

// Product data structure
class Product {
  final String id;
  final String name;
  final String price;
  final String description;
  final String mainImage;
  final List<String> galleryImages;
  final String videoPath;

  Product({
    required this.id,
    required this.name,
    required this.price,
    required this.description,
    required this.mainImage,
    required this.galleryImages,
    required this.videoPath,
  });
}

// Kitchen appliances products data
final List<Product> kitchenProducts = [
  Product(
    id: '1',
    name: 'خلاط كهربائي متعدد الوظائف',
    price: '299.99 د.أ',
    description: 'خلاط كهربائي متعدد الوظائف يتميز بقوة أداء عالية وتصميم عملي مع مجموعة ملحقات متنوعة لتلبية جميع احتياجات المطبخ. مثالي لتحضير العصائر، طحن القهوة والتوابل، وخفق المكونات بسهولة وسرعة، ليمنحك نتائج احترافية يوميًا بكل راحة.',
    mainImage: 'assets/Product1/Main Photo.png',
    galleryImages: ['assets/Product1/Another photo.png'],
    videoPath: 'assets/Product1/product1 Video.mp4',
  ),
  Product(
    id: '2',
    name: 'غلاية كهربائية زجاج',
    price: '159.99 د.أ',
    description: 'غلاية ماء كهربائية زجاجية 1.8 لتر تتميز بتصميم أنيق وعصري مع سعة كبيرة تناسب الاستخدام اليومي. توفر غليانًا سريعًا وآمنًا بفضل قاعدة التسخين القوية، مع مؤشر مستوى الماء لسهولة الاستخدام. مثالية لتحضير الشاي، القهوة، والمشروبات الساخنة بكل راحة وسرعة.',
    mainImage: 'assets/Product2/Main Photo.png',
    galleryImages: ['assets/Product2/Another photo 1.png', 'assets/Product2/Another photo 2.png'],
    videoPath: 'assets/Product2/product2 Video.mp4',
  ),
  Product(
    id: '3',
    name: 'غلاية كهربائية عصرية',
    price: '189.99 د.أ',
    description: 'غلاية كهربائية بتصميم حديث وأنيق تجمع بين الأداء العالي والشكل الجذاب، مزودة بهيكل متين وسعة مناسبة للاستخدام اليومي. توفر غليانًا سريعًا وآمنًا مع سهولة في الاستخدام، مما يجعلها مثالية لتحضير القهوة، الشاي، والمشروبات الساخنة بكل راحة وأناقة.',
    mainImage: 'assets/Product3/Main Photo.jpeg',
    galleryImages: ['assets/Product3/Another photo.png'],
    videoPath: 'assets/Product3/product3 Video.mp4',
  ),
  Product(
    id: '4',
    name: 'موقد كهربائي مسطح (سيراميك)',
    price: '449.99 د.أ',
    description: 'موقد كهربائي بتصميم عصري وأنيق يوفر أداءً عاليًا لتسخين وطهي مختلف الأطعمة بسهولة وسرعة. يتميز بسطح سيراميك متين سهل التنظيف مع لوحة تحكم رقمية وخيارات متعددة للطهي، مما يجعله مثاليًا للاستخدام اليومي في المطبخ أو أثناء السفر، مع أمان وكفاءة عالية في استهلاك الطاقة.',
    mainImage: 'assets/Product4/Main Photo.jpeg',
    galleryImages: ['assets/Product4/Another photo.jpg'],
    videoPath: 'assets/Product4/product4 Video.mp4',
  ),
  Product(
    id: '5',
    name: 'قدر ضغط كهربائي متعدد الوظائف',
    price: '599.99 د.أ',
    description: 'قدر ضغط كهربائي عملي يجمع بين السرعة والكفاءة لتحضير مختلف الأطباق بسهولة. يتميز ببرامج طهي متعددة ولوحة تحكم رقمية ذكية تتيح لك طهي الأرز، اللحوم، الشوربات وغيرها بلمسة واحدة، مع نظام أمان عالي يحافظ على سلامتك ويمنحك نتائج لذيذة في وقت أقل.',
    mainImage: 'assets/Product5/Main Photo.png',
    galleryImages: ['assets/Product5/Another photo.png'],
    videoPath: 'assets/Product5/product5 Video.mp4',
  ),
  Product(
    id: '6',
    name: 'عجّانة كهربائية',
    price: '799.99 د.أ',
    description: 'عجّانة كهربائية قوية بتصميم أنيق مزودة بوعاء ستانلس ستيل عالي الجودة، مثالية للعجن، الخفق، وخلط المكونات بسهولة. تتميز بسرعات متعددة لتناسب جميع الوصفات، مما يجعلها الخيار الأمثل لتحضير الخبز، الكيك، والمعجنات بنتائج احترافية في المنزل.',
    mainImage: 'assets/Product6/Main Photo.jpeg',
    galleryImages: [], // Product 6 has no additional photos
    videoPath: 'assets/Product6/product6 Video.mp4',
  ),
];

void main() {
  runApp(const MyApp());
  // Pre-copy all videos in background when app starts
  _precopyAllVideos();
}

Future<void> _precopyAllVideos() async {
  try {
    final directory = await getApplicationDocumentsDirectory();
    
    for (final product in kitchenProducts) {
      final videoFileName = product.videoPath.split('/').last;
      final localFile = File('${directory.path}/${product.id}_$videoFileName'); // Add product ID to avoid conflicts
      
      if (!await localFile.exists()) {
        print('Pre-copying video: ${product.videoPath} -> ${localFile.path}');
        final ByteData data = await rootBundle.load(product.videoPath);
        final Uint8List bytes = data.buffer.asUint8List();
        await localFile.writeAsBytes(bytes);
        print('Pre-copied: ${product.id}_$videoFileName');
      }
    }
    print('All videos pre-copied successfully!');
  } catch (e) {
    print('Error pre-copying videos: $e');
  }
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Al-Baik',
      theme: ThemeData(
        primarySwatch: Colors.red,
        primaryColor: const Color(0xFFD32F2F), // Shopee-style red (slightly darker)
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFFD32F2F),
          primary: const Color(0xFFD32F2F),
          secondary: const Color(0xFFFFFFFF),
        ),
      ),
      home: const SplashScreen(),
      debugShowCheckedModeBanner: false,
    );
  }
}

// Splash Screen with Al-Baik logo and animation
class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen>
    with SingleTickerProviderStateMixin {
  late AnimationController _animationController;
  late Animation<double> _fadeAnimation;
  late Animation<double> _scaleAnimation;

  @override
  void initState() {
    super.initState();
    _animationController = AnimationController(
      duration: const Duration(seconds: 2),
      vsync: this,
    );

    _fadeAnimation = Tween<double>(
      begin: 0.0,
      end: 1.0,
    ).animate(CurvedAnimation(
      parent: _animationController,
      curve: Curves.easeInOut,
    ));

    _scaleAnimation = Tween<double>(
      begin: 0.5,
      end: 1.0,
    ).animate(CurvedAnimation(
      parent: _animationController,
      curve: Curves.elasticOut,
    ));

    _animationController.forward();

    // Navigate to main screen after 3 seconds
    Future.delayed(const Duration(seconds: 3), () {
      if (mounted) {
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(builder: (context) => const MainScreen()),
        );
      }
    });
  }

  @override
  void dispose() {
    _animationController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: Center(
        child: AnimatedBuilder(
          animation: _animationController,
          builder: (context, child) {
            return FadeTransition(
              opacity: _fadeAnimation,
              child: ScaleTransition(
                scale: _scaleAnimation,
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    // Al-Baik Logo - Using the actual logo file
                    Container(
                      width: 150,
                      height: 150,
                      child: Image.asset(
                        'assets/logo.png',
                        fit: BoxFit.contain,
                        errorBuilder: (context, error, stackTrace) {
                          // Fallback to text logo if image fails
                          return Container(
                            width: 120,
                            height: 120,
                            decoration: BoxDecoration(
                              color: const Color(0xFFD32F2F),
                              borderRadius: BorderRadius.circular(20),
                            ),
                            child: const Center(
                              child: Text(
                                'AB',
                                style: TextStyle(
                                  fontSize: 48,
                                  fontWeight: FontWeight.bold,
                                  color: Colors.white,
                                ),
                              ),
                            ),
                          );
                        },
                      ),
                    ),
                    const SizedBox(height: 24),
                    // Company Name Only - No Arabic text
                    const Text(
                      'Al-Baik',
                      style: TextStyle(
                        fontSize: 32,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFFD32F2F),
                        letterSpacing: 2,
                      ),
                    ),
                  ],
                ),
              ),
            );
          },
        ),
      ),
    );
  }
}

class MainScreen extends StatefulWidget {
  const MainScreen({super.key});

  @override
  State<MainScreen> createState() => _MainScreenState();
}

class _MainScreenState extends State<MainScreen> {
  int _selectedIndex = 0;
  bool _isLoggedIn = false;
  String _userType = 'guest';
  String _userName = '';
  final CartManager _cartManager = CartManager();

  @override
  void initState() {
    super.initState();
    // Listen to cart changes
    _cartManager.cartItemCount.addListener(() {
      if (mounted) setState(() {});
    });
  }

  @override
  void dispose() {
    _cartManager.cartItemCount.removeListener(() {});
    super.dispose();
  }

  void _login(String email, String password) async {
    try {
      final apiService = ApiService();
      final response = await apiService.login(email, password);
      
      if (response['user'] != null && response['token'] != null) {
        setState(() {
          _isLoggedIn = true;
          _userType = response['user']['role'] ?? 'customer';
          _userName = '${response['user']['firstName']} ${response['user']['lastName']}';
        });
        Navigator.pop(context); // Close login page
      }
    } catch (e) {
      // Show error message
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Login failed: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  void _logout() {
    setState(() {
      _isLoggedIn = false;
      _userType = 'guest';
      _userName = '';
    });
  }

  @override
  Widget build(BuildContext context) {
    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        body: IndexedStack(
          index: _selectedIndex,
          children: [
            HomeScreen(isLoggedIn: _isLoggedIn, userName: _userName),
            const ProductsScreen(),
            const CartScreen(),
            AccountScreen(
              isLoggedIn: _isLoggedIn,
              userType: _userType,
              userName: _userName,
              onLogin: _login,
              onLogout: _logout,
            ),
          ],
        ),
        bottomNavigationBar: BottomNavigationBar(
          type: BottomNavigationBarType.fixed,
          currentIndex: _selectedIndex,
          onTap: (index) => setState(() => _selectedIndex = index),
          selectedItemColor: const Color(0xFFD32F2F), // Shopee red
          unselectedItemColor: Colors.grey,
          backgroundColor: Colors.white,
          items: [
            const BottomNavigationBarItem(icon: Icon(Icons.home), label: 'الرئيسية'),
            const BottomNavigationBarItem(icon: Icon(Icons.store), label: 'المنتجات'),
            BottomNavigationBarItem(
              icon: Stack(
                children: [
                  const Icon(Icons.shopping_cart),
                  if (_cartManager.cartItemCount.value > 0)
                    Positioned(
                      right: 0,
                      top: 0,
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
                          '${_cartManager.cartItemCount.value}',
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 10,
                          ),
                          textAlign: TextAlign.center,
                        ),
                      ),
                    ),
                ],
              ),
              label: 'السلة',
            ),
            const BottomNavigationBarItem(icon: Icon(Icons.person), label: 'الحساب'),
          ],
        ),
      ),
    );
  }
}
class HomeScreen extends StatelessWidget {
  final bool isLoggedIn;
  final String userName;

  const HomeScreen({super.key, required this.isLoggedIn, required this.userName});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Al-Baik'),
        backgroundColor: const Color(0xFFD32F2F), // Shopee red
        foregroundColor: Colors.white,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Search Bar
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              decoration: BoxDecoration(
                color: Colors.grey[200],
                borderRadius: BorderRadius.circular(25),
              ),
              child: const TextField(
                textAlign: TextAlign.right,
                decoration: InputDecoration(
                  hintText: 'ابحث عن المنتجات...',
                  border: InputBorder.none,
                  icon: Icon(Icons.search),
                ),
              ),
            ),
            
            const SizedBox(height: 20),
            
            // Categories
            const Text(
              'الأقسام',
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 10),
            
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                _buildCategory(context, 'كهربائيات', Icons.electrical_services, const Color(0xFFD32F2F)),
                _buildCategory(context, 'إكسسوارات الهواتف', Icons.phone_android, Colors.grey),
                _buildCategory(context, 'إكسسوارات اللابتوب', Icons.laptop, Colors.grey),
                _buildCategory(context, 'أدوات منزلية', Icons.home, Colors.grey),
              ],
            ),
            
            const SizedBox(height: 10),
            
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                _buildCategory(context, 'العاب', Icons.sports_esports, Colors.grey),
                _buildCategory(context, 'الكابلات والشواحن', Icons.cable, Colors.grey),
                _buildCategory(context, 'الأكفار والحافظات', Icons.phone_iphone, Colors.grey),
                Container(width: 60), // Empty space for alignment
              ],
            ),
            
            const SizedBox(height: 30),
            
            // Products with real images
            const Text(
              'المنتجات المميزة - كهربائيات',
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 10),
            
            GridView.count(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              crossAxisCount: 2,
              childAspectRatio: 0.8,
              crossAxisSpacing: 10,
              mainAxisSpacing: 10,
              children: kitchenProducts.take(4).map((product) => 
                _buildProduct(context, product.name, product.price, product.mainImage, product)
              ).toList(),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCategory(BuildContext context, String name, IconData icon, Color color) {
    return GestureDetector(
      onTap: () {
        // Navigate to category page or show empty state for non-active categories
        if (name == 'كهربائيات') {
          // This category has products - could navigate to filtered products
        } else {
          // Show empty state message
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('قسم $name قريباً - لا توجد منتجات حالياً'),
              backgroundColor: Colors.grey[600],
            ),
          );
        }
      },
      child: Column(
        children: [
          Container(
            width: 60,
            height: 60,
            decoration: BoxDecoration(
              color: color.withOpacity(0.2),
              borderRadius: BorderRadius.circular(30),
            ),
            child: Icon(icon, color: color, size: 30),
          ),
          const SizedBox(height: 5),
          Text(
            name,
            style: const TextStyle(fontSize: 10),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }

  Widget _buildProduct(BuildContext context, String name, String price, String imagePath, Product product) {
    return GestureDetector(
      onTap: () {
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (context) => ProductDetailPage(product: product),
          ),
        );
      },
      child: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(10),
          boxShadow: [
            BoxShadow(
              color: Colors.grey.withOpacity(0.3),
              blurRadius: 5,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Column(
          children: [
            Expanded(
              child: Container(
                decoration: BoxDecoration(
                  color: Colors.grey[100],
                  borderRadius: const BorderRadius.vertical(top: Radius.circular(10)),
                ),
                child: ClipRRect(
                  borderRadius: const BorderRadius.vertical(top: Radius.circular(10)),
                  child: Image.asset(
                    imagePath,
                    width: double.infinity,
                    fit: BoxFit.cover,
                    errorBuilder: (context, error, stackTrace) {
                      return const Center(
                        child: Icon(Icons.inventory_2, size: 50, color: Colors.grey),
                      );
                    },
                  ),
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(8),
              child: Column(
                children: [
                  Text(
                    name,
                    style: const TextStyle(fontWeight: FontWeight.bold),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 5),
                  Text(
                    price,
                    style: const TextStyle(color: Color(0xFFD32F2F), fontWeight: FontWeight.bold), // Shopee red
                  ),
                  const SizedBox(height: 5),
                  ElevatedButton(
                    onPressed: () {
                      final CartManager cartManager = CartManager();
                      cartManager.addToCart(product);
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: Text('تمت إضافة ${product.name} للسلة'),
                          backgroundColor: Colors.green,
                          duration: const Duration(seconds: 2),
                        ),
                      );
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFFD32F2F), // Shopee red
                      foregroundColor: Colors.white,
                      minimumSize: const Size(double.infinity, 30),
                    ),
                    child: const Text('إضافة للسلة'),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// Product Detail Page (Shopee-style)
class ProductDetailPage extends StatefulWidget {
  final Product product;

  const ProductDetailPage({
    super.key,
    required this.product,
  });

  @override
  State<ProductDetailPage> createState() => _ProductDetailPageState();
}

class _ProductDetailPageState extends State<ProductDetailPage> {
  int _currentImageIndex = 0;
  VideoPlayerController? _videoController;
  late PageController _pageController;
  bool _isVideoReady = false;
  bool _showControls = false;
  String? _localVideoPath;
  
  // Get media items with video first, then images
  List<Map<String, dynamic>> get _mediaItems {
    List<Map<String, dynamic>> items = [];
    
    // Add video first
    items.add({
      'type': 'video',
      'path': widget.product.videoPath,
      'thumbnail': widget.product.mainImage,
    });
    
    // Add main image
    items.add({
      'type': 'image',
      'path': widget.product.mainImage,
    });
    
    // Add gallery images
    for (String imagePath in widget.product.galleryImages) {
      items.add({
        'type': 'image',
        'path': imagePath,
      });
    }
    
    return items;
  }

  @override
  void initState() {
    super.initState();
    _pageController = PageController();
    _copyVideoToDeviceAndPlay();
  }

  Future<void> _copyVideoToDeviceAndPlay() async {
    try {
      print('Loading video: ${widget.product.videoPath}');
      
      // Get the app's documents directory
      final directory = await getApplicationDocumentsDirectory();
      final videoFileName = widget.product.videoPath.split('/').last;
      final localFile = File('${directory.path}/${widget.product.id}_$videoFileName'); // Add product ID to avoid conflicts
      
      // Check if file already exists (should be pre-copied)
      if (!await localFile.exists()) {
        print('Video not pre-copied, copying now: ${widget.product.videoPath}');
        
        // Load the asset as bytes
        final ByteData data = await rootBundle.load(widget.product.videoPath);
        final Uint8List bytes = data.buffer.asUint8List();
        
        // Write to local file
        await localFile.writeAsBytes(bytes);
        print('Video copied successfully!');
      }
      
      _localVideoPath = localFile.path;
      
      // Now initialize video player with local file
      print('Initializing video player with local file: $_localVideoPath');
      _videoController = VideoPlayerController.file(localFile);
      
      await _videoController!.initialize();
      
      if (mounted) {
        setState(() {
          _isVideoReady = true;
        });
        
        // Auto-play the video
        await _videoController!.play();
        print('Video playing from local storage!');
      }
      
    } catch (e) {
      print('Error loading video: $e');
      if (mounted) {
        setState(() {
          _isVideoReady = false;
        });
      }
    }
  }

  @override
  void dispose() {
    _videoController?.dispose();
    _pageController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        backgroundColor: Colors.white,
        appBar: AppBar(
          backgroundColor: const Color(0xFFD32F2F),
          foregroundColor: Colors.white,
          title: Text(widget.product.name),
          actions: [
            IconButton(
              icon: const Icon(Icons.share),
              onPressed: () {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text('تم مشاركة ${widget.product.name}'),
                    backgroundColor: Colors.green,
                  ),
                );
              },
            ),
            IconButton(
              icon: const Icon(Icons.favorite_border),
              onPressed: () {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text('تمت إضافة ${widget.product.name} للمفضلة'),
                    backgroundColor: Colors.red,
                  ),
                );
              },
            ),
          ],
        ),
        body: Column(
          children: [
            Expanded(
              child: SingleChildScrollView(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Image/Video Gallery (Shopee-style)
                    _buildMediaGallery(),
                    
                    // Product Info
                    Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // Price
                          Text(
                            widget.product.price,
                            style: const TextStyle(
                              fontSize: 24,
                              fontWeight: FontWeight.bold,
                              color: Color(0xFFD32F2F),
                            ),
                          ),
                          
                          const SizedBox(height: 8),
                          
                          // Product Name
                          Text(
                            widget.product.name,
                            style: const TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                          
                          const SizedBox(height: 16),
                          
                          // Rating and Reviews
                          Row(
                            children: [
                              Row(
                                children: List.generate(5, (index) => Icon(
                                  index < 4 ? Icons.star : Icons.star_border,
                                  color: Colors.amber,
                                  size: 16,
                                )),
                              ),
                              const SizedBox(width: 8),
                              const Text('4.5'),
                              const SizedBox(width: 16),
                              const Text('(127 تقييم)', style: TextStyle(color: Colors.grey)),
                              const SizedBox(width: 16),
                              const Text('تم البيع 250+', style: TextStyle(color: Colors.grey)),
                            ],
                          ),
                          
                          const SizedBox(height: 20),
                          
                          // Product Description
                          const Text(
                            'وصف المنتج',
                            style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            widget.product.description,
                            style: const TextStyle(color: Colors.grey, height: 1.5),
                          ),
                          
                          const SizedBox(height: 20),
                          
                          // Specifications
                          const Text(
                            'المواصفات',
                            style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                          ),
                          const SizedBox(height: 8),
                          _buildSpecItem('المادة', 'بلاستيك عالي الجودة'),
                          _buildSpecItem('اللون', 'متعدد الألوان'),
                          _buildSpecItem('الضمان', 'سنة واحدة'),
                          _buildSpecItem('المنشأ', 'الصين'),
                          
                          const SizedBox(height: 20),
                          
                          // Reviews Section
                          _buildReviewsSection(),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
            
            // Bottom Action Bar (Shopee-style)
            _buildBottomActionBar(),
          ],
        ),
      ),
    );
  }

  Widget _buildMediaGallery() {
    return Container(
      height: 300,
      color: Colors.white,
      child: Column(
        children: [
          // Main Image/Video Display
          Expanded(
            child: PageView.builder(
              controller: _pageController,
              itemCount: _mediaItems.length,
              onPageChanged: (index) {
                setState(() {
                  _currentImageIndex = index;
                });
              },
              itemBuilder: (context, index) {
                final item = _mediaItems[index];
                return Container(
                  margin: const EdgeInsets.all(8),
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(8),
                    child: item['type'] == 'video' 
                        ? _buildVideoPlayer(item['path'])
                        : _buildFullSizeImage(item['path']),
                  ),
                );
              },
            ),
          ),
          
          // Thumbnail Navigation
          Container(
            height: 60,
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Row(
              children: [
                Expanded(
                  child: ListView.builder(
                    scrollDirection: Axis.horizontal,
                    itemCount: _mediaItems.length,
                    itemBuilder: (context, index) {
                      final item = _mediaItems[index];
                      final isSelected = index == _currentImageIndex;
                      return GestureDetector(
                        onTap: () {
                          setState(() {
                            _currentImageIndex = index;
                          });
                          _pageController.animateToPage(
                            index,
                            duration: const Duration(milliseconds: 300),
                            curve: Curves.easeInOut,
                          );
                        },
                        child: Container(
                          width: 50,
                          height: 50,
                          margin: const EdgeInsets.only(left: 8),
                          decoration: BoxDecoration(
                            border: Border.all(
                              color: isSelected ? const Color(0xFFD32F2F) : Colors.grey[300]!,
                              width: 2,
                            ),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Stack(
                            children: [
                              ClipRRect(
                                borderRadius: BorderRadius.circular(6),
                                child: Image.asset(
                                  item['type'] == 'video' ? item['thumbnail'] : item['path'],
                                  width: double.infinity,
                                  height: double.infinity,
                                  fit: BoxFit.cover,
                                  errorBuilder: (context, error, stackTrace) {
                                    return Container(
                                      color: Colors.grey[200],
                                      child: const Icon(Icons.inventory_2, size: 20, color: Colors.grey),
                                    );
                                  },
                                ),
                              ),
                              if (item['type'] == 'video')
                                const Center(
                                  child: Icon(
                                    Icons.play_circle_filled,
                                    size: 20,
                                    color: Colors.white,
                                  ),
                                ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
                ),
                const SizedBox(width: 8),
                Text(
                  '${_currentImageIndex + 1}/${_mediaItems.length}',
                  style: TextStyle(color: Colors.grey[600], fontSize: 12),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSpecItem(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          SizedBox(
            width: 80,
            child: Text(
              label,
              style: TextStyle(color: Colors.grey[600]),
            ),
          ),
          Text(value),
        ],
      ),
    );
  }

  Widget _buildReviewsSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text(
              'التقييمات',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
            ),
            TextButton(
              onPressed: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (context) => DemoPage(
                      title: 'جميع التقييمات',
                      page: 'reviews',
                      userType: 'customer',
                    ),
                  ),
                );
              },
              child: const Text('عرض الكل', style: TextStyle(color: Color(0xFFD32F2F))),
            ),
          ],
        ),
        const SizedBox(height: 8),
        _buildReviewItem('أحمد محمد', 5, 'منتج ممتاز وجودة عالية، أنصح بالشراء'),
        _buildReviewItem('فاطمة علي', 4, 'جيد جداً ووصل بسرعة'),
      ],
    );
  }

  Widget _buildReviewItem(String name, int rating, String comment) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.grey[50],
        borderRadius: BorderRadius.circular(8),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text(name, style: const TextStyle(fontWeight: FontWeight.w500)),
              const SizedBox(width: 8),
              Row(
                children: List.generate(5, (index) => Icon(
                  index < rating ? Icons.star : Icons.star_border,
                  color: Colors.amber,
                  size: 14,
                )),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Text(comment, style: TextStyle(color: Colors.grey[600])),
        ],
      ),
    );
  }

  Widget _buildBottomActionBar() {
    final CartManager cartManager = CartManager();
    
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        boxShadow: [
          BoxShadow(
            color: Colors.grey.withOpacity(0.3),
            blurRadius: 5,
            offset: const Offset(0, -2),
          ),
        ],
      ),
      child: Row(
        children: [
          // Chat and Favorite buttons
          IconButton(
            onPressed: () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('ميزة الدردشة قريباً')),
              );
            },
            icon: const Icon(Icons.chat_bubble_outline),
            style: IconButton.styleFrom(
              backgroundColor: Colors.grey[100],
            ),
          ),
          const SizedBox(width: 8),
          IconButton(
            onPressed: () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('تمت الإضافة للمفضلة')),
              );
            },
            icon: const Icon(Icons.favorite_border),
            style: IconButton.styleFrom(
              backgroundColor: Colors.grey[100],
            ),
          ),
          const SizedBox(width: 16),
          
          // Add to Cart button
          Expanded(
            child: ElevatedButton(
              onPressed: () {
                cartManager.addToCart(widget.product);
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text('تمت إضافة ${widget.product.name} للسلة'),
                    backgroundColor: Colors.green,
                    duration: const Duration(seconds: 2),
                  ),
                );
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.white,
                foregroundColor: const Color(0xFFD32F2F),
                side: const BorderSide(color: Color(0xFFD32F2F)),
                padding: const EdgeInsets.symmetric(vertical: 12),
              ),
              child: const Text('إضافة للسلة'),
            ),
          ),
          const SizedBox(width: 8),
          
          // Buy Now button
          Expanded(
            child: ElevatedButton(
              onPressed: () {
                cartManager.addToCart(widget.product);
                // Navigate to cart
                Navigator.of(context).pop(); // Go back to main screen
                // You could also navigate directly to cart tab here
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('تمت الإضافة للسلة - اذهب لسلة التسوق لإتمام الطلب'),
                    backgroundColor: Colors.orange,
                    duration: Duration(seconds: 3),
                  ),
                );
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFFD32F2F),
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 12),
              ),
              child: const Text('اشتري الآن'),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildVideoPlayer(String videoPath) {
    if (!_isVideoReady || _videoController == null) {
      // Show loading state
      return Container(
        width: double.infinity,
        height: double.infinity,
        color: Colors.black,
        child: Stack(
          alignment: Alignment.center,
          children: [
            _buildFullSizeImage(widget.product.mainImage),
            Container(
              decoration: BoxDecoration(
                color: Colors.black.withOpacity(0.5),
                shape: BoxShape.circle,
              ),
              padding: const EdgeInsets.all(16),
              child: const CircularProgressIndicator(
                color: Colors.white,
              ),
            ),
            const Positioned(
              bottom: 20,
              child: Text(
                'جاري تحميل الفيديو...',
                style: TextStyle(color: Colors.white, fontSize: 14),
              ),
            ),
          ],
        ),
      );
    }

    // Show video player with professional controls
    return Container(
      width: double.infinity,
      height: double.infinity,
      color: Colors.black,
      child: Stack(
        children: [
          // Video player - properly sized
          Center(
            child: AspectRatio(
              aspectRatio: _videoController!.value.aspectRatio,
              child: VideoPlayer(_videoController!),
            ),
          ),
          
          // Tap to show/hide controls
          Positioned.fill(
            child: GestureDetector(
              onTap: () {
                setState(() {
                  _showControls = !_showControls;
                });
                
                // Auto-hide controls after 3 seconds
                if (_showControls) {
                  Future.delayed(const Duration(seconds: 3), () {
                    if (mounted) {
                      setState(() {
                        _showControls = false;
                      });
                    }
                  });
                }
              },
              child: Container(color: Colors.transparent),
            ),
          ),
          
          // Play/Pause button (center, only when paused and controls NOT shown)
          if (!_videoController!.value.isPlaying && !_showControls)
            Center(
              child: GestureDetector(
                onTap: () {
                  setState(() {
                    _videoController!.play();
                  });
                },
                child: Container(
                  decoration: BoxDecoration(
                    color: Colors.black.withOpacity(0.6),
                    shape: BoxShape.circle,
                  ),
                  padding: const EdgeInsets.all(20),
                  child: const Icon(
                    Icons.play_arrow,
                    size: 50,
                    color: Colors.white,
                  ),
                ),
              ),
            ),
          
          // Professional video controls (only when _showControls is true)
          if (_showControls)
            Positioned(
              bottom: 0,
              left: 0,
              right: 0,
              child: Container(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.bottomCenter,
                    end: Alignment.topCenter,
                    colors: [
                      Colors.black.withOpacity(0.8),
                      Colors.transparent,
                    ],
                  ),
                ),
                padding: const EdgeInsets.all(16),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    // Progress bar
                    VideoProgressIndicator(
                      _videoController!,
                      allowScrubbing: true,
                      colors: const VideoProgressColors(
                        playedColor: Color(0xFFD32F2F),
                        backgroundColor: Colors.white30,
                        bufferedColor: Colors.white60,
                      ),
                    ),
                    const SizedBox(height: 12),
                    
                    // Control buttons row
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                      children: [
                        // Rewind 10 seconds
                        IconButton(
                          onPressed: () {
                            final currentPosition = _videoController!.value.position;
                            final newPosition = currentPosition - const Duration(seconds: 10);
                            _videoController!.seekTo(newPosition > Duration.zero ? newPosition : Duration.zero);
                          },
                          icon: const Icon(Icons.replay_10, color: Colors.white, size: 28),
                        ),
                        
                        // Play/Pause
                        IconButton(
                          onPressed: () {
                            setState(() {
                              if (_videoController!.value.isPlaying) {
                                _videoController!.pause();
                              } else {
                                _videoController!.play();
                              }
                            });
                          },
                          icon: Icon(
                            _videoController!.value.isPlaying ? Icons.pause : Icons.play_arrow,
                            color: Colors.white,
                            size: 32,
                          ),
                        ),
                        
                        // Fast forward 10 seconds
                        IconButton(
                          onPressed: () {
                            final currentPosition = _videoController!.value.position;
                            final duration = _videoController!.value.duration;
                            final newPosition = currentPosition + const Duration(seconds: 10);
                            _videoController!.seekTo(newPosition < duration ? newPosition : duration);
                          },
                          icon: const Icon(Icons.forward_10, color: Colors.white, size: 28),
                        ),
                        
                        // Mute/Unmute
                        IconButton(
                          onPressed: () {
                            setState(() {
                              _videoController!.setVolume(_videoController!.value.volume > 0 ? 0.0 : 1.0);
                            });
                          },
                          icon: Icon(
                            _videoController!.value.volume > 0 ? Icons.volume_up : Icons.volume_off,
                            color: Colors.white,
                            size: 28,
                          ),
                        ),
                        
                        // Restart video
                        IconButton(
                          onPressed: () {
                            _videoController!.seekTo(Duration.zero);
                            _videoController!.play();
                          },
                          icon: const Icon(Icons.restart_alt, color: Colors.white, size: 28),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildFullSizeImage(String imagePath) {
    return Container(
      width: double.infinity,
      height: double.infinity,
      child: Image.asset(
        imagePath,
        fit: BoxFit.contain, // Show full image without cropping
        errorBuilder: (context, error, stackTrace) {
          return Container(
            color: Colors.grey[200],
            child: const Center(
              child: Icon(Icons.inventory_2, size: 80, color: Colors.grey),
            ),
          );
        },
      ),
    );
  }
}

class ProductsScreen extends StatelessWidget {
  const ProductsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('جميع المنتجات'),
        backgroundColor: const Color(0xFFD32F2F), // Shopee red
        foregroundColor: Colors.white,
      ),
      body: GridView.count(
        padding: const EdgeInsets.all(16),
        crossAxisCount: 2,
        childAspectRatio: 0.8,
        crossAxisSpacing: 10,
        mainAxisSpacing: 10,
        children: kitchenProducts.map((product) => 
          _buildProduct(context, product.name, product.price, product.mainImage, product)
        ).toList(),
      ),
    );
  }

  Widget _buildProduct(BuildContext context, String name, String price, String imagePath, Product product) {
    return GestureDetector(
      onTap: () {
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (context) => ProductDetailPage(product: product),
          ),
        );
      },
      child: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(10),
          boxShadow: [
            BoxShadow(
              color: Colors.grey.withOpacity(0.3),
              blurRadius: 5,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Column(
          children: [
            Expanded(
              child: Container(
                decoration: BoxDecoration(
                  color: Colors.grey[100],
                  borderRadius: const BorderRadius.vertical(top: Radius.circular(10)),
                ),
                child: ClipRRect(
                  borderRadius: const BorderRadius.vertical(top: Radius.circular(10)),
                  child: Image.asset(
                    imagePath,
                    width: double.infinity,
                    fit: BoxFit.cover,
                    errorBuilder: (context, error, stackTrace) {
                      return const Center(
                        child: Icon(Icons.inventory_2, size: 50, color: Colors.grey),
                      );
                    },
                  ),
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(8),
              child: Column(
                children: [
                  Text(
                    name,
                    style: const TextStyle(fontWeight: FontWeight.bold),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 5),
                  Text(
                    price,
                    style: const TextStyle(color: Color(0xFFD32F2F), fontWeight: FontWeight.bold), // Shopee red
                  ),
                  const SizedBox(height: 5),
                  ElevatedButton(
                    onPressed: () {
                      final CartManager cartManager = CartManager();
                      cartManager.addToCart(product);
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: Text('تمت إضافة ${product.name} للسلة'),
                          backgroundColor: Colors.green,
                          duration: const Duration(seconds: 2),
                        ),
                      );
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFFD32F2F), // Shopee red
                      foregroundColor: Colors.white,
                      minimumSize: const Size(double.infinity, 30),
                    ),
                    child: const Text('إضافة'),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
class CartScreen extends StatefulWidget {
  const CartScreen({super.key});

  @override
  State<CartScreen> createState() => _CartScreenState();
}

class _CartScreenState extends State<CartScreen> {
  final CartManager _cartManager = CartManager();

  @override
  void initState() {
    super.initState();
    // Listen to cart changes to rebuild UI
    _cartManager.cartItemCount.addListener(_onCartChanged);
  }

  @override
  void dispose() {
    _cartManager.cartItemCount.removeListener(_onCartChanged);
    super.dispose();
  }

  void _onCartChanged() {
    if (mounted) {
      setState(() {
        // Force rebuild when cart changes
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    // Debug: Print cart status
    print('Cart items count: ${_cartManager.items.length}');
    for (var item in _cartManager.items) {
      print('Cart item: ${item.product.name} - Qty: ${item.quantity}');
    }
    
    return Scaffold(
      appBar: AppBar(
        title: Text('سلة التسوق (${_cartManager.items.length})'), // Show count in title
        backgroundColor: const Color(0xFFD32F2F), // Shopee red
        foregroundColor: Colors.white,
      ),
      body: _cartManager.items.isEmpty
          ? _buildEmptyCart()
          : Column(
              children: [
                Expanded(
                  child: ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: _cartManager.items.length,
                    itemBuilder: (context, index) {
                      final cartItem = _cartManager.items[index];
                      return _buildCartItem(cartItem);
                    },
                  ),
                ),
                _buildCartSummary(),
              ],
            ),
    );
  }

  Widget _buildEmptyCart() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.shopping_cart_outlined,
            size: 80,
            color: Colors.grey[400],
          ),
          const SizedBox(height: 16),
          Text(
            'سلة التسوق فارغة',
            style: TextStyle(
              fontSize: 18,
              color: Colors.grey[600],
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'أضف بعض المنتجات لتبدأ التسوق',
            style: TextStyle(
              fontSize: 14,
              color: Colors.grey[500],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCartItem(CartItem cartItem) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(10),
        boxShadow: [
          BoxShadow(
            color: Colors.grey.withOpacity(0.3),
            blurRadius: 5,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        children: [
          Container(
            width: 50,
            height: 50,
            decoration: BoxDecoration(
              color: Colors.grey[100],
              borderRadius: BorderRadius.circular(8),
            ),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(8),
              child: Image.asset(
                cartItem.product.mainImage,
                fit: BoxFit.cover,
                errorBuilder: (context, error, stackTrace) {
                  return const Icon(Icons.inventory_2, color: Colors.grey);
                },
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  cartItem.product.name,
                  style: const TextStyle(fontWeight: FontWeight.bold),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
                Text(
                  cartItem.product.price,
                  style: const TextStyle(color: Color(0xFFD32F2F)),
                ),
              ],
            ),
          ),
          Row(
            children: [
              IconButton(
                onPressed: () {
                  setState(() {
                    if (cartItem.quantity > 1) {
                      _cartManager.updateQuantity(cartItem.product.id, cartItem.quantity - 1);
                    } else {
                      _cartManager.removeFromCart(cartItem.product.id);
                    }
                  });
                },
                icon: const Icon(Icons.remove_circle_outline),
              ),
              Text('${cartItem.quantity}'),
              IconButton(
                onPressed: () {
                  setState(() {
                    _cartManager.updateQuantity(cartItem.product.id, cartItem.quantity + 1);
                  });
                },
                icon: const Icon(Icons.add_circle_outline),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildCartSummary() {
    return Container(
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
              const Text('الإجمالي:', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
              Text(
                '${_cartManager.totalPrice.toStringAsFixed(2)} د.أ',
                style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Color(0xFFD32F2F)),
              ),
            ],
          ),
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: () {
                // Demo checkout
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('تم إتمام الطلب بنجاح! (تجريبي)'),
                    backgroundColor: Colors.green,
                  ),
                );
                _cartManager.clearCart();
                setState(() {});
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.green,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 15),
              ),
              child: const Text('إتمام الطلب', style: TextStyle(fontSize: 16)),
            ),
          ),
        ],
      ),
    );
  }
}
class AccountScreen extends StatelessWidget {
  final bool isLoggedIn;
  final String userType;
  final String userName;
  final Function(String, String) onLogin;
  final VoidCallback onLogout;

  const AccountScreen({
    super.key,
    required this.isLoggedIn,
    required this.userType,
    required this.userName,
    required this.onLogin,
    required this.onLogout,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('الحساب'),
        backgroundColor: const Color(0xFFD32F2F), // Shopee red
        foregroundColor: Colors.white,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            if (isLoggedIn) ...[
              // Profile Section
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: Colors.orange.shade50,
                  borderRadius: BorderRadius.circular(15),
                ),
                child: Column(
                  children: [
                    CircleAvatar(
                      radius: 40,
                      backgroundColor: const Color(0xFFD32F2F), // Shopee red
                      child: Text(
                        userName.isNotEmpty ? userName[0] : 'U',
                        style: const TextStyle(fontSize: 30, color: Colors.white),
                      ),
                    ),
                    const SizedBox(height: 10),
                    Text(
                      userName,
                      style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                    ),
                    Text(
                      _getUserTypeText(),
                      style: TextStyle(color: Colors.grey[600]),
                    ),
                  ],
                ),
              ),
              
              const SizedBox(height: 20),
              
              // Account Options
              _buildAccountOptions(),
              
              const SizedBox(height: 20),
              
              // Logout Button
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: onLogout,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.red,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 15),
                  ),
                  child: const Text('تسجيل الخروج'),
                ),
              ),
            ] else ...[
              // Login Section
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: Colors.orange.shade50,
                  borderRadius: BorderRadius.circular(15),
                ),
                child: Column(
                  children: [
                    const Icon(
                      Icons.person_outline,
                      size: 80,
                      color: Colors.orange,
                    ),
                    const SizedBox(height: 10),
                    const Text(
                      'مرحباً بك',
                      style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 20),
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        onPressed: () {
                          Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (context) => LoginPage(onLogin: onLogin),
                            ),
                          );
                        },
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFFD32F2F), // Shopee red
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 15),
                        ),
                        child: const Text('تسجيل الدخول'),
                      ),
                    ),
                  ],
                ),
              ),
              
              const SizedBox(height: 20),
              
              // Guest Options
              _buildGuestOptions(),
            ],
          ],
        ),
      ),
    );
  }

  String _getUserTypeText() {
    switch (userType) {
      case 'customer': return 'عميل';
      case 'admin': return 'مدير';
      case 'staff': return 'موظف';
      default: return 'زائر';
    }
  }

  Widget _buildAccountOptions() {
    List<Map<String, dynamic>> options = [];
    
    // Customer gets personal options
    if (userType == 'customer') {
      options.addAll([
        {'icon': Icons.shopping_bag, 'title': 'طلباتي', 'page': 'orders'},
        {'icon': Icons.favorite, 'title': 'المفضلة', 'page': 'favorites'},
        {'icon': Icons.location_on, 'title': 'العناوين', 'page': 'addresses'},
      ]);
    }
    
    // Admin and Staff get management options
    if (userType == 'admin' || userType == 'staff') {
      options.addAll([
        {'icon': Icons.dashboard, 'title': 'لوحة التحكم', 'page': 'dashboard'},
        {'icon': Icons.inventory, 'title': 'إدارة المخزون', 'page': 'inventory'},
      ]);
    }
    
    // Admin only options
    if (userType == 'admin') {
      options.addAll([
        {'icon': Icons.people, 'title': 'إدارة المستخدمين', 'page': 'users'},
        {'icon': Icons.analytics, 'title': 'التقارير', 'page': 'reports'},
      ]);
    }
    
    // Common options for all logged in users
    options.addAll([
      {'icon': Icons.settings, 'title': 'الإعدادات', 'page': 'settings'},
      {'icon': Icons.help, 'title': 'المساعدة', 'page': 'help'},
    ]);

    return Column(
      children: options
          .map((option) => _buildAccountOption(
                option['icon'],
                option['title'],
                option['page'],
              ))
          .toList(),
    );
  }

  Widget _buildGuestOptions() {
    List<Map<String, dynamic>> options = [
      {'icon': Icons.help, 'title': 'المساعدة', 'page': 'help'},
      {'icon': Icons.info, 'title': 'حول التطبيق', 'page': 'about'},
      {'icon': Icons.contact_support, 'title': 'اتصل بنا', 'page': 'contact'},
    ];

    return Column(
      children: options
          .map((option) => _buildGuestOption(
                option['icon'],
                option['title'],
                option['page'],
              ))
          .toList(),
    );
  }

  Widget _buildGuestOption(IconData icon, String title, String page) {
    return Container(
      margin: const EdgeInsets.only(bottom: 5),
      child: Builder(
        builder: (context) => ListTile(
          leading: Icon(icon, color: Colors.orange),
          title: Text(title),
          trailing: const Icon(Icons.arrow_forward_ios, size: 16),
          onTap: () {
            Navigator.push(
              context,
              MaterialPageRoute(
                builder: (context) => DemoPage(title: title, page: page, userType: 'guest'),
              ),
            );
          },
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
          tileColor: Colors.white,
        ),
      ),
    );
  }

  Widget _buildAccountOption(IconData icon, String title, String page) {
    return Container(
      margin: const EdgeInsets.only(bottom: 5),
      child: Builder(
        builder: (context) => ListTile(
          leading: Icon(icon, color: Colors.orange),
          title: Text(title),
          trailing: const Icon(Icons.arrow_forward_ios, size: 16),
          onTap: () {
            Navigator.push(
              context,
              MaterialPageRoute(
                builder: (context) => DemoPage(title: title, page: page, userType: userType),
              ),
            );
          },
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
          tileColor: Colors.white,
        ),
      ),
    );
  }
}
class LoginPage extends StatefulWidget {
  final Function(String, String) onLogin;

  const LoginPage({super.key, required this.onLogin});

  @override
  State<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends State<LoginPage> {
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();

  @override
  Widget build(BuildContext context) {
    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('تسجيل الدخول'),
          backgroundColor: const Color(0xFFD32F2F), // Shopee red
          foregroundColor: Colors.white,
        ),
        body: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              // Logo
              Container(
                width: 100,
                height: 100,
                decoration: BoxDecoration(
                  color: Colors.orange.shade100,
                  borderRadius: BorderRadius.circular(50),
                ),
                child: const Icon(
                  Icons.store,
                  size: 50,
                  color: Colors.orange,
                ),
              ),
              
              const SizedBox(height: 32),
              
              // Email Field
              TextField(
                controller: _emailController,
                textAlign: TextAlign.right,
                decoration: const InputDecoration(
                  labelText: 'البريد الإلكتروني',
                  prefixIcon: Icon(Icons.email),
                  border: OutlineInputBorder(),
                ),
                keyboardType: TextInputType.emailAddress,
              ),
              
              const SizedBox(height: 16),
              
              // Password Field
              TextField(
                controller: _passwordController,
                textAlign: TextAlign.right,
                decoration: const InputDecoration(
                  labelText: 'كلمة المرور',
                  prefixIcon: Icon(Icons.lock),
                  border: OutlineInputBorder(),
                ),
                obscureText: true,
              ),
              
              const SizedBox(height: 24),
              
              // Login Button
              SizedBox(
                width: double.infinity,
                height: 50,
                child: ElevatedButton(
                  onPressed: () {
                    widget.onLogin(_emailController.text, _passwordController.text);
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFFD32F2F), // Shopee red
                    foregroundColor: Colors.white,
                  ),
                  child: const Text('تسجيل الدخول', style: TextStyle(fontSize: 16)),
                ),
              ),
              
              const SizedBox(height: 16),
              
              // Google Login Button
              SizedBox(
                width: double.infinity,
                height: 50,
                child: OutlinedButton.icon(
                  onPressed: () {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('تسجيل الدخول بجوجل قريباً')),
                    );
                  },
                  icon: const Icon(Icons.login, color: Colors.red),
                  label: const Text('تسجيل الدخول بجوجل'),
                  style: OutlinedButton.styleFrom(
                    side: const BorderSide(color: Colors.red),
                  ),
                ),
              ),
              
              const SizedBox(height: 32),
              
              // Demo Accounts
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.grey.shade100,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Column(
                  children: [
                    Text(
                      'تسجيل الدخول',
                      style: TextStyle(fontWeight: FontWeight.bold),
                    ),
                    SizedBox(height: 8),
                    Text(
                      'استخدم بيانات حسابك للدخول إلى النظام',
                      style: TextStyle(fontSize: 12),
                      textAlign: TextAlign.center,
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
class DemoPage extends StatefulWidget {
  final String title;
  final String page;
  final String userType;

  const DemoPage({
    super.key,
    required this.title,
    required this.page,
    required this.userType,
  });

  @override
  State<DemoPage> createState() => _DemoPageState();
}

class _DemoPageState extends State<DemoPage> {
  String selectedOrderTab = 'الكل'; // Track selected order tab

  @override
  Widget build(BuildContext context) {
    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        appBar: AppBar(
          title: Text(widget.title),
          backgroundColor: const Color(0xFFD32F2F), // Shopee red
          foregroundColor: Colors.white,
        ),
        body: SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: _buildPageContent(),
        ),
      ),
    );
  }

  Widget _buildPageContent() {
    switch (widget.page) {
      case 'dashboard':
        return _buildDashboard();
      case 'inventory':
        return _buildInventory();
      case 'users':
        return _buildUsers();
      case 'reports':
        return _buildReports();
      case 'orders':
        return _buildOrders();
      case 'favorites':
        return _buildFavorites();
      case 'addresses':
        return _buildAddresses();
      case 'settings':
        return _buildSettings();
      case 'help':
        return _buildHelp();
      case 'about':
        return _buildAbout();
      case 'contact':
        return _buildContact();
      case 'demo_action':
        return _buildDemoAction();
      case 'reviews':
        return _buildReviews();
      default:
        return _buildDefault();
    }
  }

  Widget _buildDashboard() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'لوحة التحكم',
          style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 16),
        
        // Stats Cards - Improved design
        Row(
          children: [
            Expanded(child: _buildImprovedStatCard('المنتجات', '156', Icons.inventory, Colors.blue, '+12')),
            const SizedBox(width: 10),
            Expanded(child: _buildImprovedStatCard('الطلبات', '23', Icons.shopping_cart, Colors.green, '+5')),
          ],
        ),
        const SizedBox(height: 10),
        Row(
          children: [
            Expanded(child: _buildImprovedStatCard('العملاء', '89', Icons.people, Colors.orange, '+8')),
            const SizedBox(width: 10),
            Expanded(child: _buildImprovedStatCard('المبيعات', '2,450 ر.س', Icons.attach_money, Colors.purple, '+15%')),
          ],
        ),
        
        const SizedBox(height: 24),
        
        const Text(
          'الطلبات الأخيرة',
          style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 12),
        
        // Recent Orders with photos
        _buildDashboardOrderItem('طلب #1234', 'أحمد محمد', kitchenProducts[0].price, 'قيد التجهيز', kitchenProducts[0].mainImage),
        _buildDashboardOrderItem('طلب #1235', 'فاطمة علي', kitchenProducts[1].price, 'تم الشحن', kitchenProducts[1].mainImage),
        _buildDashboardOrderItem('طلب #1236', 'محمد سالم', kitchenProducts[2].price, 'جديد', kitchenProducts[2].mainImage),
        
        const SizedBox(height: 20),
        
        // Quick Actions
        const Text(
          'إجراءات سريعة',
          style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 12),
        
        Row(
          children: [
            Expanded(
              child: _buildQuickActionCard('إضافة منتج', Icons.add_box, Colors.blue),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: _buildQuickActionCard('عرض التقارير', Icons.analytics, Colors.green),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildInventory() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'إدارة المخزون',
          style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 16),
        
        // Low Stock Alert
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: Colors.red.shade50,
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: Colors.red.shade200),
          ),
          child: Row(
            children: [
              Icon(Icons.warning, color: Colors.red.shade600),
              const SizedBox(width: 8),
              const Text('تحذير: 2 منتجات قاربت على النفاد'),
            ],
          ),
        ),
        
        const SizedBox(height: 20),
        
        const Text(
          'المنتجات',
          style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 10),
        
        // Inventory Items as rows with photos
        _buildInventoryItemWithPhoto(kitchenProducts[0].name, '25', '5', Colors.red, kitchenProducts[0].mainImage),
        _buildInventoryItemWithPhoto(kitchenProducts[1].name, '45', '8', const Color(0xFFD32F2F), kitchenProducts[1].mainImage),
        _buildInventoryItemWithPhoto(kitchenProducts[2].name, '30', '25', Colors.green, kitchenProducts[2].mainImage),
        _buildInventoryItemWithPhoto(kitchenProducts[3].name, '20', '18', Colors.green, kitchenProducts[3].mainImage),
        _buildInventoryItemWithPhoto(kitchenProducts[4].name, '50', '35', Colors.green, kitchenProducts[4].mainImage),
        _buildInventoryItemWithPhoto(kitchenProducts[5].name, '15', '12', Colors.green, kitchenProducts[5].mainImage),
      ],
    );
  }

  Widget _buildUsers() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'إدارة المستخدمين',
          style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 16),
        
        // Add User Button
        SizedBox(
          width: double.infinity,
          child: ElevatedButton.icon(
            onPressed: () {
              showDialog(
                context: context,
                builder: (context) => Directionality(
                  textDirection: TextDirection.rtl,
                  child: AlertDialog(
                    title: const Text('إضافة مستخدم جديد'),
                    content: const Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        TextField(
                          decoration: InputDecoration(
                            labelText: 'الاسم',
                            border: OutlineInputBorder(),
                          ),
                        ),
                        SizedBox(height: 10),
                        TextField(
                          decoration: InputDecoration(
                            labelText: 'البريد الإلكتروني',
                            border: OutlineInputBorder(),
                          ),
                        ),
                      ],
                    ),
                    actions: [
                      TextButton(
                        onPressed: () => Navigator.pop(context),
                        child: const Text('إلغاء'),
                      ),
                      ElevatedButton(
                        onPressed: () {
                          Navigator.pop(context);
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                              content: Text('تم إضافة المستخدم بنجاح (تجريبي)'),
                              backgroundColor: Colors.green,
                            ),
                          );
                        },
                        child: const Text('إضافة'),
                      ),
                    ],
                  ),
                ),
              );
            },
            icon: const Icon(Icons.add),
            label: const Text('إضافة مستخدم جديد'),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.orange,
              foregroundColor: Colors.white,
            ),
          ),
        ),
        
        const SizedBox(height: 20),
        
        const Text(
          'المستخدمون',
          style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 10),
        
        // Users List - This would be populated from the real API
        Center(
          child: Column(
            children: [
              Icon(
                Icons.people_outline,
                size: 64,
                color: Colors.grey[400],
              ),
              const SizedBox(height: 16),
              Text(
                'User management will be available soon',
                style: TextStyle(
                  fontSize: 16,
                  color: Colors.grey[600],
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildReports() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'التقارير والإحصائيات',
          style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 16),
        
        // Report Cards
        _buildReportCard('تقرير المبيعات الشهري', '15,450 ر.س', Icons.trending_up, Colors.green),
        _buildReportCard('تقرير المنتجات الأكثر مبيعاً', '25 منتج', Icons.star, Colors.orange),
        _buildReportCard('تقرير العملاء الجدد', '12 عميل', Icons.person_add, Colors.blue),
        _buildReportCard('تقرير المخزون', '156 منتج', Icons.inventory, Colors.purple),
      ],
    );
  }

  Widget _buildOrders() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'طلباتي',
          style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 16),
        
        // Order Status Tabs
        Container(
          height: 40,
          child: ListView(
            scrollDirection: Axis.horizontal,
            children: [
              _buildOrderTab('الكل', selectedOrderTab == 'الكل'),
              _buildOrderTab('قيد الشحن', selectedOrderTab == 'قيد الشحن'),
              _buildOrderTab('تم التسليم', selectedOrderTab == 'تم التسليم'),
              _buildOrderTab('ملغي', selectedOrderTab == 'ملغي'),
            ],
          ),
        ),
        
        const SizedBox(height: 16),
        
        // Orders with tracking - filtered by selected tab
        ..._getFilteredOrders().map((order) => _buildOrderWithTracking(
          order['orderNumber'],
          order['status'],
          order['price'],
          order['products'],
          order['trackingStep'],
        )).toList(),
      ],
    );
  }

  // Helper method to filter orders based on selected tab
  List<Map<String, dynamic>> _getFilteredOrders() {
    List<Map<String, dynamic>> allOrders = [
      {
        'orderNumber': 'طلب #1234',
        'status': 'قيد الشحن',
        'price': kitchenProducts[0].price,
        'products': [
          {'name': kitchenProducts[0].name, 'image': kitchenProducts[0].mainImage, 'qty': '1'},
          {'name': kitchenProducts[1].name, 'image': kitchenProducts[1].mainImage, 'qty': '1'},
        ],
        'trackingStep': 3,
      },
      {
        'orderNumber': 'طلب #1230',
        'status': 'تم التسليم',
        'price': kitchenProducts[2].price,
        'products': [
          {'name': kitchenProducts[2].name, 'image': kitchenProducts[2].mainImage, 'qty': '1'},
        ],
        'trackingStep': 4,
      },
      {
        'orderNumber': 'طلب #1225',
        'status': 'قيد التجهيز',
        'price': kitchenProducts[3].price,
        'products': [
          {'name': kitchenProducts[3].name, 'image': kitchenProducts[3].mainImage, 'qty': '1'},
        ],
        'trackingStep': 1,
      },
      {
        'orderNumber': 'طلب #1220',
        'status': 'ملغي',
        'price': kitchenProducts[4].price,
        'products': [
          {'name': kitchenProducts[4].name, 'image': kitchenProducts[4].mainImage, 'qty': '1'},
        ],
        'trackingStep': 0,
      },
    ];

    if (selectedOrderTab == 'الكل') {
      return allOrders;
    } else {
      return allOrders.where((order) => order['status'] == selectedOrderTab).toList();
    }
  }

  Widget _buildFavorites() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'المنتجات المفضلة',
          style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 16),
        
        // Favorites List with real photos
        _buildFavoriteItemWithPhoto(kitchenProducts[0].name, kitchenProducts[0].price, kitchenProducts[0].mainImage),
        _buildFavoriteItemWithPhoto(kitchenProducts[1].name, kitchenProducts[1].price, kitchenProducts[1].mainImage),
        _buildFavoriteItemWithPhoto(kitchenProducts[2].name, kitchenProducts[2].price, kitchenProducts[2].mainImage),
        _buildFavoriteItemWithPhoto(kitchenProducts[3].name, kitchenProducts[3].price, kitchenProducts[3].mainImage),
      ],
    );
  }

  Widget _buildAddresses() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'عناويني',
          style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 16),
        
        // Add Address Button
        SizedBox(
          width: double.infinity,
          child: ElevatedButton.icon(
            onPressed: () {
              showDialog(
                context: context,
                builder: (context) => Directionality(
                  textDirection: TextDirection.rtl,
                  child: AlertDialog(
                    title: const Text('إضافة عنوان جديد'),
                    content: const Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        TextField(
                          decoration: InputDecoration(
                            labelText: 'اسم العنوان',
                            border: OutlineInputBorder(),
                          ),
                        ),
                        SizedBox(height: 10),
                        TextField(
                          decoration: InputDecoration(
                            labelText: 'العنوان التفصيلي',
                            border: OutlineInputBorder(),
                          ),
                          maxLines: 3,
                        ),
                      ],
                    ),
                    actions: [
                      TextButton(
                        onPressed: () => Navigator.pop(context),
                        child: const Text('إلغاء'),
                      ),
                      ElevatedButton(
                        onPressed: () {
                          Navigator.pop(context);
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                              content: Text('تم إضافة العنوان بنجاح (تجريبي)'),
                              backgroundColor: Colors.green,
                            ),
                          );
                        },
                        child: const Text('إضافة'),
                      ),
                    ],
                  ),
                ),
              );
            },
            icon: const Icon(Icons.add),
            label: const Text('إضافة عنوان جديد'),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.orange,
              foregroundColor: Colors.white,
            ),
          ),
        ),
        
        const SizedBox(height: 20),
        
        // Addresses List
        _buildAddressItem('المنزل', 'الرياض، حي النخيل، شارع الملك فهد'),
        _buildAddressItem('العمل', 'الرياض، حي العليا، برج الفيصلية'),
      ],
    );
  }

  Widget _buildSettings() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'الإعدادات',
          style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 16),
        
        // Settings Options
        _buildSettingItem(Icons.language, 'اللغة', 'العربية'),
        _buildSettingItem(Icons.notifications, 'الإشعارات', 'مفعلة'),
        _buildSettingItem(Icons.security, 'الأمان والخصوصية', ''),
        _buildSettingItem(Icons.payment, 'طرق الدفع', ''),
        _buildSettingItem(Icons.dark_mode, 'المظهر', 'فاتح'),
      ],
    );
  }

  Widget _buildHelp() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'المساعدة والدعم',
          style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 16),
        
        // Help Topics
        _buildHelpItem('كيفية إنشاء طلب جديد'),
        _buildHelpItem('طرق الدفع المتاحة'),
        _buildHelpItem('سياسة الإرجاع والاستبدال'),
        _buildHelpItem('تتبع الطلبات'),
        _buildHelpItem('الأسئلة الشائعة'),
        
        const SizedBox(height: 20),
        
        // Contact Support
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.orange.shade50,
            borderRadius: BorderRadius.circular(8),
          ),
          child: Column(
            children: [
              const Text(
                'تحتاج مساعدة إضافية؟',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 8),
              const Text('تواصل مع فريق الدعم'),
              const SizedBox(height: 12),
              ElevatedButton(
                onPressed: () {
                  showDialog(
                    context: context,
                    builder: (context) => Directionality(
                      textDirection: TextDirection.rtl,
                      child: AlertDialog(
                        title: const Text('اتصل بالدعم'),
                        content: const Text('سيتم توصيلك بفريق الدعم الفني خلال دقائق قليلة.'),
                        actions: [
                          TextButton(
                            onPressed: () => Navigator.pop(context),
                            child: const Text('موافق'),
                          ),
                        ],
                      ),
                    ),
                  );
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.orange,
                  foregroundColor: Colors.white,
                ),
                child: const Text('اتصل بنا'),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildAbout() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'حول التطبيق',
          style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 16),
        
        // App Info
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.orange.shade50,
            borderRadius: BorderRadius.circular(8),
          ),
          child: Column(
            children: [
              Icon(Icons.store, size: 80, color: Colors.orange.shade600),
              const SizedBox(height: 16),
              const Text(
                'متجر الإكسسوارات',
                style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 8),
              const Text('الإصدار 1.0.0'),
              const SizedBox(height: 16),
              const Text(
                'تطبيق متخصص في بيع إكسسوارات الهواتف والحاسوب بأسعار الجملة',
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
        
        const SizedBox(height: 20),
        
        // App Features
        const Text(
          'مميزات التطبيق',
          style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 10),
        
        _buildFeatureItem('تصفح آلاف المنتجات'),
        _buildFeatureItem('أسعار الجملة المميزة'),
        _buildFeatureItem('توصيل سريع وآمن'),
        _buildFeatureItem('دعم فني متميز'),
      ],
    );
  }

  Widget _buildContact() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'اتصل بنا',
          style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 16),
        
        // Contact Methods
        _buildContactItem(Icons.phone, 'الهاتف', '+966 50 123 4567'),
        _buildContactItem(Icons.email, 'البريد الإلكتروني', 'info@store.com'),
        _buildContactItem(Icons.location_on, 'العنوان', 'الرياض، المملكة العربية السعودية'),
        _buildContactItem(Icons.access_time, 'ساعات العمل', 'الأحد - الخميس: 9 صباحاً - 6 مساءً'),
        
        const SizedBox(height: 20),
        
        // Quick Contact
        SizedBox(
          width: double.infinity,
          child: ElevatedButton.icon(
            onPressed: () {
              showDialog(
                context: context,
                builder: (context) => Directionality(
                  textDirection: TextDirection.rtl,
                  child: AlertDialog(
                    title: const Text('بدء محادثة'),
                    content: const Text('سيتم فتح نافذة الدردشة مع فريق الدعم.'),
                    actions: [
                      TextButton(
                        onPressed: () => Navigator.pop(context),
                        child: const Text('إلغاء'),
                      ),
                      ElevatedButton(
                        onPressed: () {
                          Navigator.pop(context);
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                              content: Text('تم فتح الدردشة (تجريبي)'),
                              backgroundColor: Colors.green,
                            ),
                          );
                        },
                        child: const Text('بدء'),
                      ),
                    ],
                  ),
                ),
              );
            },
            icon: const Icon(Icons.chat),
            label: const Text('بدء محادثة'),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.orange,
              foregroundColor: Colors.white,
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildDefault() {
    return const Center(
      child: Text(
        'صفحة تجريبية',
        style: TextStyle(fontSize: 18),
      ),
    );
  }

  Widget _buildDemoAction() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.orange.shade50,
            borderRadius: BorderRadius.circular(12),
          ),
          child: Column(
            children: [
              Icon(Icons.construction, size: 60, color: Colors.orange.shade600),
              const SizedBox(height: 16),
              const Text(
                'ميزة تجريبية',
                style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 8),
              const Text(
                'هذه الميزة متاحة في النسخة التجريبية. في التطبيق الحقيقي، ستجد هنا الوظائف الكاملة.',
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
        const SizedBox(height: 20),
        const Text(
          'الميزات المتاحة:',
          style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 10),
        _buildFeatureItem('إضافة وتعديل البيانات'),
        _buildFeatureItem('عرض التقارير والإحصائيات'),
        _buildFeatureItem('إدارة المستخدمين والصلاحيات'),
        _buildFeatureItem('تتبع العمليات والأنشطة'),
        const SizedBox(height: 20),
        SizedBox(
          width: double.infinity,
          child: ElevatedButton(
            onPressed: () {
              Navigator.pop(context);
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.orange,
              foregroundColor: Colors.white,
            ),
            child: const Text('العودة'),
          ),
        ),
      ],
    );
  }

  Widget _buildReviews() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'جميع التقييمات',
          style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 16),
        
        // Filter options
        Row(
          children: [
            Expanded(
              child: DropdownButtonFormField<String>(
                decoration: const InputDecoration(
                  labelText: 'فلترة حسب التقييم',
                  border: OutlineInputBorder(),
                ),
                items: const [
                  DropdownMenuItem(value: 'all', child: Text('جميع التقييمات')),
                  DropdownMenuItem(value: '5', child: Text('5 نجوم')),
                  DropdownMenuItem(value: '4', child: Text('4 نجوم')),
                  DropdownMenuItem(value: '3', child: Text('3 نجوم')),
                  DropdownMenuItem(value: '2', child: Text('2 نجوم')),
                  DropdownMenuItem(value: '1', child: Text('1 نجمة')),
                ],
                onChanged: (value) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('تم تطبيق الفلتر: $value')),
                  );
                },
              ),
            ),
          ],
        ),
        
        const SizedBox(height: 20),
        
        // Reviews list
        _buildReviewItem('أحمد محمد', 5, 'منتج ممتاز وجودة عالية، أنصح بالشراء'),
        _buildReviewItem('فاطمة علي', 4, 'جيد جداً ووصل بسرعة'),
        _buildReviewItem('محمد سالم', 5, 'أفضل من المتوقع، سأشتري مرة أخرى'),
        _buildReviewItem('نورا أحمد', 3, 'جيد لكن يمكن تحسين التغليف'),
        _buildReviewItem('خالد العلي', 5, 'ممتاز جداً، خدمة عملاء رائعة'),
      ],
    );
  }
  // Helper methods for building UI components
  Widget _buildOrderTab(String title, bool isSelected) {
    return GestureDetector(
      onTap: () {
        // Make the tab interactive
        setState(() {
          selectedOrderTab = title;
        });
        // Show feedback
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('تم تحديد فلتر: $title'),
            duration: const Duration(seconds: 1),
            backgroundColor: Colors.orange,
          ),
        );
      },
      child: Container(
        margin: const EdgeInsets.only(left: 8),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected ? const Color(0xFFD32F2F) : Colors.grey.shade200,
          borderRadius: BorderRadius.circular(20),
        ),
        child: Text(
          title,
          style: TextStyle(
            color: isSelected ? Colors.white : Colors.grey.shade600,
            fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
          ),
        ),
      ),
    );
  }

  Widget _buildOrderWithTracking(String orderNumber, String status, String amount, List<Map<String, String>> products, int trackingStep) {
    Color statusColor = status == 'قيد التجهيز' ? Colors.orange : 
                       status == 'قيد الشحن' ? Colors.blue :
                       status == 'تم التسليم' ? Colors.green : Colors.grey;
    
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: Colors.grey.withOpacity(0.1),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Order Header
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(orderNumber, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                  Text(amount, style: const TextStyle(color: Colors.orange, fontWeight: FontWeight.bold, fontSize: 18)),
                ],
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: statusColor.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Text(
                  status,
                  style: TextStyle(color: statusColor, fontWeight: FontWeight.bold),
                ),
              ),
            ],
          ),
          
          const SizedBox(height: 12),
          
          // Products with photos
          ...products.map((product) => Container(
            margin: const EdgeInsets.only(bottom: 8),
            child: Row(
              children: [
                ClipRRect(
                  borderRadius: BorderRadius.circular(8),
                  child: Image.asset(
                    product['image']!,
                    width: 50,
                    height: 50,
                    fit: BoxFit.cover,
                    errorBuilder: (context, error, stackTrace) {
                      return Container(
                        width: 50,
                        height: 50,
                        color: Colors.grey.shade200,
                        child: const Icon(Icons.inventory_2, color: Colors.grey),
                      );
                    },
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(product['name']!, style: const TextStyle(fontWeight: FontWeight.w500)),
                      Text('الكمية: ${product['qty']}', style: TextStyle(color: Colors.grey.shade600, fontSize: 12)),
                    ],
                  ),
                ),
              ],
            ),
          )).toList(),
          
          // Tracking (only for shipping orders)
          if (status == 'قيد الشحن') ...[
            const SizedBox(height: 12),
            const Divider(),
            const SizedBox(height: 8),
            _buildTrackingSteps(trackingStep),
          ],
        ],
      ),
    );
  }

  Widget _buildTrackingSteps(int currentStep) {
    List<Map<String, dynamic>> steps = [
      {'title': 'تم الطلب', 'completed': true},
      {'title': 'قيد التجهيز', 'completed': currentStep >= 2},
      {'title': 'تم الشحن', 'completed': currentStep >= 3},
      {'title': 'تم التسليم', 'completed': currentStep >= 4},
    ];
    
    return Row(
      children: steps.asMap().entries.map((entry) {
        int index = entry.key;
        Map<String, dynamic> step = entry.value;
        bool isLast = index == steps.length - 1;
        
        return Expanded(
          child: Row(
            children: [
              Column(
                children: [
                  Container(
                    width: 20,
                    height: 20,
                    decoration: BoxDecoration(
                      color: step['completed'] ? Colors.green : Colors.grey.shade300,
                      shape: BoxShape.circle,
                    ),
                    child: step['completed'] 
                        ? const Icon(Icons.check, color: Colors.white, size: 12)
                        : null,
                  ),
                  const SizedBox(height: 4),
                  Text(
                    step['title'],
                    style: TextStyle(
                      fontSize: 10,
                      color: step['completed'] ? Colors.green : Colors.grey.shade600,
                      fontWeight: step['completed'] ? FontWeight.bold : FontWeight.normal,
                    ),
                    textAlign: TextAlign.center,
                  ),
                ],
              ),
              if (!isLast)
                Expanded(
                  child: Container(
                    height: 2,
                    color: currentStep > index + 1 ? Colors.green : Colors.grey.shade300,
                    margin: const EdgeInsets.only(bottom: 24),
                  ),
                ),
            ],
          ),
        );
      }).toList(),
    );
  }

  Widget _buildFavoriteItemWithPhoto(String name, String price, String imagePath) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: Colors.grey.withOpacity(0.1),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(8),
            child: Image.asset(
              imagePath,
              width: 60,
              height: 60,
              fit: BoxFit.cover,
              errorBuilder: (context, error, stackTrace) {
                return Container(
                  width: 60,
                  height: 60,
                  color: Colors.grey.shade200,
                  child: const Icon(Icons.inventory_2, color: Colors.grey),
                );
              },
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(name, style: const TextStyle(fontWeight: FontWeight.bold)),
                Text(price, style: const TextStyle(color: Colors.orange, fontWeight: FontWeight.bold)),
              ],
            ),
          ),
          Row(
            children: [
              IconButton(
                onPressed: () {
                  final CartManager cartManager = CartManager();
                  // Find the product by name and add to cart
                  final product = kitchenProducts.firstWhere((p) => p.name == name);
                  cartManager.addToCart(product);
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text('تمت إضافة $name للسلة'),
                      backgroundColor: Colors.green,
                    ),
                  );
                },
                icon: const Icon(Icons.shopping_cart_outlined, color: Colors.orange),
              ),
              IconButton(
                onPressed: () {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text('تم حذف $name من المفضلة'),
                      backgroundColor: Colors.red,
                    ),
                  );
                },
                icon: const Icon(Icons.favorite, color: Colors.red),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildInventoryItemWithPhoto(String name, String total, String available, Color statusColor, String imagePath) {
    int availableInt = int.parse(available);
    int totalInt = int.parse(total);
    double percentage = availableInt / totalInt;
    
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: Colors.grey.withOpacity(0.1),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(8),
            child: Image.asset(
              imagePath,
              width: 50,
              height: 50,
              fit: BoxFit.cover,
              errorBuilder: (context, error, stackTrace) {
                return Container(
                  width: 50,
                  height: 50,
                  color: Colors.grey.shade200,
                  child: const Icon(Icons.inventory_2, color: Colors.grey),
                );
              },
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(name, style: const TextStyle(fontWeight: FontWeight.bold)),
                const SizedBox(height: 4),
                Row(
                  children: [
                    Text('المتاح: $available', style: TextStyle(color: Colors.grey.shade600, fontSize: 12)),
                    const SizedBox(width: 8),
                    Text('الإجمالي: $total', style: TextStyle(color: Colors.grey.shade600, fontSize: 12)),
                  ],
                ),
                const SizedBox(height: 4),
                // Progress bar
                Container(
                  height: 4,
                  decoration: BoxDecoration(
                    color: Colors.grey.shade200,
                    borderRadius: BorderRadius.circular(2),
                  ),
                  child: FractionallySizedBox(
                    alignment: Alignment.centerRight,
                    widthFactor: percentage,
                    child: Container(
                      decoration: BoxDecoration(
                        color: statusColor,
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
          Column(
            children: [
              Container(
                width: 12,
                height: 12,
                decoration: BoxDecoration(
                  color: statusColor,
                  shape: BoxShape.circle,
                ),
              ),
              const SizedBox(height: 4),
              IconButton(
                onPressed: () {
                  showDialog(
                    context: context,
                    builder: (context) => Directionality(
                      textDirection: TextDirection.rtl,
                      child: AlertDialog(
                        title: Text('تعديل $name'),
                        content: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            TextField(
                              decoration: InputDecoration(
                                labelText: 'الكمية المتاحة',
                                border: const OutlineInputBorder(),
                                hintText: available,
                              ),
                              keyboardType: TextInputType.number,
                            ),
                            const SizedBox(height: 10),
                            TextField(
                              decoration: InputDecoration(
                                labelText: 'الكمية الإجمالية',
                                border: const OutlineInputBorder(),
                                hintText: total,
                              ),
                              keyboardType: TextInputType.number,
                            ),
                          ],
                        ),
                        actions: [
                          TextButton(
                            onPressed: () => Navigator.pop(context),
                            child: const Text('إلغاء'),
                          ),
                          ElevatedButton(
                            onPressed: () {
                              Navigator.pop(context);
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(
                                  content: Text('تم تحديث $name بنجاح (تجريبي)'),
                                  backgroundColor: Colors.green,
                                ),
                              );
                            },
                            child: const Text('حفظ'),
                          ),
                        ],
                      ),
                    ),
                  );
                },
                icon: const Icon(Icons.edit, color: Colors.orange, size: 20),
              ),
            ],
          ),
        ],
      ),
    );
  }
  Widget _buildImprovedStatCard(String title, String value, IconData icon, Color color, String change) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: Colors.grey.withOpacity(0.1),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: color.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(icon, color: color, size: 20),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: Colors.green.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  change,
                  style: const TextStyle(color: Colors.green, fontSize: 10, fontWeight: FontWeight.bold),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            value,
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: color,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            title,
            style: TextStyle(
              fontSize: 12,
              color: Colors.grey.shade600,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDashboardOrderItem(String orderNumber, String customer, String amount, String status, String productImage) {
    Color statusColor = status == 'جديد' ? Colors.blue : 
                       status == 'قيد التجهيز' ? Colors.orange :
                       status == 'تم الشحن' ? Colors.purple : Colors.green;
    
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: Colors.grey.withOpacity(0.1),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(8),
            child: Image.asset(
              productImage,
              width: 40,
              height: 40,
              fit: BoxFit.cover,
              errorBuilder: (context, error, stackTrace) {
                return Container(
                  width: 40,
                  height: 40,
                  color: Colors.grey.shade200,
                  child: const Icon(Icons.inventory_2, color: Colors.grey, size: 20),
                );
              },
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(orderNumber, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                Text(customer, style: TextStyle(color: Colors.grey[600], fontSize: 12)),
              ],
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(amount, style: const TextStyle(color: Colors.orange, fontWeight: FontWeight.bold, fontSize: 14)),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: BoxDecoration(
                  color: statusColor.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  status,
                  style: TextStyle(color: statusColor, fontSize: 10, fontWeight: FontWeight.bold),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildStatCard(String title, String value, IconData icon, Color color) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: color.withOpacity(0.3)),
      ),
      child: Column(
        children: [
          Icon(icon, color: color, size: 30),
          const SizedBox(height: 8),
          Text(
            value,
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: color,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            title,
            style: const TextStyle(fontSize: 12),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }

  Widget _buildQuickActionCard(String title, IconData icon, Color color) {
    return GestureDetector(
      onTap: () {
        // Show a demo dialog or navigate to a demo page
        _showDemoDialog(title);
      },
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: color.withOpacity(0.1),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: color.withOpacity(0.3)),
        ),
        child: Column(
          children: [
            Icon(icon, color: color, size: 24),
            const SizedBox(height: 8),
            Text(
              title,
              style: TextStyle(
                color: color,
                fontWeight: FontWeight.bold,
                fontSize: 12,
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }

  void _showDemoDialog(String action) {
    // Show a functional demo dialog with navigation options
    showDialog(
      context: context,
      builder: (BuildContext context) {
        return Directionality(
          textDirection: TextDirection.rtl,
          child: AlertDialog(
            title: Text('$action - تجريبي'),
            content: Text('هذه ميزة تجريبية. في التطبيق الحقيقي، ستنتقل إلى صفحة $action.'),
            actions: [
              TextButton(
                onPressed: () => Navigator.of(context).pop(),
                child: const Text('موافق'),
              ),
              TextButton(
                onPressed: () {
                  Navigator.of(context).pop();
                  // Navigate to a demo page for this action
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (context) => DemoPage(
                        title: action,
                        page: 'demo_action',
                        userType: widget.userType,
                      ),
                    ),
                  );
                },
                child: const Text('عرض التجريبي'),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildOrderItem(String orderNumber, String customer, String amount, String status) {
    Color statusColor = status == 'جديد' ? Colors.blue : 
                       status == 'قيد التجهيز' ? Colors.orange :
                       status == 'تم الشحن' || status == 'قيد الشحن' ? Colors.purple :
                       Colors.green;
    
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: Colors.grey.shade300),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(orderNumber, style: const TextStyle(fontWeight: FontWeight.bold)),
                Text(customer, style: TextStyle(color: Colors.grey[600])),
                Text(amount, style: const TextStyle(color: Colors.orange, fontWeight: FontWeight.bold)),
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            decoration: BoxDecoration(
              color: statusColor.withOpacity(0.1),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Text(
              status,
              style: TextStyle(color: statusColor, fontSize: 12),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildInventoryItem(String name, String total, String available, Color statusColor) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: Colors.grey.shade300),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(name, style: const TextStyle(fontWeight: FontWeight.bold)),
                Text('المتاح: $available من $total', style: TextStyle(color: Colors.grey[600])),
              ],
            ),
          ),
          Container(
            width: 12,
            height: 12,
            decoration: BoxDecoration(
              color: statusColor,
              shape: BoxShape.circle,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildUserItem(String name, String email, String role, Color roleColor) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: Colors.grey.shade300),
      ),
      child: Row(
        children: [
          CircleAvatar(
            backgroundColor: roleColor.withOpacity(0.2),
            child: Text(name[0], style: TextStyle(color: roleColor)),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(name, style: const TextStyle(fontWeight: FontWeight.bold)),
                Text(email, style: TextStyle(color: Colors.grey[600])),
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            decoration: BoxDecoration(
              color: roleColor.withOpacity(0.1),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Text(
              role,
              style: TextStyle(color: roleColor, fontSize: 12),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildReportCard(String title, String value, IconData icon, Color color) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: Colors.grey.shade300),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: color.withOpacity(0.1),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(icon, color: color, size: 24),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: const TextStyle(fontWeight: FontWeight.bold)),
                Text(value, style: TextStyle(color: color, fontSize: 18, fontWeight: FontWeight.bold)),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFavoriteItem(String name, String price) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: Colors.grey.shade300),
      ),
      child: Column(
        children: [
          Expanded(
            child: Container(
              decoration: BoxDecoration(
                color: Colors.grey[100],
                borderRadius: const BorderRadius.vertical(top: Radius.circular(8)),
              ),
              child: const Center(
                child: Icon(Icons.inventory_2, size: 40, color: Colors.grey),
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(8),
            child: Column(
              children: [
                Text(name, style: const TextStyle(fontWeight: FontWeight.bold), textAlign: TextAlign.center),
                Text(price, style: const TextStyle(color: Colors.orange)),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAddressItem(String title, String address) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: Colors.grey.shade300),
      ),
      child: Row(
        children: [
          const Icon(Icons.location_on, color: Colors.orange),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: const TextStyle(fontWeight: FontWeight.bold)),
                Text(address, style: TextStyle(color: Colors.grey[600])),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSettingItem(IconData icon, String title, String value) {
    return ListTile(
      leading: Icon(icon, color: Colors.orange),
      title: Text(title),
      trailing: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (value.isNotEmpty) Text(value, style: TextStyle(color: Colors.grey[600])),
          const SizedBox(width: 8),
          const Icon(Icons.arrow_forward_ios, size: 16),
        ],
      ),
      onTap: () {},
    );
  }

  Widget _buildHelpItem(String title) {
    return ListTile(
      leading: const Icon(Icons.help_outline, color: Colors.orange),
      title: Text(title),
      trailing: const Icon(Icons.arrow_forward_ios, size: 16),
      onTap: () {},
    );
  }

  Widget _buildFeatureItem(String feature) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        children: [
          const Icon(Icons.check_circle, color: Colors.green, size: 20),
          const SizedBox(width: 8),
          Text(feature),
        ],
      ),
    );
  }

  Widget _buildContactItem(IconData icon, String title, String value) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: Colors.grey.shade300),
      ),
      child: Row(
        children: [
          Icon(icon, color: Colors.orange),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: const TextStyle(fontWeight: FontWeight.bold)),
                Text(value, style: TextStyle(color: Colors.grey[600])),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // Missing helper methods for DemoPage
  Widget _buildReviewItem(String name, int rating, String comment) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.grey[50],
        borderRadius: BorderRadius.circular(8),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text(name, style: const TextStyle(fontWeight: FontWeight.w500)),
              const SizedBox(width: 8),
              Row(
                children: List.generate(5, (index) => Icon(
                  index < rating ? Icons.star : Icons.star_border,
                  color: Colors.amber,
                  size: 14,
                )),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Text(comment, style: TextStyle(color: Colors.grey[600])),
        ],
      ),
    );
  }
}