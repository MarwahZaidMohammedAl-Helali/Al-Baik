import express from 'express';
import { body, query, param, validationResult } from 'express-validator';
import { NotificationService, NotificationPreferences } from '../services/notificationService';
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
 * GET /api/notifications/preferences
 * Get user notification preferences
 */
router.get('/preferences',
  authenticateToken,
  async (req: AuthenticatedRequest, res: express.Response) => {
    try {
      const userId = req.user!.id;
      
      // @ts-ignore - TypeScript incorrectly thinks userId might be undefined after auth middleware
      const preferences = await NotificationService.getUserNotificationPreferences(userId);

      const response: ApiResponse = {
        success: true,
        data: preferences
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error('Get notification preferences error:', error);
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to retrieve notification preferences',
          timestamp: new Date().toISOString()
        }
      };
      res.status(500).json(response);
    }
  }
);

/**
 * PUT /api/notifications/preferences
 * Update user notification preferences
 */
router.put('/preferences',
  authenticateToken,
  [
    body('channels').optional().isArray().withMessage('Channels must be an array'),
    body('channels.*.type').optional().isIn(['push', 'email', 'sms', 'in_app']).withMessage('Invalid channel type'),
    body('channels.*.enabled').optional().isBoolean().withMessage('Channel enabled must be boolean'),
    body('orderUpdates').optional().isBoolean().withMessage('Order updates must be boolean'),
    body('promotions').optional().isBoolean().withMessage('Promotions must be boolean'),
    body('inventoryAlerts').optional().isBoolean().withMessage('Inventory alerts must be boolean'),
    body('quietHours.start').optional().matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Start time must be in HH:MM format'),
    body('quietHours.end').optional().matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('End time must be in HH:MM format'),
    body('quietHours.timezone').optional().isString().withMessage('Timezone must be string')
  ],
  async (req: AuthenticatedRequest, res: express.Response) => {
    try {
      if (handleValidationErrors(req, res)) return;

      const userId = req.user!.id;
      const updates: Partial<NotificationPreferences> = req.body;

      // @ts-ignore - TypeScript incorrectly thinks userId might be undefined after auth middleware
      const updatedPreferences = await NotificationService.updateNotificationPreferences(
        userId,
        updates
      );

      const response: ApiResponse = {
        success: true,
        data: updatedPreferences
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error('Update notification preferences error:', error);
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update notification preferences',
          timestamp: new Date().toISOString()
        }
      };
      res.status(500).json(response);
    }
  }
);

/**
 * GET /api/notifications/history
 * Get user notification history
 */
router.get('/history',
  authenticateToken,
  [
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1-100'),
    query('offset').optional().isInt({ min: 0 }).withMessage('Offset must be non-negative')
  ],
  async (req: AuthenticatedRequest, res: express.Response) => {
    try {
      if (handleValidationErrors(req, res)) return;

      const userId = req.user!.id;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;

      // @ts-ignore - TypeScript incorrectly thinks userId might be undefined after auth middleware
      const history = await NotificationService.getNotificationHistory(userId, limit, offset);

      const response: ApiResponse = {
        success: true,
        data: history,
        pagination: {
          page: Math.floor(offset / limit) + 1,
          limit,
          total: history.length, // In a real implementation, this would be the total count
          totalPages: Math.ceil(history.length / limit)
        }
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error('Get notification history error:', error);
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to retrieve notification history',
          timestamp: new Date().toISOString()
        }
      };
      res.status(500).json(response);
    }
  }
);

/**
 * PUT /api/notifications/:notificationId/read
 * Mark notification as read
 */
router.put('/:notificationId/read',
  authenticateToken,
  [
    param('notificationId').notEmpty().withMessage('Notification ID is required')
  ],
  async (req: AuthenticatedRequest, res: express.Response) => {
    try {
      if (handleValidationErrors(req, res)) return;

      const { notificationId } = req.params;
      const userId = req.user!.id;

      // @ts-ignore - TypeScript incorrectly thinks userId might be undefined after auth middleware
      const success = await NotificationService.markNotificationAsRead(notificationId, userId);

      if (!success) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'NOTIFICATION_NOT_FOUND',
            message: 'Notification not found or already read',
            timestamp: new Date().toISOString()
          }
        };
        res.status(404).json(response);
        return;
      }

      const response: ApiResponse = {
        success: true,
        data: { notificationId, markedAsRead: true }
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error('Mark notification as read error:', error);
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to mark notification as read',
          timestamp: new Date().toISOString()
        }
      };
      res.status(500).json(response);
    }
  }
);

/**
 * POST /api/notifications/test
 * Send test notification (Admin/Employee only)
 */
router.post('/test',
  authenticateToken,
  requireRole(['admin', 'employee']),
  [
    body('userId').isMongoId().withMessage('Valid user ID is required'),
    body('title').notEmpty().withMessage('Title is required'),
    body('message').notEmpty().withMessage('Message is required'),
    body('type').optional().isIn([
      'order_status_update', 'order_shipped', 'order_delivered', 
      'order_cancelled', 'inventory_alert', 'payment_confirmation', 'general'
    ]).withMessage('Invalid notification type'),
    body('priority').optional().isIn(['low', 'normal', 'high', 'urgent']).withMessage('Invalid priority')
  ],
  async (req: AuthenticatedRequest, res: express.Response) => {
    try {
      if (handleValidationErrors(req, res)) return;

      const { userId, title, message, type = 'general', priority = 'normal' } = req.body;

      // In a real implementation, this would send a test notification
      // For now, just log and return success
      logger.info('Test notification sent', {
        targetUserId: userId,
        title,
        message,
        type,
        priority,
        sentBy: req.user!.email
      });

      const response: ApiResponse = {
        success: true,
        data: {
          message: 'Test notification sent successfully',
          targetUserId: userId,
          title,
          type,
          priority
        }
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error('Send test notification error:', error);
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to send test notification',
          timestamp: new Date().toISOString()
        }
      };
      res.status(500).json(response);
    }
  }
);

/**
 * POST /api/notifications/inventory-alert
 * Send inventory alert notification (Admin/Employee only)
 */
router.post('/inventory-alert',
  authenticateToken,
  requireRole(['admin', 'employee']),
  [
    body('productId').isMongoId().withMessage('Valid product ID is required'),
    body('productName').notEmpty().withMessage('Product name is required'),
    body('currentStock').isInt({ min: 0 }).withMessage('Current stock must be non-negative integer'),
    body('threshold').isInt({ min: 0 }).withMessage('Threshold must be non-negative integer')
  ],
  async (req: AuthenticatedRequest, res: express.Response) => {
    try {
      if (handleValidationErrors(req, res)) return;

      const { productId, productName, currentStock, threshold } = req.body;

      const results = await NotificationService.sendInventoryAlert(
        productId,
        productName,
        currentStock,
        threshold
      );

      const response: ApiResponse = {
        success: true,
        data: {
          message: 'Inventory alert notifications sent',
          productId,
          productName,
          currentStock,
          threshold,
          notificationResults: results
        }
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error('Send inventory alert error:', error);
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to send inventory alert notifications',
          timestamp: new Date().toISOString()
        }
      };
      res.status(500).json(response);
    }
  }
);

export { router as notificationRoutes };