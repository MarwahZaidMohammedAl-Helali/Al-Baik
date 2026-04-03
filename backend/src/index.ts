import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { createDatabase } from './db';
import { productsRouter } from './routes/products';
import { categoriesRouter } from './routes/categories';
import { usersRouter } from './routes/users';
import { ordersRouter } from './routes/orders';
import { mediaRouter } from './routes/media';
import { authRouter } from './routes/auth';
import { adminRouter } from './routes/admin';

type Bindings = {
  TURSO_DATABASE_URL: string;
  TURSO_AUTH_TOKEN: string;
  R2: R2Bucket;
  JWT_SECRET: string;
  ENVIRONMENT: string;
};

const app = new Hono<{ Bindings: Bindings }>();

// Middleware
app.use('*', logger());
app.use('*', cors({
  origin: ['http://localhost:3000', 'https://al-baik.com', 'https://*.al-baik.com'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

// Add database to context
app.use('*', async (c, next) => {
  const db = createDatabase(c.env);
  c.set('db', db);
  await next();
});

// Health check
app.get('/', (c) => {
  return c.json({ 
    message: 'Al-Baik API is running!', 
    version: '1.0.0',
    environment: c.env.ENVIRONMENT 
  });
});

// API Routes
app.route('/api/auth', authRouter);
app.route('/api/products', productsRouter);
app.route('/api/categories', categoriesRouter);
app.route('/api/users', usersRouter);
app.route('/api/orders', ordersRouter);
app.route('/api/media', mediaRouter);
app.route('/api/admin', adminRouter);

// 404 handler
app.notFound((c) => {
  return c.json({ error: 'Not Found' }, 404);
});

// Error handler
app.onError((err, c) => {
  console.error('API Error:', err);
  return c.json({ 
    error: 'Internal Server Error',
    message: c.env.ENVIRONMENT === 'development' ? err.message : 'Something went wrong'
  }, 500);
});

export default app;