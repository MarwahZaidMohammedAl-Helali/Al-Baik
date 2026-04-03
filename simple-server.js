const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 10000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Health check
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Wholesale E-Commerce API is running',
    timestamp: new Date().toISOString()
  });
});

// Mobile app
app.get('/mobile', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'mobile-app.html'));
});

// Root
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Welcome to Wholesale E-Commerce API',
    endpoints: {
      mobile: '/mobile',
      health: '/health'
    }
  });
});

// Demo API with realistic data structure
let demoMode = false; // Set to false by default - no demo products, wait for admin to add them

const sampleProducts = [
  {
    _id: '1',
    name: 'iPhone 15 Pro Max',
    description: 'Latest iPhone with advanced camera system and A17 Pro chip',
    category: 'Smartphones',
    brand: 'Apple',
    sku: 'IPHONE-15-PRO-MAX',
    images: [
      {
        url: 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=500',
        alt: 'iPhone 15 Pro Max',
        isPrimary: true
      }
    ],
    pricing: {
      retailPrice: 1199.99,
      wholesalePrice: 999.99,
      currency: 'USD'
    },
    inventory: {
      quantity: 50,
      reserved: 5
    },
    availableQuantity: 45,
    isActive: true,
    tags: ['smartphone', 'apple', 'premium'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    _id: '2',
    name: 'Samsung Galaxy S24 Ultra',
    description: 'Premium Android smartphone with S Pen and advanced AI features',
    category: 'Smartphones',
    brand: 'Samsung',
    sku: 'GALAXY-S24-ULTRA',
    images: [
      {
        url: 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=500',
        alt: 'Samsung Galaxy S24 Ultra',
        isPrimary: true
      }
    ],
    pricing: {
      retailPrice: 1099.99,
      wholesalePrice: 899.99,
      currency: 'USD'
    },
    inventory: {
      quantity: 30,
      reserved: 2
    },
    availableQuantity: 28,
    isActive: true,
    tags: ['smartphone', 'samsung', 'android'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    _id: '3',
    name: 'MacBook Pro 16-inch',
    description: 'Powerful laptop with M3 Pro chip for professional workflows',
    category: 'Laptops',
    brand: 'Apple',
    sku: 'MACBOOK-PRO-16',
    images: [
      {
        url: 'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=500',
        alt: 'MacBook Pro 16-inch',
        isPrimary: true
      }
    ],
    pricing: {
      retailPrice: 2499.99,
      wholesalePrice: 2099.99,
      currency: 'USD'
    },
    inventory: {
      quantity: 15,
      reserved: 1
    },
    availableQuantity: 14,
    isActive: true,
    tags: ['laptop', 'apple', 'professional'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    _id: '4',
    name: 'AirPods Pro (3rd Gen)',
    description: 'Premium wireless earbuds with active noise cancellation',
    category: 'Audio',
    brand: 'Apple',
    sku: 'AIRPODS-PRO-3',
    images: [
      {
        url: 'https://images.unsplash.com/photo-1606220945770-b5b6c2c55bf1?w=500',
        alt: 'AirPods Pro',
        isPrimary: true
      }
    ],
    pricing: {
      retailPrice: 249.99,
      wholesalePrice: 199.99,
      currency: 'USD'
    },
    inventory: {
      quantity: 100,
      reserved: 10
    },
    availableQuantity: 90,
    isActive: true,
    tags: ['audio', 'wireless', 'apple'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    _id: '5',
    name: 'iPad Air (5th Gen)',
    description: 'Versatile tablet with M1 chip and Apple Pencil support',
    category: 'Tablets',
    brand: 'Apple',
    sku: 'IPAD-AIR-5',
    images: [
      {
        url: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=500',
        alt: 'iPad Air',
        isPrimary: true
      }
    ],
    pricing: {
      retailPrice: 599.99,
      wholesalePrice: 499.99,
      currency: 'USD'
    },
    inventory: {
      quantity: 25,
      reserved: 3
    },
    availableQuantity: 22,
    isActive: true,
    tags: ['tablet', 'apple', 'creative'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    _id: '6',
    name: 'Sony WH-1000XM5',
    description: 'Industry-leading noise canceling wireless headphones',
    category: 'Audio',
    brand: 'Sony',
    sku: 'SONY-WH1000XM5',
    images: [
      {
        url: 'https://images.unsplash.com/photo-1583394838336-acd977736f90?w=500',
        alt: 'Sony WH-1000XM5',
        isPrimary: true
      }
    ],
    pricing: {
      retailPrice: 399.99,
      wholesalePrice: 319.99,
      currency: 'USD'
    },
    inventory: {
      quantity: 40,
      reserved: 4
    },
    availableQuantity: 36,
    isActive: true,
    tags: ['headphones', 'sony', 'noise-canceling'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

const sampleCategories = [
  { name: 'Smartphones', count: 2 },
  { name: 'Laptops', count: 1 },
  { name: 'Audio', count: 2 },
  { name: 'Tablets', count: 1 }
];

// In-memory storage for production mode
let productStorage = [];
let categoryStorage = [];

// Admin endpoint to toggle demo mode
app.post('/api/admin/toggle-demo', (req, res) => {
  demoMode = !demoMode;
  res.json({
    success: true,
    message: `Demo mode ${demoMode ? 'enabled' : 'disabled'}`,
    demoMode
  });
});

// Admin endpoint to get current mode
app.get('/api/admin/mode', (req, res) => {
  res.json({
    success: true,
    demoMode,
    message: demoMode ? 'Demo mode - showing sample data' : 'Production mode - showing real data'
  });
});

app.get('/api/products', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const search = req.query.search;
  const category = req.query.category;
  
  // Use sample data in demo mode, real data in production mode
  let filteredProducts = demoMode ? [...sampleProducts] : [...productStorage];
  
  // Apply search filter
  if (search) {
    filteredProducts = filteredProducts.filter(product => 
      product.name.toLowerCase().includes(search.toLowerCase()) ||
      product.description.toLowerCase().includes(search.toLowerCase()) ||
      product.tags.some(tag => tag.toLowerCase().includes(search.toLowerCase()))
    );
  }
  
  // Apply category filter
  if (category) {
    filteredProducts = filteredProducts.filter(product => 
      product.category.toLowerCase() === category.toLowerCase()
    );
  }
  
  // Apply pagination
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const paginatedProducts = filteredProducts.slice(startIndex, endIndex);
  
  res.json({
    success: true,
    data: paginatedProducts,
    pagination: {
      page,
      limit,
      total: filteredProducts.length,
      totalPages: Math.ceil(filteredProducts.length / limit)
    }
  });
});

app.get('/api/products/categories', (req, res) => {
  // Use sample data in demo mode, real data in production mode
  const categories = demoMode ? sampleCategories : categoryStorage;
  res.json({
    success: true,
    data: categories
  });
});

app.get('/api/products/:id', (req, res) => {
  // Use sample data in demo mode, real data in production mode
  const products = demoMode ? sampleProducts : productStorage;
  const product = products.find(p => p._id === req.params.id);
  if (product) {
    res.json({
      success: true,
      data: product
    });
  } else {
    res.status(404).json({
      success: false,
      error: {
        code: 'PRODUCT_NOT_FOUND',
        message: 'Product not found'
      }
    });
  }
});

// Admin endpoint to add categories
app.post('/api/admin/categories', (req, res) => {
  const newCategory = {
    _id: Date.now().toString(),
    name: req.body.name,
    icon: req.body.icon || '📱',
    isActive: true,
    count: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  // Check if category already exists
  const existingCategory = categoryStorage.find(cat => cat.name.toLowerCase() === newCategory.name.toLowerCase());
  if (existingCategory) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'CATEGORY_EXISTS',
        message: 'Category already exists'
      }
    });
  }

  categoryStorage.push(newCategory);
  
  res.json({
    success: true,
    data: newCategory,
    message: 'Category added successfully'
  });
});

// Admin endpoint to update product (mark as top 10, etc.)
app.put('/api/admin/products/:id', (req, res) => {
  const productId = req.params.id;
  const productIndex = productStorage.findIndex(p => p._id === productId);
  
  if (productIndex === -1) {
    return res.status(404).json({
      success: false,
      error: {
        code: 'PRODUCT_NOT_FOUND',
        message: 'Product not found'
      }
    });
  }

  // Update product
  productStorage[productIndex] = {
    ...productStorage[productIndex],
    ...req.body,
    updatedAt: new Date().toISOString()
  };
  
  res.json({
    success: true,
    data: productStorage[productIndex],
    message: 'Product updated successfully'
  });
});

// Get top 10 products by category
app.get('/api/products/top10/:category', (req, res) => {
  const category = req.params.category;
  const products = demoMode ? sampleProducts : productStorage;
  
  const topProducts = products
    .filter(p => p.category === category && p.isActive && p.isTop10)
    .sort((a, b) => (b.top10Rank || 0) - (a.top10Rank || 0))
    .slice(0, 10);
  
  res.json({
    success: true,
    data: topProducts
  });
});
app.post('/api/admin/products', (req, res) => {
  const newProduct = {
    _id: Date.now().toString(),
    ...req.body,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  productStorage.push(newProduct);
  
  // Update categories when adding products
  const existingCategory = categoryStorage.find(cat => cat.name === newProduct.category);
  if (existingCategory) {
    existingCategory.count++;
  } else {
    categoryStorage.push({ name: newProduct.category, count: 1 });
  }
  
  res.json({
    success: true,
    data: newProduct,
    message: 'Product added successfully'
  });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (email && password) {
    res.json({
      success: true,
      token: 'demo-token',
      user: { id: '1', email, role: 'customer' }
    });
  } else {
    res.status(400).json({ success: false, message: 'Invalid credentials' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});