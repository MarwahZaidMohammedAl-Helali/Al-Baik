import express from 'express';
import { body, query, param, validationResult } from 'express-validator';
import { AuditService, AuditFilters } from '../services/auditService';
import { RefundService, RefundRequest } from '../services/refundService';
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
 * GET /api/audit/logs
 * Get audit logs with filters (Admin/Employee only)
 */
router.get('/logs',
  authenticateToken,
  requireRole(['admin', 'employee']),
  [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1-100'),
    query('eventType').optional().isIn(['transaction', 'refund', 'order', 'inventory', 'pricing', 'user', 'system']).withMessage('Invalid event type'),
    query('action').optional().isString().withMessage('Action must be string'),
    query('entityType').optional().isIn(['transaction', 'order', 'product', 'user', 'discount_code', 'inventory']).withMessage('Invalid entity type'),
    query('entityId').optional().isString().withMessage('Entity ID must be string'),
    query('userId').optional().isMongoId().withMessage('User ID must be valid'),
    query('performedBy').optional().isString().withMessage('Performed by must be string'),
    query('riskLevel').optional().isIn(['low', 'medium', 'high', 'critical']).withMessage('Invalid risk level'),
    query('startDate').optional().isISO8601().withMessage('Start date must be valid ISO date'),
    query('endDate').optional().isISO8601().withMessage('End date must be valid ISO date'),
    query('ipAddress').optional().isIP().withMessage('IP address must be valid'),
    query('tags').optional().isString().withMessage('Tags must be comma-separated string')
  ],
  async (req: AuthenticatedRequest, res: express.Response) => {
    try {
      if (handleValidationErrors(req, res)) return;

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;

      const filters: AuditFilters = {};
      
      if (req.query.eventType) filters.eventType = req.query.eventType as any;
      if (req.query.action) filters.action = req.query.action as string;
      if (req.query.entityType) filters.entityType = req.query.entityType as any;
      if (req.query.entityId) filters.entityId = req.query.entityId as string;
      if (req.query.userId) filters.userId = req.query.userId as string;
      if (req.query.performedBy) filters.performedBy = req.query.performedBy as string;
      if (req.query.riskLevel) filters.riskLevel = req.query.riskLevel as any;
      if (req.query.startDate) filters.startDate = new Date(req.query.startDate as string);
      if (req.query.endDate) filters.endDate = new Date(req.query.endDate as string);
      if (req.query.ipAddress) filters.ipAddress = req.query.ipAddress as string;
      if (req.query.tags) filters.tags = (req.query.tags as string).split(',').map(tag => tag.trim());

      const result = await AuditService.getAuditLogs(filters, page, limit);

      const response: ApiResponse = {
        success: true,
        data: result.logs,
        pagination: {
          page: result.page,
          limit,
          total: result.total,
          totalPages: result.totalPages
        }
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error('Get audit logs error:', error);
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to retrieve audit logs',
          timestamp: new Date().toISOString()
        }
      };
      res.status(500).json(response);
    }
  }
);

/**
 * GET /api/audit/reports/summary
 * Generate comprehensive audit report (Admin only)
 */
router.get('/reports/summary',
  authenticateToken,
  requireRole(['admin']),
  [
    query('eventType').optional().isIn(['transaction', 'refund', 'order', 'inventory', 'pricing', 'user', 'system']).withMessage('Invalid event type'),
    query('action').optional().isString().withMessage('Action must be string'),
    query('entityType').optional().isIn(['transaction', 'order', 'product', 'user', 'discount_code', 'inventory']).withMessage('Invalid entity type'),
    query('userId').optional().isMongoId().withMessage('User ID must be valid'),
    query('riskLevel').optional().isIn(['low', 'medium', 'high', 'critical']).withMessage('Invalid risk level'),
    query('startDate').optional().isISO8601().withMessage('Start date must be valid ISO date'),
    query('endDate').optional().isISO8601().withMessage('End date must be valid ISO date'),
    query('limit').optional().isInt({ min: 1, max: 5000 }).withMessage('Limit must be 1-5000')
  ],
  async (req: AuthenticatedRequest, res: express.Response) => {
    try {
      if (handleValidationErrors(req, res)) return;

      const filters: AuditFilters = {};
      
      if (req.query.eventType) filters.eventType = req.query.eventType as any;
      if (req.query.action) filters.action = req.query.action as string;
      if (req.query.entityType) filters.entityType = req.query.entityType as any;
      if (req.query.userId) filters.userId = req.query.userId as string;
      if (req.query.riskLevel) filters.riskLevel = req.query.riskLevel as any;
      if (req.query.startDate) filters.startDate = new Date(req.query.startDate as string);
      if (req.query.endDate) filters.endDate = new Date(req.query.endDate as string);

      const limit = parseInt(req.query.limit as string) || 1000;

      const report = await AuditService.generateAuditReport(filters, limit);

      const response: ApiResponse = {
        success: true,
        data: report
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error('Generate audit report error:', error);
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to generate audit report',
          timestamp: new Date().toISOString()
        }
      };
      res.status(500).json(response);
    }
  }
);

/**
 * GET /api/audit/entity/:entityType/:entityId
 * Get audit trail for a specific entity (Admin/Employee only)
 */
router.get('/entity/:entityType/:entityId',
  authenticateToken,
  requireRole(['admin', 'employee']),
  [
    param('entityType').isIn(['transaction', 'order', 'product', 'user', 'discount_code', 'inventory']).withMessage('Invalid entity type'),
    param('entityId').notEmpty().withMessage('Entity ID is required'),
    query('limit').optional().isInt({ min: 1, max: 500 }).withMessage('Limit must be 1-500')
  ],
  async (req: AuthenticatedRequest, res: express.Response) => {
    try {
      if (handleValidationErrors(req, res)) return;

      const { entityType, entityId } = req.params;
      const limit = parseInt(req.query.limit as string) || 100;

      if (!entityId) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'INVALID_ENTITY_ID',
            message: 'Entity ID is required',
            timestamp: new Date().toISOString()
          }
        };
        res.status(400).json(response);
        return;
      }

      const auditTrail = await AuditService.getEntityAuditTrail(
        entityType as any,
        entityId,
        limit
      );

      const response: ApiResponse = {
        success: true,
        data: auditTrail
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error('Get entity audit trail error:', error);
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to retrieve entity audit trail',
          timestamp: new Date().toISOString()
        }
      };
      res.status(500).json(response);
    }
  }
);

/**
 * POST /api/audit/refunds/validate
 * Validate a refund request before processing (Admin only)
 */
router.post('/refunds/validate',
  authenticateToken,
  requireRole(['admin']),
  [
    body('transactionId').isMongoId().withMessage('Valid transaction ID is required'),
    body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be positive'),
    body('reason').notEmpty().withMessage('Reason is required'),
    body('refundType').isIn(['full', 'partial', 'item_specific']).withMessage('Invalid refund type'),
    body('refundedBy').notEmpty().withMessage('Refunded by is required'),
    body('itemRefunds').optional().isArray().withMessage('Item refunds must be array'),
    body('itemRefunds.*.productId').optional().isString().withMessage('Product ID must be string'),
    body('itemRefunds.*.quantity').optional().isInt({ min: 1 }).withMessage('Quantity must be positive'),
    body('itemRefunds.*.refundAmount').optional().isFloat({ min: 0 }).withMessage('Refund amount must be non-negative'),
    body('restockItems').optional().isBoolean().withMessage('Restock items must be boolean'),
    body('notifyCustomer').optional().isBoolean().withMessage('Notify customer must be boolean'),
    body('metadata').optional().isObject().withMessage('Metadata must be object')
  ],
  async (req: AuthenticatedRequest, res: express.Response) => {
    try {
      if (handleValidationErrors(req, res)) return;

      const refundRequest: RefundRequest = {
        transactionId: req.body.transactionId,
        amount: req.body.amount,
        reason: req.body.reason,
        refundType: req.body.refundType,
        refundedBy: req.body.refundedBy,
        itemRefunds: req.body.itemRefunds,
        restockItems: req.body.restockItems,
        notifyCustomer: req.body.notifyCustomer,
        metadata: req.body.metadata
      };

      const validation = await RefundService.validateRefundRequest(refundRequest);

      const response: ApiResponse = {
        success: true,
        data: validation
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error('Validate refund request error:', error);
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to validate refund request',
          timestamp: new Date().toISOString()
        }
      };
      res.status(500).json(response);
    }
  }
);

/**
 * POST /api/audit/refunds/process
 * Process a comprehensive refund (Admin only)
 */
router.post('/refunds/process',
  authenticateToken,
  requireRole(['admin']),
  [
    body('transactionId').isMongoId().withMessage('Valid transaction ID is required'),
    body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be positive'),
    body('reason').notEmpty().withMessage('Reason is required'),
    body('refundType').isIn(['full', 'partial', 'item_specific']).withMessage('Invalid refund type'),
    body('refundedBy').notEmpty().withMessage('Refunded by is required'),
    body('itemRefunds').optional().isArray().withMessage('Item refunds must be array'),
    body('itemRefunds.*.productId').optional().isString().withMessage('Product ID must be string'),
    body('itemRefunds.*.quantity').optional().isInt({ min: 1 }).withMessage('Quantity must be positive'),
    body('itemRefunds.*.refundAmount').optional().isFloat({ min: 0 }).withMessage('Refund amount must be non-negative'),
    body('restockItems').optional().isBoolean().withMessage('Restock items must be boolean'),
    body('notifyCustomer').optional().isBoolean().withMessage('Notify customer must be boolean'),
    body('metadata').optional().isObject().withMessage('Metadata must be object')
  ],
  async (req: AuthenticatedRequest, res: express.Response) => {
    try {
      if (handleValidationErrors(req, res)) return;

      const refundRequest: RefundRequest = {
        transactionId: req.body.transactionId,
        amount: req.body.amount,
        reason: req.body.reason,
        refundType: req.body.refundType,
        refundedBy: req.body.refundedBy,
        itemRefunds: req.body.itemRefunds,
        restockItems: req.body.restockItems,
        notifyCustomer: req.body.notifyCustomer,
        metadata: req.body.metadata
      };

      const ipAddress = req.ip;
      const userAgent = req.get('User-Agent');
      const sessionId = req.headers['x-session-id'] as string || 'unknown';

      const result = await RefundService.processRefund(
        refundRequest,
        ipAddress,
        userAgent,
        sessionId
      );

      if (!result.success) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: result.errorCode || 'REFUND_PROCESSING_FAILED',
            message: result.errorMessage || 'Failed to process refund',
            timestamp: new Date().toISOString()
          }
        };
        res.status(400).json(response);
        return;
      }

      const response: ApiResponse = {
        success: true,
        data: {
          refund: result.refund,
          transaction: result.transaction,
          inventoryUpdates: result.inventoryUpdates
        }
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error('Process refund error:', error);
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to process refund',
          timestamp: new Date().toISOString()
        }
      };
      res.status(500).json(response);
    }
  }
);

/**
 * GET /api/audit/refunds/reports
 * Generate refund report (Admin/Employee only)
 */
router.get('/refunds/reports',
  authenticateToken,
  requireRole(['admin', 'employee']),
  [
    query('startDate').optional().isISO8601().withMessage('Start date must be valid ISO date'),
    query('endDate').optional().isISO8601().withMessage('End date must be valid ISO date'),
    query('refundedBy').optional().isString().withMessage('Refunded by must be string'),
    query('minAmount').optional().isFloat({ min: 0 }).withMessage('Min amount must be non-negative'),
    query('maxAmount').optional().isFloat({ min: 0 }).withMessage('Max amount must be non-negative'),
    query('reason').optional().isString().withMessage('Reason must be string'),
    query('limit').optional().isInt({ min: 1, max: 5000 }).withMessage('Limit must be 1-5000')
  ],
  async (req: AuthenticatedRequest, res: express.Response) => {
    try {
      if (handleValidationErrors(req, res)) return;

      const filters = {
        ...(req.query.startDate && { startDate: new Date(req.query.startDate as string) }),
        ...(req.query.endDate && { endDate: new Date(req.query.endDate as string) }),
        ...(req.query.refundedBy && { refundedBy: req.query.refundedBy as string }),
        ...(req.query.minAmount && { minAmount: parseFloat(req.query.minAmount as string) }),
        ...(req.query.maxAmount && { maxAmount: parseFloat(req.query.maxAmount as string) }),
        ...(req.query.reason && { reason: req.query.reason as string })
      };

      const limit = parseInt(req.query.limit as string) || 1000;

      const report = await RefundService.generateRefundReport(filters, limit);

      const response: ApiResponse = {
        success: true,
        data: report
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error('Generate refund report error:', error);
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to generate refund report',
          timestamp: new Date().toISOString()
        }
      };
      res.status(500).json(response);
    }
  }
);

/**
 * GET /api/audit/refunds/statistics
 * Get refund statistics for dashboard (Admin/Employee only)
 */
router.get('/refunds/statistics',
  authenticateToken,
  requireRole(['admin', 'employee']),
  [
    query('timeframe').optional().isIn(['day', 'week', 'month', 'year']).withMessage('Invalid timeframe')
  ],
  async (req: AuthenticatedRequest, res: express.Response) => {
    try {
      if (handleValidationErrors(req, res)) return;

      const timeframe = (req.query.timeframe as 'day' | 'week' | 'month' | 'year') || 'month';

      const statistics = await RefundService.getRefundStatistics(timeframe);

      const response: ApiResponse = {
        success: true,
        data: statistics
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error('Get refund statistics error:', error);
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to retrieve refund statistics',
          timestamp: new Date().toISOString()
        }
      };
      res.status(500).json(response);
    }
  }
);

/**
 * GET /api/audit/refunds/transaction/:transactionId
 * Get refund history for a specific transaction (Admin/Employee only)
 */
router.get('/refunds/transaction/:transactionId',
  authenticateToken,
  requireRole(['admin', 'employee']),
  [
    param('transactionId').isMongoId().withMessage('Valid transaction ID is required')
  ],
  async (req: AuthenticatedRequest, res: express.Response) => {
    try {
      if (handleValidationErrors(req, res)) return;

      const { transactionId } = req.params;

      if (!transactionId) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'INVALID_TRANSACTION_ID',
            message: 'Transaction ID is required',
            timestamp: new Date().toISOString()
          }
        };
        res.status(400).json(response);
        return;
      }

      const refunds = await RefundService.getTransactionRefunds(transactionId);

      const response: ApiResponse = {
        success: true,
        data: refunds
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error('Get transaction refunds error:', error);
      
      let statusCode = 500;
      let errorCode = 'INTERNAL_SERVER_ERROR';
      let message = 'Failed to retrieve transaction refunds';

      if ((error as Error).message.includes('not found')) {
        statusCode = 404;
        errorCode = 'TRANSACTION_NOT_FOUND';
        message = 'Transaction not found';
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

export { router as auditRoutes };