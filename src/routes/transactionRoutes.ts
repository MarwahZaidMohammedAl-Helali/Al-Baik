import express from 'express';
import { body, query, param, validationResult } from 'express-validator';
import { TransactionService, CreateTransactionData, RefundRequest, TransactionFilters } from '../services/transactionService';
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
 * POST /api/transactions
 * Create a new transaction from an order (Admin/Employee only)
 */
router.post('/',
  authenticateToken,
  requireRole(['admin', 'employee']),
  [
    body('orderId').isMongoId().withMessage('Valid order ID is required'),
    body('userId').isMongoId().withMessage('Valid user ID is required'),
    body('paymentMethod').isIn(['credit_card', 'debit_card', 'paypal', 'bank_transfer', 'cash_on_delivery']).withMessage('Valid payment method is required'),
    body('paymentProvider').notEmpty().withMessage('Payment provider is required'),
    body('amount').isFloat({ min: 0 }).withMessage('Amount must be non-negative'),
    body('taxAmount').isFloat({ min: 0 }).withMessage('Tax amount must be non-negative'),
    body('shippingAmount').isFloat({ min: 0 }).withMessage('Shipping amount must be non-negative'),
    body('discountAmount').isFloat({ min: 0 }).withMessage('Discount amount must be non-negative'),
    body('currency').optional().isLength({ min: 3, max: 3 }).withMessage('Currency must be 3 characters'),
    body('metadata').optional().isObject().withMessage('Metadata must be an object')
  ],
  async (req: AuthenticatedRequest, res: express.Response) => {
    try {
      if (handleValidationErrors(req, res)) return;

      const transactionData: CreateTransactionData = {
        orderId: req.body.orderId,
        userId: req.body.userId,
        paymentMethod: req.body.paymentMethod,
        paymentProvider: req.body.paymentProvider,
        amount: req.body.amount,
        taxAmount: req.body.taxAmount,
        shippingAmount: req.body.shippingAmount,
        discountAmount: req.body.discountAmount,
        currency: req.body.currency,
        metadata: req.body.metadata
      };

      const performedBy = req.user!.email;
      const ipAddress = req.ip;
      const userAgent = req.get('User-Agent');

      // @ts-ignore - TypeScript incorrectly thinks performedBy might be undefined after auth middleware
      const transaction = await TransactionService.createTransaction(
        transactionData,
        performedBy,
        ipAddress,
        userAgent
      );

      const response: ApiResponse = {
        success: true,
        data: transaction
      };

      res.status(201).json(response);
    } catch (error) {
      logger.error('Create transaction error:', error);
      
      let statusCode = 500;
      let errorCode = 'INTERNAL_SERVER_ERROR';
      let message = 'Failed to create transaction';

      if ((error as Error).message.includes('not found')) {
        statusCode = 404;
        errorCode = 'RESOURCE_NOT_FOUND';
        message = (error as Error).message;
      } else if ((error as Error).message.includes('already exists')) {
        statusCode = 409;
        errorCode = 'TRANSACTION_EXISTS';
        message = (error as Error).message;
      } else if ((error as Error).message.includes('must be confirmed')) {
        statusCode = 400;
        errorCode = 'INVALID_ORDER_STATUS';
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
 * POST /api/transactions/:transactionId/process
 * Process payment for a transaction (Admin/Employee only)
 */
router.post('/:transactionId/process',
  authenticateToken,
  requireRole(['admin', 'employee']),
  [
    param('transactionId').isMongoId().withMessage('Valid transaction ID is required')
  ],
  async (req: AuthenticatedRequest, res: express.Response) => {
    try {
      if (handleValidationErrors(req, res)) return;

      const { transactionId } = req.params;
      const performedBy = req.user!.email;
      const ipAddress = req.ip;
      const userAgent = req.get('User-Agent');

      // @ts-ignore - TypeScript incorrectly thinks performedBy might be undefined after auth middleware
      const transaction = await TransactionService.processPayment(
        transactionId,
        performedBy,
        ipAddress,
        userAgent
      );

      const response: ApiResponse = {
        success: true,
        data: transaction
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error('Process payment error:', error);
      
      let statusCode = 500;
      let errorCode = 'INTERNAL_SERVER_ERROR';
      let message = 'Failed to process payment';

      if ((error as Error).message.includes('not found')) {
        statusCode = 404;
        errorCode = 'TRANSACTION_NOT_FOUND';
        message = 'Transaction not found';
      } else if ((error as Error).message.includes('Cannot process payment')) {
        statusCode = 400;
        errorCode = 'INVALID_TRANSACTION_STATUS';
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
 * POST /api/transactions/:transactionId/refund
 * Process refund for a transaction (Admin only)
 */
router.post('/:transactionId/refund',
  authenticateToken,
  requireRole(['admin']),
  [
    param('transactionId').isMongoId().withMessage('Valid transaction ID is required'),
    body('amount').isFloat({ min: 0.01 }).withMessage('Refund amount must be positive'),
    body('reason').notEmpty().withMessage('Refund reason is required'),
    body('metadata').optional().isObject().withMessage('Metadata must be an object')
  ],
  async (req: AuthenticatedRequest, res: express.Response) => {
    try {
      if (handleValidationErrors(req, res)) return;

      const { transactionId } = req.params;
      const { amount, reason, metadata } = req.body;
      
      const refundRequest: RefundRequest = {
        transactionId,
        amount,
        reason,
        refundedBy: req.user!.email as string,
        metadata
      };

      const performedBy = req.user!.email;
      const ipAddress = req.ip;
      const userAgent = req.get('User-Agent');

      // @ts-ignore - TypeScript incorrectly thinks performedBy might be undefined after auth middleware
      const transaction = await TransactionService.processRefund(
        refundRequest,
        performedBy,
        ipAddress,
        userAgent
      );

      const response: ApiResponse = {
        success: true,
        data: transaction
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error('Process refund error:', error);
      
      let statusCode = 500;
      let errorCode = 'INTERNAL_SERVER_ERROR';
      let message = 'Failed to process refund';

      if ((error as Error).message.includes('not found')) {
        statusCode = 404;
        errorCode = 'TRANSACTION_NOT_FOUND';
        message = 'Transaction not found';
      } else if ((error as Error).message.includes('cannot be refunded')) {
        statusCode = 400;
        errorCode = 'REFUND_NOT_ALLOWED';
        message = (error as Error).message;
      } else if ((error as Error).message.includes('exceeds refundable amount')) {
        statusCode = 400;
        errorCode = 'INVALID_REFUND_AMOUNT';
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
 * GET /api/transactions
 * Get transactions with filters (Admin/Employee see all, Customers see their own)
 */
router.get('/',
  authenticateToken,
  [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1-100'),
    query('status').optional().isIn(['pending', 'authorized', 'captured', 'completed', 'failed', 'cancelled', 'refunded', 'partially_refunded']).withMessage('Invalid status'),
    query('orderStatus').optional().isIn(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled']).withMessage('Invalid order status'),
    query('paymentMethod').optional().isIn(['credit_card', 'debit_card', 'paypal', 'bank_transfer', 'cash_on_delivery']).withMessage('Invalid payment method'),
    query('paymentProvider').optional().isString().withMessage('Payment provider must be string'),
    query('startDate').optional().isISO8601().withMessage('Start date must be valid ISO date'),
    query('endDate').optional().isISO8601().withMessage('End date must be valid ISO date'),
    query('minAmount').optional().isFloat({ min: 0 }).withMessage('Min amount must be non-negative'),
    query('maxAmount').optional().isFloat({ min: 0 }).withMessage('Max amount must be non-negative'),
    query('userId').optional().isMongoId().withMessage('User ID must be valid')
  ],
  async (req: AuthenticatedRequest, res: express.Response) => {
    try {
      if (handleValidationErrors(req, res)) return;

      const user = req.user!;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      const filters: TransactionFilters = {};

      // For customers, only show their own transactions
      if (user.role === 'customer') {
        filters.userId = user.id;
      } else {
        // For admin/employee, allow filtering by user
        if (req.query.userId) filters.userId = req.query.userId as string;
      }

      if (req.query.status) filters.status = req.query.status as any;
      if (req.query.orderStatus) filters.orderStatus = req.query.orderStatus as any;
      if (req.query.paymentMethod) filters.paymentMethod = req.query.paymentMethod as any;
      if (req.query.paymentProvider) filters.paymentProvider = req.query.paymentProvider as string;
      if (req.query.startDate) filters.startDate = new Date(req.query.startDate as string);
      if (req.query.endDate) filters.endDate = new Date(req.query.endDate as string);
      if (req.query.minAmount) filters.minAmount = parseFloat(req.query.minAmount as string);
      if (req.query.maxAmount) filters.maxAmount = parseFloat(req.query.maxAmount as string);

      const result = await TransactionService.getTransactions(filters, page, limit);

      const response: ApiResponse = {
        success: true,
        data: result.transactions,
        pagination: {
          page: result.page,
          limit,
          total: result.total,
          totalPages: result.totalPages
        }
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error('Get transactions error:', error);
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to retrieve transactions',
          timestamp: new Date().toISOString()
        }
      };
      res.status(500).json(response);
    }
  }
);

/**
 * GET /api/transactions/:transactionId
 * Get transaction by ID
 */
router.get('/:transactionId',
  authenticateToken,
  [
    param('transactionId').isMongoId().withMessage('Valid transaction ID is required')
  ],
  async (req: AuthenticatedRequest, res: express.Response) => {
    try {
      if (handleValidationErrors(req, res)) return;

      const { transactionId } = req.params;
      const user = req.user!;

      const transaction = await TransactionService.getTransactionById(transactionId);

      if (!transaction) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'TRANSACTION_NOT_FOUND',
            message: 'Transaction not found',
            timestamp: new Date().toISOString()
          }
        };
        res.status(404).json(response);
        return;
      }

      // For customers, only allow access to their own transactions
      if (user.role === 'customer' && transaction.userId.toString() !== user.id) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'ACCESS_DENIED',
            message: 'You can only access your own transactions',
            timestamp: new Date().toISOString()
          }
        };
        res.status(403).json(response);
        return;
      }

      const response: ApiResponse = {
        success: true,
        data: transaction
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error('Get transaction by ID error:', error);
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to retrieve transaction',
          timestamp: new Date().toISOString()
        }
      };
      res.status(500).json(response);
    }
  }
);

/**
 * GET /api/transactions/number/:transactionNumber
 * Get transaction by transaction number
 */
router.get('/number/:transactionNumber',
  authenticateToken,
  [
    param('transactionNumber').notEmpty().withMessage('Transaction number is required')
  ],
  async (req: AuthenticatedRequest, res: express.Response) => {
    try {
      if (handleValidationErrors(req, res)) return;

      const { transactionNumber } = req.params;
      const user = req.user!;

      const transaction = await TransactionService.getTransactionByNumber(transactionNumber);

      if (!transaction) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'TRANSACTION_NOT_FOUND',
            message: 'Transaction not found',
            timestamp: new Date().toISOString()
          }
        };
        res.status(404).json(response);
        return;
      }

      // For customers, only allow access to their own transactions
      if (user.role === 'customer' && transaction.userId.toString() !== user.id) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'ACCESS_DENIED',
            message: 'You can only access your own transactions',
            timestamp: new Date().toISOString()
          }
        };
        res.status(403).json(response);
        return;
      }

      const response: ApiResponse = {
        success: true,
        data: transaction
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error('Get transaction by number error:', error);
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to retrieve transaction',
          timestamp: new Date().toISOString()
        }
      };
      res.status(500).json(response);
    }
  }
);

/**
 * GET /api/transactions/reports/summary
 * Generate transaction report (Admin/Employee only)
 */
router.get('/reports/summary',
  authenticateToken,
  requireRole(['admin', 'employee']),
  [
    query('startDate').optional().isISO8601().withMessage('Start date must be valid ISO date'),
    query('endDate').optional().isISO8601().withMessage('End date must be valid ISO date'),
    query('status').optional().isIn(['pending', 'authorized', 'captured', 'completed', 'failed', 'cancelled', 'refunded', 'partially_refunded']).withMessage('Invalid status'),
    query('paymentMethod').optional().isIn(['credit_card', 'debit_card', 'paypal', 'bank_transfer', 'cash_on_delivery']).withMessage('Invalid payment method'),
    query('paymentProvider').optional().isString().withMessage('Payment provider must be string'),
    query('limit').optional().isInt({ min: 1, max: 1000 }).withMessage('Limit must be 1-1000')
  ],
  async (req: AuthenticatedRequest, res: express.Response) => {
    try {
      if (handleValidationErrors(req, res)) return;

      const filters: TransactionFilters = {};
      
      if (req.query.startDate) filters.startDate = new Date(req.query.startDate as string);
      if (req.query.endDate) filters.endDate = new Date(req.query.endDate as string);
      if (req.query.status) filters.status = req.query.status as any;
      if (req.query.paymentMethod) filters.paymentMethod = req.query.paymentMethod as any;
      if (req.query.paymentProvider) filters.paymentProvider = req.query.paymentProvider as string;

      const limit = parseInt(req.query.limit as string) || 100;

      const report = await TransactionService.generateTransactionReport(filters, limit);

      const response: ApiResponse = {
        success: true,
        data: report
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error('Generate transaction report error:', error);
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to generate transaction report',
          timestamp: new Date().toISOString()
        }
      };
      res.status(500).json(response);
    }
  }
);

export { router as transactionRoutes };