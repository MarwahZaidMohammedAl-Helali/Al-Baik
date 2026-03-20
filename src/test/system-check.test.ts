import request from 'supertest';
import { app } from '../server';

describe('Backend System Health Check', () => {
  describe('Health Endpoint', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Wholesale E-Commerce API is running',
        environment: expect.any(String)
      });
      expect(response.body.timestamp).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for non-existent endpoints', async () => {
      const response = await request(app)
        .get('/api/non-existent-endpoint')
        .expect(404);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'ENDPOINT_NOT_FOUND',
          message: expect.stringContaining('not found'),
          timestamp: expect.any(String),
          requestId: expect.any(String)
        }
      });
    });

    it('should handle malformed JSON requests', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}')
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: expect.any(String),
          message: expect.any(String),
          timestamp: expect.any(String)
        }
      });
    });

    it('should include request ID in all responses', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.headers['x-request-id']).toBeDefined();
    });
  });

  describe('Security Headers', () => {
    it('should include security headers', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.headers['x-frame-options']).toBe('DENY');
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-xss-protection']).toBe('1; mode=block');
    });
  });

  describe('API Routes', () => {
    it('should have auth routes available', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({})
        .expect(400); // Should return validation error, not 404

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).not.toBe('ENDPOINT_NOT_FOUND');
    });

    it('should have product routes available', async () => {
      const response = await request(app)
        .get('/api/products')
        .expect(401); // Should return auth error, not 404

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).not.toBe('ENDPOINT_NOT_FOUND');
    });

    it('should have user routes available', async () => {
      const response = await request(app)
        .get('/api/users')
        .expect(401); // Should return auth error, not 404

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).not.toBe('ENDPOINT_NOT_FOUND');
    });
  });
});