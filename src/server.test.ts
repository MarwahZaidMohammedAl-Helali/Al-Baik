import request from 'supertest';
import { app } from './server';

describe('Server Setup', () => {
  describe('GET /health', () => {
    it('should return health check information', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Wholesale E-Commerce API is running',
        timestamp: expect.any(String),
        environment: expect.any(String)
      });
    });
  });

  describe('404 Handler', () => {
    it('should return 404 for non-existent endpoints', async () => {
      const response = await request(app)
        .get('/non-existent-endpoint')
        .expect(404);

      expect(response.body).toEqual({
        success: false,
        error: {
          code: 'ENDPOINT_NOT_FOUND',
          message: 'The requested endpoint GET /non-existent-endpoint was not found',
          timestamp: expect.any(String),
          requestId: expect.any(String)
        }
      });
    });
  });

  describe('Rate Limiting', () => {
    it('should apply rate limiting headers', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.headers).toHaveProperty('x-ratelimit-limit');
      expect(response.headers).toHaveProperty('x-ratelimit-remaining');
    });
  });
});