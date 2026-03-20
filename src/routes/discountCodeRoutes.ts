import express from 'express';
import { body, query, validationResult } from 'express-validator';
import { DiscountCodeService } from '../services/discountCodeService';
import { authenticateToken, requireRole, AuthenticatedRequest } from '../middleware/auth';
import { ApiResponse } from '../types/common';
import { logger } from '../utils/logger';

const router = express.Router();

// Helper function to handle validation errors
const handleValidationErrors = (req: express.Request, res: express.Response): boolean => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const response: ApiResponse = {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid input data',
        details: errors.array(),
        timestamp: new Date().toISOString()
      }
    };
    res.status(400).json(response);
    return true;
  }
  return false;
};

// Validation schemas
const createDiscountCodeValidation = [
  body('code').trim().isLength({ min: 3, max: 20 }).matches(/^[A-Z0-9\-_]+$/i).withMessage('Code must be 3-20 characters, letters, numbers, hyphens, and underscores only'),
  body('type').isIn(['wholesale', 'promotional', 'bulk']).withMessage('Type must be wholesale, promotional, or bulk'),
  body('discountPercentage').optional().isFloat({ min: 0, max: 100 }).withMessage('Discount percentage must be 0-100'),
  body('discountAmount').optional().isFloat({ min: 0 }).withMessage('Discount amount must be positive'),
  body('minimumOrderValue').optional().isFloat({ min: 0 }).withMessage('Minimum order value must be positive'),
  body('maxUses').optional().isInt({ min: 1 }).withMessage('Max uses must be positive'),
  body('validFrom').isISO8601().withMessage('Valid from date is required'),
  body('validUntil').isISO8601().withMessage('Valid until date is required'),
  body('applicableUserRoles').isArray({ min: 1 }).withMessage('At least one user role is required'),
  body('applicableUserRoles.*').isIn(['admin', 'employee', 'customer']).withMessage('User role must be admin, employee, or customer'),
  body('description').optional().trim().isLength({ max: 500 }).withMessage('Description cannot exceed 500 characters')
];

const updateDiscountCodeValidation = [
  body('type').optional().isIn(['wholesale', 'promotional', 'bulk']).withMessage('Type must be wholesale, promotional, or bulk'),
  body('discountPercentage').optional().isFloat({ min: 0, max: 100 }).withMessage('Discount percentage must be 0-100'),
  body('discountAmount').optional().isFloat({ min: 0 }).withMessage('Discount amount must be positive'),
  body('minimumOrderValue').optional().isFloat({ min: 0 }).withMessage('Minimum order value must be positive'),
  body('maxUses').optional().isInt({ min: 1 }).withMessage('Max uses must be positive'),
  body('validFrom').optional().isISO8601().withMessage('Valid from date must be valid'),
  body('validUntil').optional().isISO8601().withMessage('Valid until date must be valid'),
  body('applicableUserRoles').optional().isArray({ min: 1 }).withMessage('At least one user role is required'),
  body('applicableUserRoles.*').optional().isIn(['admin', 'employee', 'customer']).withMessage('User role must be admin, employee, or customer'),
  body('description').optional().trim().isLength({ max: 500 }).withMessage('Description cannot exceed 500 characters'),
  body('isActive').optional().isBoolean().withMessage('IsActive must be boolean')
];

/**
 * GET /api/discount-codes
 * Get discount codes with filtering and pagination (Admin/Employee only)
 */
router.get('/',
  authenticateToken,
  requireRole(['admin', 'employee']),
  [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be positive'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1-100'),
    query('search').optional().isString().withMessage('Search must be string'),
    query('type').optional().isIn(['wholesale', 'promotional', 'bulk']).withMessage('Type must be wholesale, promotional, or bulk'),
    query('isActive').optional().isBoolean().withMessage('IsActive must be boolean'),
    query('userRole').optional().isIn(['admin', 'employee', 'customer']).withMessage('User role must be admin, employee, or customer'),
    query('expiringSoon').optional().isBoolean().withMessage('ExpiringSoon must be boolean')
  ],
  async (req: AuthenticatedRequest, res: express.Response) => {
    try {
      if (handleValidationErrors(req, res)) return;

      const options = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 20,
        search: req.query.search as string,
        type: req.query.type as 'wholesale' | 'promotional' | 'bulk',
        isActive: req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined,
        userRole: req.query.userRole as 'admin' | 'employee' | 'customer',
        expiringSoon: req.query.expiringSoon === 'true'
      };

      // Filter out undefined values
      const filteredOptions = Object.fromEntries(
        Object.entries(options).filter(([_, value]) => value !== undefined)
      ) as any;

      const result = await DiscountCodeService.getDiscountCodes(filteredOptions);

      const response: ApiResponse = {
        success: true,
        data: result.discountCodes,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: result.totalPages
        }
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error('Get discount codes error:', error);
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to retrieve discount codes',
          timestamp: new Date().toISOString()
        }
      };
      res.status(500).json(response);
    }
  }
);

/**
 * GET /api/discount-codes/statistics
 * Get discount code statistics (Admin only)
 */
router.get('/statistics',
  authenticateToken,
  requireRole(['admin']),
  async (req: AuthenticatedRequest, res: express.Response) => {
    try {
      const statistics = await DiscountCodeService.getStatistics();

      const response: ApiResponse = {
        success: true,
        data: statistics
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error('Get discount code statistics error:', error);
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to retrieve statistics',
          timestamp: new Date().toISOString()
        }
      };
      res.status(500).json(response);
    }
  }
);

/**
 * GET /api/discount-codes/expiring
 * Get expiring discount codes (Admin/Employee only)
 */
router.get('/expiring',
  authenticateToken,
  requireRole(['admin', 'employee']),
  [
    query('days').optional().isInt({ min: 1, max: 30 }).withMessage('Days must be 1-30')
  ],
  async (req: AuthenticatedRequest, res: express.Response) => {
    try {
      if (handleValidationErrors(req, res)) return;

      const days = parseInt(req.query.days as string) || 7;
      const expiringCodes = await DiscountCodeService.getExpiringCodes(days);

      const response: ApiResponse = {
        success: true,
        data: expiringCodes
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error('Get expiring discount codes error:', error);
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to retrieve expiring codes',
          timestamp: new Date().toISOString()
        }
      };
      res.status(500).json(response);
    }
  }
);

/**
 * GET /api/discount-codes/:id
 * Get discount code by ID (Admin/Employee only)
 */
router.get('/:id',
  authenticateToken,
  requireRole(['admin', 'employee']),
  async (req: AuthenticatedRequest, res: express.Response) => {
    try {
      const codeId = req.params.id;
      if (!codeId) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'INVALID_CODE_ID',
            message: 'Discount code ID is required',
            timestamp: new Date().toISOString()
          }
        };
        res.status(400).json(response);
        return;
      }

      const discountCode = await DiscountCodeService.getDiscountCodeById(codeId);

      if (!discountCode) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'DISCOUNT_CODE_NOT_FOUND',
            message: 'Discount code not found',
            timestamp: new Date().toISOString()
          }
        };
        res.status(404).json(response);
        return;
      }

      const response: ApiResponse = {
        success: true,
        data: discountCode
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error('Get discount code error:', error);
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to retrieve discount code',
          timestamp: new Date().toISOString()
        }
      };
      res.status(500).json(response);
    }
  }
);

/**
 * POST /api/discount-codes
 * Create new discount code (Admin only)
 */
router.post('/',
  authenticateToken,
  requireRole(['admin']),
  createDiscountCodeValidation,
  async (req: AuthenticatedRequest, res: express.Response) => {
    try {
      if (handleValidationErrors(req, res)) return;

      // Validate that either percentage or amount is provided, but not both
      const { discountPercentage, discountAmount } = req.body;
      if (!discountPercentage && !discountAmount) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Either discount percentage or discount amount must be provided',
            timestamp: new Date().toISOString()
          }
        };
        res.status(400).json(response);
        return;
      }

      if (discountPercentage && discountAmount) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Cannot have both discount percentage and discount amount',
            timestamp: new Date().toISOString()
          }
        };
        res.status(400).json(response);
        return;
      }

      // Validate date range
      const validFrom = new Date(req.body.validFrom);
      const validUntil = new Date(req.body.validUntil);
      if (validUntil <= validFrom) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Valid until date must be after valid from date',
            timestamp: new Date().toISOString()
          }
        };
        res.status(400).json(response);
        return;
      }

      const discountCode = await DiscountCodeService.createDiscountCode({
        ...req.body,
        validFrom,
        validUntil
      });

      const response: ApiResponse = {
        success: true,
        data: discountCode
      };

      res.status(201).json(response);
    } catch (error) {
      logger.error('Create discount code error:', error);
      
      let statusCode = 500;
      let errorCode = 'INTERNAL_SERVER_ERROR';
      let message = 'Failed to create discount code';

      if ((error as Error).message.includes('already exists')) {
        statusCode = 409;
        errorCode = 'DUPLICATE_CODE';
        message = (error as Error).message;
      }

      const response: ApiResponse = {
        success: false,
        error: {
          code: errorCode,
          message,
          timestamp: new Date().toISOString()
        }
      };

      res.status(statusCode).json(response);
    }
  }
);

/**
 * PUT /api/discount-codes/:id
 * Update discount code (Admin only)
 */
router.put('/:id',
  authenticateToken,
  requireRole(['admin']),
  updateDiscountCodeValidation,
  async (req: AuthenticatedRequest, res: express.Response) => {
    try {
      if (handleValidationErrors(req, res)) return;

      const codeId = req.params.id;
      if (!codeId) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'INVALID_CODE_ID',
            message: 'Discount code ID is required',
            timestamp: new Date().toISOString()
          }
        };
        res.status(400).json(response);
        return;
      }

      // Validate date range if both dates are provided
      if (req.body.validFrom && req.body.validUntil) {
        const validFrom = new Date(req.body.validFrom);
        const validUntil = new Date(req.body.validUntil);
        if (validUntil <= validFrom) {
          const response: ApiResponse = {
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Valid until date must be after valid from date',
              timestamp: new Date().toISOString()
            }
          };
          res.status(400).json(response);
          return;
        }
      }

      const updates = { ...req.body };
      if (updates.validFrom) updates.validFrom = new Date(updates.validFrom);
      if (updates.validUntil) updates.validUntil = new Date(updates.validUntil);

      const discountCode = await DiscountCodeService.updateDiscountCode(codeId, updates);

      const response: ApiResponse = {
        success: true,
        data: discountCode
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error('Update discount code error:', error);
      
      let statusCode = 500;
      let errorCode = 'INTERNAL_SERVER_ERROR';
      let message = 'Failed to update discount code';

      if ((error as Error).message === 'Discount code not found') {
        statusCode = 404;
        errorCode = 'DISCOUNT_CODE_NOT_FOUND';
        message = 'Discount code not found';
      }

      const response: ApiResponse = {
        success: false,
        error: {
          code: errorCode,
          message,
          timestamp: new Date().toISOString()
        }
      };

      res.status(statusCode).json(response);
    }
  }
);

/**
 * DELETE /api/discount-codes/:id
 * Delete discount code (Admin only)
 */
router.delete('/:id',
  authenticateToken,
  requireRole(['admin']),
  async (req: AuthenticatedRequest, res: express.Response) => {
    try {
      const codeId = req.params.id;
      if (!codeId) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'INVALID_CODE_ID',
            message: 'Discount code ID is required',
            timestamp: new Date().toISOString()
          }
        };
        res.status(400).json(response);
        return;
      }

      await DiscountCodeService.deleteDiscountCode(codeId);

      const response: ApiResponse = {
        success: true,
        data: {
          message: 'Discount code deleted successfully'
        }
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error('Delete discount code error:', error);
      
      let statusCode = 500;
      let errorCode = 'INTERNAL_SERVER_ERROR';
      let message = 'Failed to delete discount code';

      if ((error as Error).message === 'Discount code not found') {
        statusCode = 404;
        errorCode = 'DISCOUNT_CODE_NOT_FOUND';
        message = 'Discount code not found';
      }

      const response: ApiResponse = {
        success: false,
        error: {
          code: errorCode,
          message,
          timestamp: new Date().toISOString()
        }
      };

      res.status(statusCode).json(response);
    }
  }
);

/**
 * PUT /api/discount-codes/:id/deactivate
 * Deactivate discount code (Admin only)
 */
router.put('/:id/deactivate',
  authenticateToken,
  requireRole(['admin']),
  async (req: AuthenticatedRequest, res: express.Response) => {
    try {
      const codeId = req.params.id;
      if (!codeId) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'INVALID_CODE_ID',
            message: 'Discount code ID is required',
            timestamp: new Date().toISOString()
          }
        };
        res.status(400).json(response);
        return;
      }

      await DiscountCodeService.deactivateDiscountCode(codeId);

      const response: ApiResponse = {
        success: true,
        data: {
          message: 'Discount code deactivated successfully'
        }
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error('Deactivate discount code error:', error);
      
      let statusCode = 500;
      let errorCode = 'INTERNAL_SERVER_ERROR';
      let message = 'Failed to deactivate discount code';

      if ((error as Error).message === 'Discount code not found') {
        statusCode = 404;
        errorCode = 'DISCOUNT_CODE_NOT_FOUND';
        message = 'Discount code not found';
      }

      const response: ApiResponse = {
        success: false,
        error: {
          code: errorCode,
          message,
          timestamp: new Date().toISOString()
        }
      };

      res.status(statusCode).json(response);
    }
  }
);

export { router as discountCodeRoutes };