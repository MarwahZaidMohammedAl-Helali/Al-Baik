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

// Demo API
app.get('/api/products', (req, res) => {
  res.json({
    success: true,
    data: [
      { id: '1', name: 'iPhone 15 Pro', price: 999.99, category: 'smartphones' },
      { id: '2', name: 'MacBook Pro', price: 1999.99, category: 'laptops' },
      { id: '3', name: 'AirPods Pro', price: 249.99, category: 'accessories' }
    ]
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