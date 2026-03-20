import { AppError, ValidationError, NotFoundError } from '../middleware/errorHandler';
import { ApiResponseUtil } from '../utils/apiResponse';

describe('Backend System Checkpoint', () => {
  describe('Error Handling System', () => {
    it('should create custom errors correctly', () => {
      const error = new AppError('Test error', 400, 'TEST_ERROR');
      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('TEST_ERROR');
      expect(error.isOperational).toBe(true);
    });

    it('should create validation errors', () => {
      const error = new ValidationError('Invalid input');
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('VALIDATION_ERROR');
    });

    it('should create not found errors', () => {
      const error = new NotFoundError('User');
      expect(error.statusCode).toBe(404);
      expect(error.code).toBe('RESOURCE_NOT_FOUND');
      expect(error.message).toBe('User not found');
    });
  });

  describe('API Response Utilities', () => {
    let mockRes: any;

    beforeEach(() => {
      mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
        get: jest.fn()
      };
    });

    it('should create success responses', () => {
      ApiResponseUtil.success(mockRes, { id: 1 }, 'Success');
      
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: { id: 1 },
        message: 'Success'
      });
    });

    it('should create error responses', () => {
      ApiResponseUtil.error(mockRes, 'TEST_ERROR', 'Test error', 400);
      
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'TEST_ERROR',
          message: 'Test error',
          timestamp: expect.any(String),
          requestId: undefined
        }
      });
    });

    it('should create paginated responses', () => {
      const data = [{ id: 1 }, { id: 2 }];
      ApiResponseUtil.paginated(mockRes, data, 1, 10, 20);
      
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data,
        pagination: {
          page: 1,
          limit: 10,
          total: 20,
          totalPages: 2
        }
      });
    });
  });

  describe('System Components', () => {
    it('should have all required middleware components', () => {
      // Test that all middleware modules can be imported
      expect(() => require('../middleware/errorHandler')).not.toThrow();
      expect(() => require('../middleware/validation')).not.toThrow();
      expect(() => require('../middleware/requestLogger')).not.toThrow();
      expect(() => require('../middleware/notFoundHandler')).not.toThrow();
    });

    it('should have all required service components', () => {
      // Test that core services can be imported
      expect(() => require('../services/auditService')).not.toThrow();
      expect(() => require('../services/refundService')).not.toThrow();
      expect(() => require('../utils/apiResponse')).not.toThrow();
    });

    it('should have proper TypeScript types', () => {
      // Test that types are properly defined
      expect(() => require('../types/common')).not.toThrow();
    });
  });
});