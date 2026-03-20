import express from 'express';
import path from 'path';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { connectDatabase } from './config/database';
import { logger } from './utils/logger';
import { 
  errorHandler, 
  handleUncaughtException, 
  handleUnhandledRejection 
} from './middleware/errorHandler';
import { notFoundHandler } from './middleware/notFoundHandler';
import { 
  sanitizeInput, 
  limitRequestSize, 
  validateContentType, 
  requestId, 
  securityHeaders 
} from './middleware/validation';
import { requestLogger, performanceMonitor } from './middleware/requestLogger';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Global error handlers for uncaught exceptions and unhandled rejections
process.on('uncaughtException', handleUncaughtException);
process.on('unhandledRejection', handleUnhandledRejection);

// Request ID middleware (must be first)
app.use(requestId);

// Security middleware
app.use(helmet());
app.use(securityHeaders);
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.CORS_ORIGINS?.split(',') || ['*']
    : ['http://localhost:3000', 'http://localhost:8080', 'http://localhost:5173'],
  credentials: true
}));

// Rate limiting with enhanced configuration
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'), // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests from this IP, please try again later.',
      timestamp: new Date().toISOString()
    }
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req, res) => {
    logger.warn('Rate limit exceeded:', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      url: req.url,
      method: req.method,
      timestamp: new Date().toISOString()
    });
    
    res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests from this IP, please try again later.',
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id']
      }
    });
  }
});
app.use(limiter);

// Request size limiting
app.use(limitRequestSize(10)); // 10MB limit

// Content type validation for non-GET requests
app.use(validateContentType(['application/json', 'multipart/form-data']));

// Body parsing middleware
app.use(express.json({ 
  limit: '10mb',
  verify: (req, res, buf) => {
    try {
      JSON.parse(buf.toString());
    } catch (e) {
      throw new SyntaxError('Invalid JSON');
    }
  }
}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Input sanitization
app.use(sanitizeInput);

// Request logging and performance monitoring
app.use(requestLogger);
app.use(performanceMonitor);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Wholesale E-Commerce API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0'
  });
});

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

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

// API routes
import { authRoutes } from './routes/authRoutes';
import { userRoutes } from './routes/userRoutes';
import { productRoutes } from './routes/productRoutes';
import { pricingRoutes } from './routes/pricingRoutes';
import { discountCodeRoutes } from './routes/discountCodeRoutes';
import { inventoryRoutes } from './routes/inventoryRoutes';
import { alertRoutes } from './routes/alertRoutes';
import { orderRoutes } from './routes/orderRoutes';
import { notificationRoutes } from './routes/notificationRoutes';
import { transactionRoutes } from './routes/transactionRoutes';
import { auditRoutes } from './routes/auditRoutes';

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/pricing', pricingRoutes);
app.use('/api/discount-codes', discountCodeRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/audit', auditRoutes);

// Error handling middleware (must be last)
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
const startServer = async () => {
  try {
    // Connect to database
    await connectDatabase();
    
    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
      logger.info('Enhanced error handling and security middleware enabled');
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Graceful shutdown
const gracefulShutdown = (signal: string) => {
  logger.info(`${signal} received, shutting down gracefully`);
  
  // Close server and database connections
  process.exit(0);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

if (require.main === module) {
  startServer();
}

export { app };