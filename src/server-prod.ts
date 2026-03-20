import express from 'express';
import path from 'path';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 10000;

// Basic middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Wholesale E-Commerce API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'production',
    version: '1.0.0'
  });
});

// Mobile app route
app.get('/mobile', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'mobile-app.html'));
});

// Root route
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Welcome to Wholesale E-Commerce API',
    endpoints: {
      mobile: '/mobile',
      health: '/health',
      api: '/api'
    },
    timestamp: new Date().toISOString()
  });
});

// Basic API routes
app.get('/api/products', (req, res) => {
  res.json({
    success: true,
    data: [
      {
        id: '1',
        name: 'iPhone 15 Pro',
        price: 999.99,
        category: 'smartphones',
        inStock: true
      },
      {
        id: '2',
        name: 'MacBook Pro',
        price: 1999.99,
        category: 'laptops',
        inStock: true
      },
      {
        id: '3',
        name: 'AirPods Pro',
        price: 249.99,
        category: 'accessories',
        inStock: true
      }
    ]
  });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  if (email && password) {
    res.json({
      success: true,
      message: 'Login successful',
      token: 'demo-jwt-token',
      user: {
        id: '1',
        email: email,
        role: 'customer'
      }
    });
  } else {
    res.status(400).json({
      success: false,
      message: 'Email and password required'
    });
  }
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
    path: req.originalUrl
  });
});

// Error handler
app.use((err: any, req: any, res: any, next: any) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Internal server error'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📱 Mobile app: http://localhost:${PORT}/mobile`);
  console.log(`🔍 Health check: http://localhost:${PORT}/health`);
});

export { app };