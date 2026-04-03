import { Hono } from 'hono';
import { authMiddleware } from './auth';

const usersRouter = new Hono();

// Get user profile (authenticated)
usersRouter.get('/profile', authMiddleware, async (c) => {
  const user = c.get('user');
  const db = c.get('db');
  
  // Implementation here
  return c.json({ message: 'User profile endpoint' });
});

export { usersRouter };