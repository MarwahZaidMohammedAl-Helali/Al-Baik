import { Hono } from 'hono';
import { cors } from 'hono/cors';

const app = new Hono();

// Database initialization
async function initializeDatabase(env) {
  try {
    // Create categories table
    await env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        nameAr TEXT NOT NULL,
        description TEXT,
        icon TEXT,
        color TEXT DEFAULT '#D32F2F',
        isActive INTEGER DEFAULT 1,
        sortOrder INTEGER DEFAULT 0,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
        updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `).run();

    // Create products table
    await env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        nameAr TEXT NOT NULL,
        description TEXT,
        price REAL NOT NULL,
        currency TEXT DEFAULT 'د.أ',
        mainImage TEXT,
        images TEXT,
        videoUrl TEXT,
        inStock INTEGER DEFAULT 1,
        stockQuantity INTEGER DEFAULT 0,
        rating REAL DEFAULT 0,
        reviewCount INTEGER DEFAULT 0,
        salesCount INTEGER DEFAULT 0,
        categoryId TEXT,
        isTopProduct INTEGER DEFAULT 0,
        isActive INTEGER DEFAULT 1,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
        updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `).run();

    // Create users table
    await env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        firstName TEXT,
        lastName TEXT,
        phone TEXT,
        role TEXT DEFAULT 'customer',
        isActive INTEGER DEFAULT 1,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
        updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `).run();
  } catch (error) {
    console.error('Database initialization error:', error);
  }
}

// Insert default data
async function insertDefaultData(env) {
  // Insert default categories if empty
  const categoriesCount = await env.DB.prepare('SELECT COUNT(*) as count FROM categories').first();
  if (categoriesCount.count === 0) {
    await env.DB.batch([
      env.DB.prepare(`INSERT INTO categories (id, name, nameAr, description, icon, color, isActive, sortOrder) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).bind(
        'electronics', 'Electronics', 'كهربائيات', 'أجهزة كهربائية ومنزلية', '⚡', '#D32F2F', 1, 1
      ),
      env.DB.prepare(`INSERT INTO categories (id, name, nameAr, description, icon, color, isActive, sortOrder) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).bind(
        'phone-accessories', 'Phone Accessories', 'إكسسوارات الهواتف', 'إكسسوارات وملحقات الهواتف الذكية', '📱', '#9E9E9E', 0, 2
      ),
      env.DB.prepare(`INSERT INTO categories (id, name, nameAr, description, icon, color, isActive, sortOrder) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).bind(
        'laptop-accessories', 'Laptop Accessories', 'إكسسوارات اللابتوب', 'إكسسوارات وملحقات أجهزة الكمبيوتر المحمولة', '💻', '#9E9E9E', 0, 3
      ),
      env.DB.prepare(`INSERT INTO categories (id, name, nameAr, description, icon, color, isActive, sortOrder) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).bind(
        'home-tools', 'Home Tools', 'أدوات منزلية', 'أدوات ومعدات منزلية متنوعة', '🏠', '#9E9E9E', 0, 4
      )
    ]);
  }

  // Insert default products if empty
  const productsCount = await env.DB.prepare('SELECT COUNT(*) as count FROM products').first();
  if (productsCount.count === 0) {
    const defaultProducts = [
      {
        id: '1', name: 'Multi-Function Electric Mixer', nameAr: 'خلاط كهربائي متعدد الوظائف',
        description: 'خلاط كهربائي متعدد الوظائف يتميز بقوة أداء عالية وتصميم عملي مع مجموعة ملحقات متنوعة لتلبية جميع احتياجات المطبخ.',
        price: 299.99, currency: 'د.أ', mainImage: 'https://via.placeholder.com/400x400/D32F2F/FFFFFF?text=خلاط+كهربائي',
        images: JSON.stringify(['https://via.placeholder.com/400x400/D32F2F/FFFFFF?text=خلاط+1']),
        videoUrl: 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4',
        inStock: 1, stockQuantity: 25, rating: 4.5, reviewCount: 127, salesCount: 250, categoryId: 'electronics', isTopProduct: 1
      },
      {
        id: '2', name: 'Glass Electric Kettle', nameAr: 'غلاية كهربائية زجاج',
        description: 'غلاية ماء كهربائية زجاجية 1.8 لتر تتميز بتصميم أنيق وعصري مع سعة كبيرة تناسب الاستخدام اليومي.',
        price: 159.99, currency: 'د.أ', mainImage: 'https://via.placeholder.com/400x400/D32F2F/FFFFFF?text=غلاية+زجاج',
        images: JSON.stringify(['https://via.placeholder.com/400x400/D32F2F/FFFFFF?text=غلاية+1']),
        videoUrl: 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4',
        inStock: 1, stockQuantity: 18, rating: 4.3, reviewCount: 89, salesCount: 180, categoryId: 'electronics', isTopProduct: 1
      }
    ];

    const productInserts = defaultProducts.map(product => 
      env.DB.prepare(`INSERT INTO products (id, name, nameAr, description, price, currency, mainImage, images, videoUrl, inStock, stockQuantity, rating, reviewCount, salesCount, categoryId, isTopProduct) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(
        product.id, product.name, product.nameAr, product.description, product.price, product.currency,
        product.mainImage, product.images, product.videoUrl, product.inStock, product.stockQuantity,
        product.rating, product.reviewCount, product.salesCount, product.categoryId, product.isTopProduct
      )
    );
    await env.DB.batch(productInserts);
  }

  // Insert default users if empty
  const usersCount = await env.DB.prepare('SELECT COUNT(*) as count FROM users').first();
  if (usersCount.count === 0) {
    await env.DB.batch([
      env.DB.prepare(`INSERT INTO users (id, email, password, firstName, lastName, role, isActive) VALUES (?, ?, ?, ?, ?, ?, ?)`).bind(
        'admin-1', 'admin@al-baik.com', 'admin123', 'المدير', 'العام', 'admin', 1
      ),
      env.DB.prepare(`INSERT INTO users (id, email, password, firstName, lastName, role, isActive) VALUES (?, ?, ?, ?, ?, ?, ?)`).bind(
        'staff-1', 'staff@al-baik.com', 'staff123', 'الموظف', 'الأول', 'staff', 1
      ),
      env.DB.prepare(`INSERT INTO users (id, email, password, firstName, lastName, role, isActive) VALUES (?, ?, ?, ?, ?, ?, ?)`).bind(
        'customer-1', 'customer@al-baik.com', 'customer123', 'العميل', 'المميز', 'customer', 1
      )
    ]);
  }
}
// Enable CORS
app.use('*', cors({
  origin: ['http://localhost:3000', 'https://al-baik.com', '*'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

// Initialize database on startup
app.use('*', async (c, next) => {
  await initializeDatabase(c.env);
  await insertDefaultData(c.env);
  await next();
});

// Simple JWT token generation
function generateToken(userId, role) {
  const payload = { userId, role, exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 7) };
  return btoa(JSON.stringify(payload));
}

function verifyToken(token) {
  try {
    const payload = JSON.parse(atob(token));
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch { return null; }
}

// Auth middleware
async function authMiddleware(c, next) {
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'No token provided' }, 401);
  }
  const token = authHeader.substring(7);
  const payload = verifyToken(token);
  if (!payload) return c.json({ error: 'Invalid token' }, 401);
  c.set('user', payload);
  await next();
}

// Health check
app.get('/', (c) => {
  return c.json({ 
    message: 'Al-Baik API is running!', 
    version: '2.0.0',
    status: 'healthy',
    database: 'connected'
  });
});

// Authentication routes
app.post('/api/auth/login', async (c) => {
  try {
    const { email, password } = await c.req.json();
    const user = await c.env.DB.prepare('SELECT * FROM users WHERE email = ? AND password = ? AND isActive = 1').bind(email, password).first();
    if (!user) return c.json({ error: 'Invalid credentials' }, 401);
    
    const token = generateToken(user.id, user.role);
    const { password: _, ...userWithoutPassword } = user;
    return c.json({ user: userWithoutPassword, token, message: 'Login successful' });
  } catch (error) {
    return c.json({ error: 'Login failed' }, 500);
  }
});
// Products routes
app.get('/api/products', async (c) => {
  const page = parseInt(c.req.query('page') || '1');
  const limit = parseInt(c.req.query('limit') || '20');
  const search = c.req.query('search');
  const categoryId = c.req.query('categoryId');

  let query = 'SELECT * FROM products WHERE isActive = 1';
  let params = [];

  if (search) {
    query += ' AND (nameAr LIKE ? OR name LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }
  if (categoryId) {
    query += ' AND categoryId = ?';
    params.push(categoryId);
  }

  const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as count');
  const totalResult = await c.env.DB.prepare(countQuery).bind(...params).first();
  const total = totalResult.count;

  query += ' ORDER BY createdAt DESC LIMIT ? OFFSET ?';
  const offset = (page - 1) * limit;
  params.push(limit, offset);

  const products = await c.env.DB.prepare(query).bind(...params).all();
  const processedProducts = products.results.map(product => ({
    ...product,
    images: product.images ? JSON.parse(product.images) : [],
    inStock: Boolean(product.inStock),
    isTopProduct: Boolean(product.isTopProduct),
    isActive: Boolean(product.isActive)
  }));

  return c.json({
    products: processedProducts,
    pagination: {
      page, limit, total,
      totalPages: Math.ceil(total / limit),
      hasNext: page < Math.ceil(total / limit),
      hasPrev: page > 1
    }
  });
});

app.get('/api/products/:id', async (c) => {
  const id = c.req.param('id');
  const product = await c.env.DB.prepare('SELECT * FROM products WHERE id = ? AND isActive = 1').bind(id).first();
  if (!product) return c.json({ error: 'Product not found' }, 404);

  const processedProduct = {
    ...product,
    images: product.images ? JSON.parse(product.images) : [],
    inStock: Boolean(product.inStock),
    isTopProduct: Boolean(product.isTopProduct),
    isActive: Boolean(product.isActive)
  };
  return c.json({ product: processedProduct });
});

// Categories routes
app.get('/api/categories', async (c) => {
  const categories = await c.env.DB.prepare('SELECT * FROM categories ORDER BY sortOrder ASC').all();
  const processedCategories = categories.results.map(category => ({
    ...category, isActive: Boolean(category.isActive)
  }));
  return c.json({ categories: processedCategories });
});

app.get('/api/categories/:id/top-products', async (c) => {
  const categoryId = c.req.param('id');
  const limit = parseInt(c.req.query('limit') || '10');
  
  const topProducts = await c.env.DB.prepare(`
    SELECT * FROM products 
    WHERE categoryId = ? AND isActive = 1 AND isTopProduct = 1
    ORDER BY rating * salesCount DESC 
    LIMIT ?
  `).bind(categoryId, limit).all();

  const processedProducts = topProducts.results.map(product => ({
    ...product,
    images: product.images ? JSON.parse(product.images) : [],
    inStock: Boolean(product.inStock),
    isTopProduct: Boolean(product.isTopProduct),
    isActive: Boolean(product.isActive)
  }));
  return c.json({ products: processedProducts });
});
// Admin routes
app.get('/api/admin/stats', authMiddleware, async (c) => {
  const user = c.get('user');
  if (user.role !== 'admin') return c.json({ error: 'Unauthorized' }, 403);

  const totalProducts = await c.env.DB.prepare('SELECT COUNT(*) as count FROM products WHERE isActive = 1').first();
  const inStockProducts = await c.env.DB.prepare('SELECT COUNT(*) as count FROM products WHERE isActive = 1 AND inStock = 1').first();
  const outOfStockProducts = await c.env.DB.prepare('SELECT COUNT(*) as count FROM products WHERE isActive = 1 AND inStock = 0').first();
  const totalInventory = await c.env.DB.prepare('SELECT SUM(stockQuantity) as total FROM products WHERE isActive = 1').first();
  const totalUsers = await c.env.DB.prepare('SELECT COUNT(*) as count FROM users WHERE isActive = 1').first();
  const totalSales = await c.env.DB.prepare('SELECT SUM(salesCount) as total FROM products WHERE isActive = 1').first();

  return c.json({
    stats: {
      totalProducts: totalProducts.count,
      inStockProducts: inStockProducts.count,
      outOfStockProducts: outOfStockProducts.count,
      totalInventory: totalInventory.total || 0,
      totalUsers: totalUsers.count,
      totalSales: totalSales.total || 0
    }
  });
});

app.put('/api/products/:id/top-status', authMiddleware, async (c) => {
  const user = c.get('user');
  if (user.role !== 'admin') return c.json({ error: 'Unauthorized' }, 403);

  try {
    const id = c.req.param('id');
    const { isTopProduct } = await c.req.json();
    
    const existingProduct = await c.env.DB.prepare('SELECT * FROM products WHERE id = ?').bind(id).first();
    if (!existingProduct) return c.json({ error: 'Product not found' }, 404);

    await c.env.DB.prepare('UPDATE products SET isTopProduct = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?').bind(
      isTopProduct ? 1 : 0, id
    ).run();

    const updatedProduct = await c.env.DB.prepare('SELECT * FROM products WHERE id = ?').bind(id).first();
    const processedProduct = {
      ...updatedProduct,
      images: updatedProduct.images ? JSON.parse(updatedProduct.images) : [],
      inStock: Boolean(updatedProduct.inStock),
      isTopProduct: Boolean(updatedProduct.isTopProduct),
      isActive: Boolean(updatedProduct.isActive)
    };

    return c.json({ 
      product: processedProduct, 
      message: `Product ${isTopProduct ? 'added to' : 'removed from'} top products` 
    });
  } catch (error) {
    return c.json({ error: 'Failed to update product status' }, 500);
  }
});

// Error handlers
app.notFound((c) => c.json({ error: 'Not Found' }, 404));
app.onError((err, c) => {
  console.error('API Error:', err);
  return c.json({ error: 'Internal Server Error', message: err.message }, 500);
});

export default app;