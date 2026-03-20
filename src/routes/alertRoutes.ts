import express from 'express';
import { query, param, validationResult } from 'express-validator';
import { AlertService } from '../services/alertService';
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
 * GET /api/alerts
 * Get alerts for current user's role (Admin/Employee only)
 */
router.get('/',
  authenticateToken,
  requireRole(['admin', 'employee']),
  async (req: AuthenticatedRequest, res: express.Response) => {
    try {
      const userRole = req.user!.role as 'admin' | 'employee';
      const roles: ('admin' | 'employee')[] = userRole === 'admin' ? ['admin', 'employee'] : ['employee'];
      
      const alerts = await AlertService.getAlertsForRoles(roles);

      const response: ApiResponse = {
        success: true,
        data: {
          alerts,
          total: alerts.length,
          unread: alerts.filter(alert => !alert.readBy.includes(req.user!.id)).length
        }
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error('Get alerts error:', error);
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to retrieve alerts',
          timestamp: new Date().toISOString()
        }
      };
      res.status(500).json(response);
    }
  }
);

/**
 * PUT /api/alerts/:alertId/read
 * Mark alert as read
 */
router.put('/:alertId/read',
  authenticateToken,
  requireRole(['admin', 'employee']),
  [
    param('alertId').isString().withMessage('Alert ID is required')
  ],
  async (req: AuthenticatedRequest, res: express.Response) => {
    try {
      if (handleValidationErrors(req, res)) return;

      const { alertId } = req.params;
      const user = req.user!;
      
      if (!user.id) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'USER_ID_MISSING',
            message: 'User ID is required',
            timestamp: new Date().toISOString()
          }
        };
        res.status(400).json(response);
        return;
      }

      // @ts-ignore - TypeScript incorrectly thinks user.id might be undefined after auth middleware
      const success = await AlertService.markAlertAsRead(alertId, user.id);

      if (!success) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'ALERT_NOT_FOUND',
            message: 'Alert not found',
            timestamp: new Date().toISOString()
          }
        };
        res.status(404).json(response);
        return;
      }

      const response: ApiResponse = {
        success: true,
        data: {
          alertId,
          markedAsRead: true
        }
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error('Mark alert as read error:', error);
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to mark alert as read',
          timestamp: new Date().toISOString()
        }
      };
      res.status(500).json(response);
    }
  }
);

/**
 * DELETE /api/alerts/:alertId
 * Dismiss alert (Admin only)
 */
router.delete('/:alertId',
  authenticateToken,
  requireRole(['admin']),
  [
    param('alertId').isString().withMessage('Alert ID is required')
  ],
  async (req: AuthenticatedRequest, res: express.Response) => {
    try {
      if (handleValidationErrors(req, res)) return;

      const { alertId } = req.params;
      const user = req.user!;
      
      if (!user.email) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'USER_EMAIL_MISSING',
            message: 'User email is required',
            timestamp: new Date().toISOString()
          }
        };
        res.status(400).json(response);
        return;
      }

      // @ts-ignore - TypeScript incorrectly thinks user.email might be undefined after auth middleware
      const success = await AlertService.dismissAlert(alertId, user.email);

      if (!success) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'ALERT_NOT_FOUND',
            message: 'Alert not found',
            timestamp: new Date().toISOString()
          }
        };
        res.status(404).json(response);
        return;
      }

      const response: ApiResponse = {
        success: true,
        data: {
          alertId,
          dismissed: true
        }
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error('Dismiss alert error:', error);
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to dismiss alert',
          timestamp: new Date().toISOString()
        }
      };
      res.status(500).json(response);
    }
  }
);

/**
 * GET /api/alerts/stats
 * Get alert statistics (Admin/Employee only)
 */
router.get('/stats',
  authenticateToken,
  requireRole(['admin', 'employee']),
  async (req: AuthenticatedRequest, res: express.Response) => {
    try {
      const stats = await AlertService.getAlertStats();

      const response: ApiResponse = {
        success: true,
        data: stats
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error('Get alert stats error:', error);
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to retrieve alert statistics',
          timestamp: new Date().toISOString()
        }
      };
      res.status(500).json(response);
    }
  }
);

/**
 * POST /api/alerts/inventory/monitor
 * Trigger inventory monitoring and alert generation (Admin/Employee only)
 */
router.post('/inventory/monitor',
  authenticateToken,
  requireRole(['admin', 'employee']),
  async (req: AuthenticatedRequest, res: express.Response) => {
    try {
      const monitoringResult = await InventoryService.monitorInventoryLevels();

      const response: ApiResponse = {
        success: true,
        data: {
          message: 'Inventory monitoring completed',
          ...monitoringResult
        }
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error('Inventory monitoring error:', error);
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to monitor inventory levels',
          timestamp: new Date().toISOString()
        }
      };
      res.status(500).json(response);
    }
  }
);

/**
 * POST /api/alerts/cleanup
 * Clean up old alerts (Admin only)
 */
router.post('/cleanup',
  authenticateToken,
  requireRole(['admin']),
  async (req: AuthenticatedRequest, res: express.Response) => {
    try {
      const removedCount = await AlertService.cleanupOldAlerts();

      const response: ApiResponse = {
        success: true,
        data: {
          message: 'Alert cleanup completed',
          removedCount
        }
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error('Alert cleanup error:', error);
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to cleanup old alerts',
          timestamp: new Date().toISOString()
        }
      };
      res.status(500).json(response);
    }
  }
);

/**
 * POST /api/alerts/inventory/validate-order
 * Validate order quantities to prevent overselling
 */
router.post('/inventory/validate-order',
  authenticateToken,
  [
    query('items').isArray({ min: 1 }).withMessage('Items array is required'),
    query('items.*.productId').isMongoId().withMessage('Valid product ID is required'),
    query('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be positive'),
    query('orderReference').optional().isString().withMessage('Order reference must be string')
  ],
  async (req: AuthenticatedRequest, res: express.Response) => {
    try {
      if (handleValidationErrors(req, res)) return;

      const { items, orderReference } = req.body;
      const userId = req.user!.id;

      const validation = await InventoryService.validateOrderQuantities(
        items,
        userId,
        orderReference
      );

      const response: ApiResponse = {
        success: true,
        data: validation
      };

      // Return 409 Conflict if validation failed due to insufficient stock
      const statusCode = validation.valid ? 200 : 409;
      res.status(statusCode).json(response);
    } catch (error) {
      logger.error('Order validation error:', error);
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to validate order quantities',
          timestamp: new Date().toISOString()
        }
      };
      res.status(500).json(response);
    }
  }
);

/**
 * GET /api/alerts/inventory/oversell-stats
 * Get overselling prevention statistics (Admin only)
 */
router.get('/inventory/oversell-stats',
  authenticateToken,
  requireRole(['admin']),
  [
    query('startDate').optional().isISO8601().withMessage('Start date must be valid ISO date'),
    query('endDate').optional().isISO8601().withMessage('End date must be valid ISO date')
  ],
  async (req: AuthenticatedRequest, res: express.Response) => {
    try {
      if (handleValidationErrors(req, res)) return;

      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

      const stats = await InventoryService.getOversellPreventionStats(startDate, endDate);

      const response: ApiResponse = {
        success: true,
        data: stats
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error('Get oversell prevention stats error:', error);
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to retrieve overselling prevention statistics',
          timestamp: new Date().toISOString()
        }
      };
      res.status(500).json(response);
    }
  }
);

export { router as alertRoutes };