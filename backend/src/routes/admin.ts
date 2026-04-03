import { Hono } from 'hono';
import { authMiddleware } from './auth';

const adminRouter = new Hono();

// Admin dashboard stats
adminRouter.get('/stats', authMiddleware, async (c) => {
  const user = c.get('user');
  
  if (user.role !== 'admin') {
    return c.json({ error: 'Unauthorized' }, 403);
  }
  
  return c.json({ message: 'Admin stats endpoint' });
});

export { adminRouter };