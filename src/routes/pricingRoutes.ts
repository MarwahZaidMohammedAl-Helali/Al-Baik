import express from 'express';
import { body, query, validationResult } from 'express-validator';
import { PricingService, CartItem } from '../services/pricingService';
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

/**
 * POST /api/pricing/calculate
 * Calculate price for a single product
 */
router.post('/calculate',
  authenticateToken,
  [
    body('productId').isMongoId().withMessage('Valid product ID is required'),
    body('quantity').optional().isInt({ min: 1 }).withMessage('Quantity must be positive'),
    body('discountCode').optional().isString().withMessage('Discount code must be string')
  ],
  async (req: AuthenticatedRequest, res: express.Response) => {
    try {
      if (handleValidationErrors(req, res)) return;

      const { productId, quantity = 1, discountCode } = req.body;
      const userType = req.user!.role;

      const priceResult = await PricingService.calculatePrice(
        productId,
        userType,
        discountCode,
        quantity
      );

      const response: ApiResponse = {
        success: true,
        data: priceResult
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error('Price calculation error:', error);
      
      let statusCode = 500;
      let errorCode = 'INTERNAL_SERVER_ERROR';
      let message = 'Failed to calculate price';

      if ((error as Error).message.includes('not found')) {
        statusCode = 404;
        errorCode = 'PRODUCT_NOT_FOUND';
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
 * POST /api/pricing/bulk
 * Calculate bulk pricing for multiple items
 */
router.post('/bulk',
  authenticateToken,
  [
    body('items').isArray({ min: 1 }).withMessage('Items array is required'),
    body('items.*.productId').isMongoId().withMessage('Valid product ID is required'),
    body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be positive'),
    body('discountCode').optional().isString().withMessage('Discount code must be string')
  ],
  async (req: AuthenticatedRequest, res: express.Response) => {
    try {
      if (handleValidationErrors(req, res)) return;

      const { items, discountCode } = req.body;
      const userType = req.user!.role;

      const bulkResult = await PricingService.applyBulkDiscount(
        items as CartItem[],
        userType,
        discountCode
      );

      const response: ApiResponse = {
        success: true,
        data: bulkResult
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error('Bulk pricing calculation error:', error);
      
      let statusCode = 500;
      let errorCode = 'INTERNAL_SERVER_ERROR';
      let message = 'Failed to calculate bulk pricing';

      if ((error as Error).message.includes('not found')) {
        statusCode = 404;
        errorCode = 'PRODUCT_NOT_FOUND';
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
 * POST /api/pricing/summary
 * Get pricing summary for cart items
 */
router.post('/summary',
  authenticateToken,
  [
    body('items').isArray({ min: 1 }).withMessage('Items array is required'),
    body('items.*.productId').isMongoId().withMessage('Valid product ID is required'),
    body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be positive'),
    body('discountCode').optional().isString().withMessage('Discount code must be string')
  ],
  async (req: AuthenticatedRequest, res: express.Response) => {
    try {
      if (handleValidationErrors(req, res)) return;

      const { items, discountCode } = req.body;
      const userType = req.user!.role;

      const summary = await PricingService.getPricingSummary(
        items as CartItem[],
        userType,
        discountCode
      );

      const response: ApiResponse = {
        success: true,
        data: summary
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error('Pricing summary error:', error);
      
      let statusCode = 500;
      let errorCode = 'INTERNAL_SERVER_ERROR';
      let message = 'Failed to get pricing summary';

      if ((error as Error).message.includes('not found')) {
        statusCode = 404;
        errorCode = 'PRODUCT_NOT_FOUND';
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
 * GET /api/pricing/discount-codes/validate/:code
 * Validate a discount code
 */
router.get('/discount-codes/validate/:code',
  authenticateToken,
  async (req: AuthenticatedRequest, res: express.Response) => {
    try {
      const { code } = req.params;
      
      if (!code) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'INVALID_DISCOUNT_CODE',
            message: 'Discount code is required',
            timestamp: new Date().toISOString()
          }
        };
        res.status(400).json(response);
        return;
      }

      const validation = await PricingService.validateDiscountCode(code);

      const response: ApiResponse = {
        success: true,
        data: {
          isValid: validation.isValid,
          error: validation.error,
          discountCode: validation.discountCode ? {
            code: validation.discountCode.code,
            type: validation.discountCode.type,
            discountPercentage: validation.discountCode.discountPercentage,
            discountAmount: validation.discountCode.discountAmount,
            minimumOrderValue: validation.discountCode.minimumOrderValue,
            validUntil: validation.discountCode.validUntil,
            applicableUserRoles: validation.discountCode.applicableUserRoles
          } : undefined
        }
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error('Discount code validation error:', error);
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to validate discount code',
          timestamp: new Date().toISOString()
        }
      };
      res.status(500).json(response);
    }
  }
);

/**
 * GET /api/pricing/discount-codes/active
 * Get active discount codes for current user
 */
router.get('/discount-codes/active',
  authenticateToken,
  async (req: AuthenticatedRequest, res: express.Response) => {
    try {
      const userRole = req.user!.role;
      const activeCodes = await DiscountCodeService.getActiveCodesForUser(userRole);

      // Filter sensitive information for customers
      const filteredCodes = activeCodes.map(code => ({
        code: code.code,
        type: code.type,
        discountPercentage: code.discountPercentage,
        discountAmount: code.discountAmount,
        minimumOrderValue: code.minimumOrderValue,
        validUntil: code.validUntil,
        description: code.description,
        // Only show usage info to admin/employee
        ...(userRole !== 'customer' && {
          currentUses: code.currentUses,
          maxUses: code.maxUses,
          remainingUses: code.maxUses ? Math.max(0, code.maxUses - code.currentUses) : null
        })
      }));

      const response: ApiResponse = {
        success: true,
        data: filteredCodes
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error('Get active discount codes error:', error);
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to retrieve active discount codes',
          timestamp: new Date().toISOString()
        }
      };
      res.status(500).json(response);
    }
  }
);

export { router as pricingRoutes };