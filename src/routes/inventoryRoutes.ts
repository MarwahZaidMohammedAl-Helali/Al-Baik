import express from 'express';
import { body, query, validationResult } from 'express-validator';
import { InventoryService } from '../services/inventoryService';
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
 * PUT /api/inventory/:productId/stock
 * Update product stock (Admin/Employee only)
 */
router.put('/:productId/stock',
  authenticateToken,
  requireRole(['admin', 'employee']),
  [
    body('quantity').isInt({ min: 0 }).withMessage('Quantity must be non-negative'),
    body('type').isIn(['add', 'subtract', 'set', 'sale', 'restock', 'adjustment']).withMessage('Invalid update type'),
    body('reason').optional().isString().withMessage('Reason must be string'),
    body('reference').optional().isString().withMessage('Reference must be string')
  ],
  async (req: AuthenticatedRequest, res: express.Response) => {
    try {
      if (handleValidationErrors(req, res)) return;

      const { productId } = req.params;
      const { quantity, type, reason, reference } = req.body;
      const updatedBy = req.user!.email;

      if (!productId) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'INVALID_PRODUCT_ID',
            message: 'Product ID is required',
            timestamp: new Date().toISOString()
          }
        };
        res.status(400).json(response);
        return;
      }

      const result = await InventoryService.updateStock(
        productId,
        quantity,
        type,
        reason,
        updatedBy,
        reference
      );

      const response: ApiResponse = {
        success: true,
        data: result
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error('Update stock error:', error);
      
      let statusCode = 500;
      let errorCode = 'INTERNAL_SERVER_ERROR';
      let message = 'Failed to update stock';

      if ((error as Error).message === 'Product not found') {
        statusCode = 404;
        errorCode = 'PRODUCT_NOT_FOUND';
        message = 'Product not found';
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
 * GET /api/inventory/:productId/availability
 * Check product availability with overselling prevention
 */
router.get('/:productId/availability',
  authenticateToken,
  [
    query('quantity').optional().isInt({ min: 1 }).withMessage('Quantity must be positive'),
    query('orderReference').optional().isString().withMessage('Order reference must be string')
  ],
  async (req: AuthenticatedRequest, res: express.Response) => {
    try {
      if (handleValidationErrors(req, res)) return;

      const { productId } = req.params;
      const quantity = parseInt(req.query.quantity as string) || 1;
      const orderReference = req.query.orderReference as string;
      const userId = req.user!.id;

      if (!productId) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'INVALID_PRODUCT_ID',
            message: 'Product ID is required',
            timestamp: new Date().toISOString()
          }
        };
        res.status(400).json(response);
        return;
      }

      const isAvailable = await InventoryService.checkAvailability(
        productId, 
        quantity, 
        userId, 
        orderReference
      );

      const response: ApiResponse = {
        success: true,
        data: {
          productId,
          requestedQuantity: quantity,
          available: isAvailable
        }
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error('Check availability error:', error);
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to check availability',
          timestamp: new Date().toISOString()
        }
      };
      res.status(500).json(response);
    }
  }
);

/**
 * POST /api/inventory/reserve
 * Reserve stock for orders with overselling prevention
 */
router.post('/reserve',
  authenticateToken,
  [
    body('items').isArray({ min: 1 }).withMessage('Items array is required'),
    body('items.*.productId').isMongoId().withMessage('Valid product ID is required'),
    body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be positive'),
    body('expirationMinutes').optional().isInt({ min: 1, max: 1440 }).withMessage('Expiration must be 1-1440 minutes'),
    body('reference').optional().isString().withMessage('Reference must be string')
  ],
  async (req: AuthenticatedRequest, res: express.Response) => {
    try {
      if (handleValidationErrors(req, res)) return;

      const { items, expirationMinutes = 30, reference } = req.body;
      const userId = req.user!.id;

      const result = await InventoryService.reserveStock(
        items,
        expirationMinutes,
        reference,
        userId
      );

      const response: ApiResponse = {
        success: true,
        data: result
      };

      // Return 409 Conflict if reservation failed due to insufficient stock
      const statusCode = result.success ? 200 : 409;
      res.status(statusCode).json(response);
    } catch (error) {
      logger.error('Reserve stock error:', error);
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to reserve stock',
          timestamp: new Date().toISOString()
        }
      };
      res.status(500).json(response);
    }
  }
);

/**
 * DELETE /api/inventory/reserve/:reservationId
 * Release stock reservation
 */
router.delete('/reserve/:reservationId',
  authenticateToken,
  async (req: AuthenticatedRequest, res: express.Response) => {
    try {
      const { reservationId } = req.params;

      if (!reservationId) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'INVALID_RESERVATION_ID',
            message: 'Reservation ID is required',
            timestamp: new Date().toISOString()
          }
        };
        res.status(400).json(response);
        return;
      }

      const success = await InventoryService.releaseReservation(reservationId);

      const response: ApiResponse = {
        success: true,
        data: {
          reservationId,
          released: success
        }
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error('Release reservation error:', error);
      
      let statusCode = 500;
      let errorCode = 'INTERNAL_SERVER_ERROR';
      let message = 'Failed to release reservation';

      if ((error as Error).message.includes('not found')) {
        statusCode = 404;
        errorCode = 'RESERVATION_NOT_FOUND';
        message = 'Reservation not found or not active';
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
 * GET /api/inventory/alerts/low-stock
 * Get low stock alerts with automatic alert generation (Admin/Employee only)
 */
router.get('/alerts/low-stock',
  authenticateToken,
  requireRole(['admin', 'employee']),
  [
    query('generateAlerts').optional().isBoolean().withMessage('Generate alerts must be boolean')
  ],
  async (req: AuthenticatedRequest, res: express.Response) => {
    try {
      if (handleValidationErrors(req, res)) return;

      const generateAlerts = req.query.generateAlerts !== 'false'; // Default to true
      const alerts = await InventoryService.getLowStockAlerts(generateAlerts);

      const response: ApiResponse = {
        success: true,
        data: {
          alerts,
          total: alerts.length,
          summary: {
            outOfStock: alerts.filter(a => a.severity === 'out_of_stock').length,
            critical: alerts.filter(a => a.severity === 'critical').length,
            low: alerts.filter(a => a.severity === 'low').length
          }
        }
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error('Get low stock alerts error:', error);
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to retrieve low stock alerts',
          timestamp: new Date().toISOString()
        }
      };
      res.status(500).json(response);
    }
  }
);

/**
 * GET /api/inventory/:productId/movements
 * Get inventory movements for a product (Admin/Employee only)
 */
router.get('/:productId/movements',
  authenticateToken,
  requireRole(['admin', 'employee']),
  [
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1-100')
  ],
  async (req: AuthenticatedRequest, res: express.Response) => {
    try {
      if (handleValidationErrors(req, res)) return;

      const { productId } = req.params;
      const limit = parseInt(req.query.limit as string) || 50;

      if (!productId) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'INVALID_PRODUCT_ID',
            message: 'Product ID is required',
            timestamp: new Date().toISOString()
          }
        };
        res.status(400).json(response);
        return;
      }

      const movements = await InventoryService.getInventoryMovements(productId, limit);

      const response: ApiResponse = {
        success: true,
        data: movements
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error('Get inventory movements error:', error);
      
      let statusCode = 500;
      let errorCode = 'INTERNAL_SERVER_ERROR';
      let message = 'Failed to retrieve inventory movements';

      if ((error as Error).message === 'Product not found') {
        statusCode = 404;
        errorCode = 'PRODUCT_NOT_FOUND';
        message = 'Product not found';
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
 * PUT /api/inventory/bulk-update
 * Bulk update inventory (Admin only)
 */
router.put('/bulk-update',
  authenticateToken,
  requireRole(['admin']),
  [
    body('updates').isArray({ min: 1 }).withMessage('Updates array is required'),
    body('updates.*.productId').isMongoId().withMessage('Valid product ID is required'),
    body('updates.*.quantity').isInt({ min: 0 }).withMessage('Quantity must be non-negative'),
    body('updates.*.type').isIn(['add', 'subtract', 'set']).withMessage('Invalid update type'),
    body('updates.*.reason').optional().isString().withMessage('Reason must be string')
  ],
  async (req: AuthenticatedRequest, res: express.Response) => {
    try {
      if (handleValidationErrors(req, res)) return;

      const { updates } = req.body;
      const updatedBy = req.user!.email;

      const results = await InventoryService.bulkUpdateInventory(updates, updatedBy);

      const response: ApiResponse = {
        success: true,
        data: {
          totalUpdates: updates.length,
          successfulUpdates: results.length,
          results
        }
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error('Bulk update inventory error:', error);
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to perform bulk update',
          timestamp: new Date().toISOString()
        }
      };
      res.status(500).json(response);
    }
  }
);

/**
 * GET /api/inventory/summary
 * Get inventory summary (Admin/Employee only)
 */
router.get('/summary',
  authenticateToken,
  requireRole(['admin', 'employee']),
  async (req: AuthenticatedRequest, res: express.Response) => {
    try {
      const summary = await InventoryService.getInventorySummary();

      const response: ApiResponse = {
        success: true,
        data: summary
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error('Get inventory summary error:', error);
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to retrieve inventory summary',
          timestamp: new Date().toISOString()
        }
      };
      res.status(500).json(response);
    }
  }
);

export { router as inventoryRoutes };