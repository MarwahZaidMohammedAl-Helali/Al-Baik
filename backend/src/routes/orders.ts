import { Hono } from 'hono';
import { authMiddleware } from './auth';

const ordersRouter = new Hono();

// Get user orders (authenticated)
ordersRouter.get('/', authMiddleware, async (c) => {
  return c.json({ message: 'Orders endpoint' });
});

export { ordersRouter };