import { Hono } from 'hono';
import { authMiddleware } from './auth';

const mediaRouter = new Hono();

// Upload media file
mediaRouter.post('/upload', authMiddleware, async (c) => {
  return c.json({ message: 'Media upload endpoint' });
});

export { mediaRouter };