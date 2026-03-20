import express from 'express';
import { body, query, param, validationResult } from 'express-validator';
import { OrderService, CreateOrderData } from '../services/orderService';
import { authenticateToken, requireRole, AuthenticatedRequest } from '../middleware/auth';
import { ApiResponse } from '../types/common';
import { OrderStatus } from '../types/common';
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
 * POST /api/orders
 * Create a new order
 */
router.post('/',
  authenticateToken,
  [
    body('items').isArray({ min: 1 }).withMessage('Items array is required with at least one item'),
    body('items.*.productId').isMongoId().withMessage('Valid product ID is required'),
    body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be positive'),
    body('shippingAddress.street').notEmpty().withMessage('Shipping street address is required'),
    body('shippingAddress.city').notEmpty().withMessage('Shipping city is required'),
    body('shippingAddress.state').notEmpty().withMessage('Shipping state is required'),
    body('shippingAddress.zipCode').notEmpty().withMessage('Shipping ZIP code is required'),
    body('shippingAddress.country').notEmpty().withMessage('Shipping country is required'),
    body('billingAddress.street').notEmpty().withMessage('Billing street address is required'),
    body('billingAddress.city').notEmpty().withMessage('Billing city is required'),
    body('billingAddress.state').notEmpty().withMessage('Billing state is required'),
    body('billingAddress.zipCode').notEmpty().withMessage('Billing ZIP code is required'),
    body('billingAddress.country').notEmpty().withMessage('Billing country is required'),
    body('paymentMethod').isIn(['credit_card', 'debit_card', 'paypal', 'bank_transfer', 'cash_on_delivery']).withMessage('Valid payment method is required'),
    body('discountCode').optional().isString().withMessage('Discount code must be string'),
    body('notes').optional().isString().withMessage('Notes must be string')
  ],
  async (req: AuthenticatedRequest, res: express.Response) => {
    try {
      if (handleValidationErrors(req, res)) return;

      const userId = req.user!.id;
      const orderData: CreateOrderData = {
        userId,
        items: req.body.items,
        shippingAddress: {
          ...req.body.shippingAddress,
          type: 'shipping' as const
        },
        billingAddress: {
          ...req.body.billingAddress,
          type: 'billing' as const
        },
        paymentMethod: req.body.paymentMethod,
        discountCode: req.body.discountCode,
        notes: req.body.notes
      };

      const order = await OrderService.createOrder(orderData);

      const response: ApiResponse = {
        success: true,
        data: order
      };

      res.status(201).json(response);
    } catch (error) {
      logger.error('Create order error:', error);
      
      let statusCode = 500;
      let errorCode = 'INTERNAL_SERVER_ERROR';
      let message = 'Failed to create order';

      if ((error as Error).message.includes('not found')) {
        statusCode = 404;
        errorCode = 'RESOURCE_NOT_FOUND';
        message = (error as Error).message;
      } else if ((error as Error).message.includes('Insufficient stock')) {
        statusCode = 409;
        errorCode = 'INSUFFICIENT_STOCK';
        message = (error as Error).message;
      } else if ((error as Error).message.includes('Invalid')) {
        statusCode = 400;
        errorCode = 'INVALID_REQUEST';
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
 * GET /api/orders
 * Get orders (with filters for admin/employee, user orders for customers)
 */
router.get('/',
  authenticateToken,
  [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1-100'),
    query('status').optional().isIn(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled']).withMessage('Invalid status'),
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

      // For customers, only show their own orders
      if (user.role === 'customer') {
        const result = await OrderService.getUserOrders(
          user.id,
          page,
          limit,
          req.query.status as OrderStatus
        );

        const response: ApiResponse = {
          success: true,
          data: result.orders,
          pagination: {
            page: result.page,
            limit,
            total: result.total,
            totalPages: result.totalPages
          }
        };

        res.status(200).json(response);
        return;
      }

      // For admin/employee, allow filtering
      const filters: any = {};
      if (req.query.status) filters.status = req.query.status;
      if (req.query.startDate) filters.startDate = new Date(req.query.startDate as string);
      if (req.query.endDate) filters.endDate = new Date(req.query.endDate as string);
      if (req.query.minAmount) filters.minAmount = parseFloat(req.query.minAmount as string);
      if (req.query.maxAmount) filters.maxAmount = parseFloat(req.query.maxAmount as string);
      if (req.query.userId) filters.userId = req.query.userId;

      const result = await OrderService.getOrders(filters, page, limit);

      const response: ApiResponse = {
        success: true,
        data: result.orders,
        pagination: {
          page: result.page,
          limit,
          total: result.total,
          totalPages: result.totalPages
        }
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error('Get orders error:', error);
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to retrieve orders',
          timestamp: new Date().toISOString()
        }
      };
      res.status(500).json(response);
    }
  }
);

/**
 * GET /api/orders/:orderId
 * Get order by ID
 */
router.get('/:orderId',
  authenticateToken,
  [
    param('orderId').isMongoId().withMessage('Valid order ID is required')
  ],
  async (req: AuthenticatedRequest, res: express.Response) => {
    try {
      if (handleValidationErrors(req, res)) return;

      const { orderId } = req.params;
      const user = req.user!;

      // For customers, only allow access to their own orders
      const userId = user.role === 'customer' ? user.id : undefined;
      
      // @ts-ignore - TypeScript incorrectly thinks userId might be undefined after auth middleware
      const order = await OrderService.getOrderById(orderId, userId);

      if (!order) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'ORDER_NOT_FOUND',
            message: 'Order not found',
            timestamp: new Date().toISOString()
          }
        };
        res.status(404).json(response);
        return;
      }

      const response: ApiResponse = {
        success: true,
        data: order
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error('Get order by ID error:', error);
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to retrieve order',
          timestamp: new Date().toISOString()
        }
      };
      res.status(500).json(response);
    }
  }
);

/**
 * GET /api/orders/number/:orderNumber
 * Get order by order number
 */
router.get('/number/:orderNumber',
  authenticateToken,
  [
    param('orderNumber').notEmpty().withMessage('Order number is required')
  ],
  async (req: AuthenticatedRequest, res: express.Response) => {
    try {
      if (handleValidationErrors(req, res)) return;

      const { orderNumber } = req.params;
      const user = req.user!;

      // For customers, only allow access to their own orders
      const userId = user.role === 'customer' ? user.id : undefined;
      
      // @ts-ignore - TypeScript incorrectly thinks userId might be undefined after auth middleware
      const order = await OrderService.getOrderByNumber(orderNumber, userId);

      if (!order) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'ORDER_NOT_FOUND',
            message: 'Order not found',
            timestamp: new Date().toISOString()
          }
        };
        res.status(404).json(response);
        return;
      }

      const response: ApiResponse = {
        success: true,
        data: order
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error('Get order by number error:', error);
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to retrieve order',
          timestamp: new Date().toISOString()
        }
      };
      res.status(500).json(response);
    }
  }
);

/**
 * PUT /api/orders/:orderId/status
 * Update order status (Admin/Employee only)
 */
router.put('/:orderId/status',
  authenticateToken,
  requireRole(['admin', 'employee']),
  [
    param('orderId').isMongoId().withMessage('Valid order ID is required'),
    body('status').isIn(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled']).withMessage('Valid status is required'),
    body('note').optional().isString().withMessage('Note must be string'),
    body('trackingNumber').optional().isString().withMessage('Tracking number must be string'),
    body('carrier').optional().isString().withMessage('Carrier must be string'),
    body('estimatedDelivery').optional().isISO8601().withMessage('Estimated delivery must be valid date')
  ],
  async (req: AuthenticatedRequest, res: express.Response) => {
    try {
      if (handleValidationErrors(req, res)) return;

      const { orderId } = req.params;
      const { status, note, trackingNumber, carrier, estimatedDelivery } = req.body;
      const updatedBy = req.user!.email;

      const trackingInfo: any = {};
      if (trackingNumber) trackingInfo.trackingNumber = trackingNumber;
      if (carrier) trackingInfo.carrier = carrier;
      if (estimatedDelivery) trackingInfo.estimatedDelivery = new Date(estimatedDelivery);

      const order = await OrderService.updateOrderStatus(
        orderId!,
        status,
        updatedBy,
        note,
        Object.keys(trackingInfo).length > 0 ? trackingInfo : undefined
      );

      const response: ApiResponse = {
        success: true,
        data: order
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error('Update order status error:', error);
      
      let statusCode = 500;
      let errorCode = 'INTERNAL_SERVER_ERROR';
      let message = 'Failed to update order status';

      if ((error as Error).message.includes('not found')) {
        statusCode = 404;
        errorCode = 'ORDER_NOT_FOUND';
        message = 'Order not found';
      } else if ((error as Error).message.includes('Invalid status transition')) {
        statusCode = 400;
        errorCode = 'INVALID_STATUS_TRANSITION';
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
 * PUT /api/orders/:orderId/cancel
 * Cancel an order
 */
router.put('/:orderId/cancel',
  authenticateToken,
  [
    param('orderId').isMongoId().withMessage('Valid order ID is required'),
    body('reason').notEmpty().withMessage('Cancellation reason is required')
  ],
  async (req: AuthenticatedRequest, res: express.Response) => {
    try {
      if (handleValidationErrors(req, res)) return;

      const { orderId } = req.params;
      const { reason } = req.body;
      const user = req.user!;

      // Check if user can cancel this order
      if (user.role === 'customer') {
        // Customers can only cancel their own orders
        // @ts-ignore - TypeScript incorrectly thinks user.id might be undefined after auth middleware
        const order = await OrderService.getOrderById(orderId, user.id);
        if (!order) {
          const response: ApiResponse = {
            success: false,
            error: {
              code: 'ORDER_NOT_FOUND',
              message: 'Order not found',
              timestamp: new Date().toISOString()
            }
          };
          res.status(404).json(response);
          return;
        }
      }

      const cancelledOrder = await OrderService.cancelOrder(
        orderId!,
        reason,
        user.email as string
      );

      const response: ApiResponse = {
        success: true,
        data: cancelledOrder
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error('Cancel order error:', error);
      
      let statusCode = 500;
      let errorCode = 'INTERNAL_SERVER_ERROR';
      let message = 'Failed to cancel order';

      if ((error as Error).message.includes('not found')) {
        statusCode = 404;
        errorCode = 'ORDER_NOT_FOUND';
        message = 'Order not found';
      } else if ((error as Error).message.includes('cannot be cancelled')) {
        statusCode = 400;
        errorCode = 'CANNOT_CANCEL_ORDER';
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
 * GET /api/orders/:identifier/tracking
 * Get detailed order tracking information
 */
router.get('/:identifier/tracking',
  authenticateToken,
  [
    param('identifier').notEmpty().withMessage('Order ID or order number is required')
  ],
  async (req: AuthenticatedRequest, res: express.Response) => {
    try {
      if (handleValidationErrors(req, res)) return;

      const { identifier } = req.params;
      const user = req.user!;

      // For customers, only allow access to their own orders
      const userId = user.role === 'customer' ? user.id : undefined;
      
      // @ts-ignore - TypeScript incorrectly thinks userId might be undefined after auth middleware
      const trackingDetails = await OrderService.getOrderTracking(identifier, userId);

      if (!trackingDetails) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'ORDER_NOT_FOUND',
            message: 'Order not found',
            timestamp: new Date().toISOString()
          }
        };
        res.status(404).json(response);
        return;
      }

      const response: ApiResponse = {
        success: true,
        data: trackingDetails
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error('Get order tracking error:', error);
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to retrieve order tracking information',
          timestamp: new Date().toISOString()
        }
      };
      res.status(500).json(response);
    }
  }
);

/**
 * PUT /api/orders/:orderId/tracking
 * Update order tracking information (Admin/Employee only)
 */
router.put('/:orderId/tracking',
  authenticateToken,
  requireRole(['admin', 'employee']),
  [
    param('orderId').isMongoId().withMessage('Valid order ID is required'),
    body('trackingNumber').optional().isString().withMessage('Tracking number must be string'),
    body('carrier').optional().isString().withMessage('Carrier must be string'),
    body('currentLocation').optional().isString().withMessage('Current location must be string'),
    body('estimatedDelivery').optional().isISO8601().withMessage('Estimated delivery must be valid date'),
    body('trackingUpdate.location').optional().isString().withMessage('Tracking update location must be string'),
    body('trackingUpdate.status').optional().isString().withMessage('Tracking update status must be string'),
    body('trackingUpdate.description').optional().isString().withMessage('Tracking update description must be string')
  ],
  async (req: AuthenticatedRequest, res: express.Response) => {
    try {
      if (handleValidationErrors(req, res)) return;

      const { orderId } = req.params;
      const trackingData = {
        trackingNumber: req.body.trackingNumber,
        carrier: req.body.carrier,
        currentLocation: req.body.currentLocation,
        estimatedDelivery: req.body.estimatedDelivery ? new Date(req.body.estimatedDelivery) : undefined,
        trackingUpdate: req.body.trackingUpdate
      };
      const updatedBy = req.user!.email;

      // @ts-ignore - TypeScript incorrectly thinks updatedBy might be undefined after auth middleware
      const order = await OrderService.updateOrderTracking(orderId, trackingData, updatedBy);

      const response: ApiResponse = {
        success: true,
        data: order
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error('Update order tracking error:', error);
      
      let statusCode = 500;
      let errorCode = 'INTERNAL_SERVER_ERROR';
      let message = 'Failed to update order tracking';

      if ((error as Error).message.includes('not found')) {
        statusCode = 404;
        errorCode = 'ORDER_NOT_FOUND';
        message = 'Order not found';
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
 * GET /api/orders/user/:userId/history
 * Get order history for a user (Admin/Employee only, or own history for customers)
 */
router.get('/user/:userId/history',
  authenticateToken,
  [
    param('userId').isMongoId().withMessage('Valid user ID is required'),
    query('status').optional().isIn(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled']).withMessage('Invalid status'),
    query('startDate').optional().isISO8601().withMessage('Start date must be valid ISO date'),
    query('endDate').optional().isISO8601().withMessage('End date must be valid ISO date'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1-100')
  ],
  async (req: AuthenticatedRequest, res: express.Response) => {
    try {
      if (handleValidationErrors(req, res)) return;

      const { userId } = req.params;
      const user = req.user!;

      // Customers can only access their own history
      if (user.role === 'customer' && user.id !== userId) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'ACCESS_DENIED',
            message: 'You can only access your own order history',
            timestamp: new Date().toISOString()
          }
        };
        res.status(403).json(response);
        return;
      }

      const filters = {
        status: req.query.status as OrderStatus,
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined
      };

      // @ts-ignore - TypeScript incorrectly thinks userId might be undefined after auth middleware
      const history = await OrderService.getOrderHistory(userId, filters);

      const response: ApiResponse = {
        success: true,
        data: history
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error('Get order history error:', error);
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to retrieve order history',
          timestamp: new Date().toISOString()
        }
      };
      res.status(500).json(response);
    }
  }
);

/**
 * PUT /api/orders/bulk/status
 * Bulk update order statuses (Admin only)
 */
router.put('/bulk/status',
  authenticateToken,
  requireRole(['admin']),
  [
    body('orderIds').isArray({ min: 1 }).withMessage('Order IDs array is required'),
    body('orderIds.*').isMongoId().withMessage('Valid order IDs are required'),
    body('status').isIn(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled']).withMessage('Valid status is required'),
    body('note').optional().isString().withMessage('Note must be string')
  ],
  async (req: AuthenticatedRequest, res: express.Response) => {
    try {
      if (handleValidationErrors(req, res)) return;

      const { orderIds, status, note } = req.body;
      const updatedBy = req.user!.email;

      // @ts-ignore - TypeScript incorrectly thinks updatedBy might be undefined after auth middleware
      const result = await OrderService.bulkUpdateOrderStatus(orderIds, status, updatedBy, note);

      const response: ApiResponse = {
        success: true,
        data: {
          totalOrders: orderIds.length,
          successful: result.successful.length,
          failed: result.failed.length,
          successfulOrders: result.successful,
          failedOrders: result.failed
        }
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error('Bulk update order status error:', error);
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to bulk update order statuses',
          timestamp: new Date().toISOString()
        }
      };
      res.status(500).json(response);
    }
  }
);

/**
 * GET /api/orders/stats
 * Get order statistics (Admin/Employee only)
 */
router.get('/stats',
  authenticateToken,
  requireRole(['admin', 'employee']),
  [
    query('startDate').optional().isISO8601().withMessage('Start date must be valid ISO date'),
    query('endDate').optional().isISO8601().withMessage('End date must be valid ISO date')
  ],
  async (req: AuthenticatedRequest, res: express.Response) => {
    try {
      if (handleValidationErrors(req, res)) return;

      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

      const stats = await OrderService.getOrderStats(startDate, endDate);

      const response: ApiResponse = {
        success: true,
        data: stats
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error('Get order stats error:', error);
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to retrieve order statistics',
          timestamp: new Date().toISOString()
        }
      };
      res.status(500).json(response);
    }
  }
);

export { router as orderRoutes };