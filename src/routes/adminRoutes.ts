import express from 'express';
import { body, query, validationResult } from 'express-validator';
import { ProductService } from '../services/productService';
import { authenticateToken, requireRole, AuthenticatedRequest } from '../middleware/auth';
import { ApiResponse } from '../types/common';
import { logger } from '../utils/logger';
import { Product } from '../models/Product';

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
 * GET /api/admin/dashboard
 * Get admin dashboard data with key metrics
 */
router.get('/dashboard',
  authenticateToken,
  requireRole(['admin', 'employee']),
  async (req: AuthenticatedRequest, res: express.Response) => {
    try {
      // Get key metrics
      const totalProducts = await Product.countDocuments({ isActive: true });
      const lowStockProducts = await Product.countDocuments({
        isActive: true,
        'inventory.trackInventory': true,
        $expr: {
          $lte: [
            { $subtract: ['$inventory.quantity', '$inventory.reserved'] },
            '$inventory.lowStockThreshold'
          ]
        }
      });

      // Get categories count
      const categories = await Product.distinct('category', { isActive: true });
      const totalCategories = categories.length;

      // Get recent products (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const recentProducts = await Product.countDocuments({
        isActive: true,
        createdAt: { $gte: sevenDaysAgo }
      });

      // Get inventory value (wholesale price * quantity)
      const inventoryValue = await Product.aggregate([
        { $match: { isActive: true } },
        {
          $group: {
            _id: null,
            totalValue: {
              $sum: {
                $multiply: ['$pricing.wholesalePrice', '$inventory.quantity']
              }
            }
          }
        }
      ]);

      const response: ApiResponse = {
        success: true,
        data: {
          metrics: {
            totalProducts,
            totalCategories,
            lowStockProducts,
            recentProducts,
            inventoryValue: inventoryValue[0]?.totalValue || 0
          },
          alerts: {
            lowStock: lowStockProducts > 0,
            lowStockCount: lowStockProducts
          }
        }
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error('Admin dashboard error:', error);
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to load dashboard data',
          timestamp: new Date().toISOString()
        }
      };
      res.status(500).json(response);
    }
  }
);

/**
 * GET /api/admin/products
 * Get products with advanced admin filtering and pagination
 */
router.get('/products',
  authenticateToken,
  requireRole(['admin', 'employee']),
  [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be positive'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1-100'),
    query('search').optional().isString().withMessage('Search must be string'),
    query('category').optional().isString().withMessage('Category must be string'),
    query('brand').optional().isString().withMessage('Brand must be string'),
    query('status').optional().isIn(['active', 'inactive', 'all']).withMessage('Status must be active, inactive, or all'),
    query('stockStatus').optional().isIn(['inStock', 'lowStock', 'outOfStock', 'all']).withMessage('Invalid stock status'),
    query('sortBy').optional().isIn(['name', 'createdAt', 'updatedAt', 'price', 'stock']).withMessage('Invalid sort field'),
    query('sortOrder').optional().isIn(['asc', 'desc']).withMessage('Sort order must be asc or desc')
  ],
  async (req: AuthenticatedRequest, res: express.Response) => {
    try {
      if (handleValidationErrors(req, res)) return;

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const search = req.query.search as string;
      const category = req.query.category as string;
      const brand = req.query.brand as string;
      const status = req.query.status as string || 'active';
      const stockStatus = req.query.stockStatus as string || 'all';
      const sortBy = req.query.sortBy as string || 'createdAt';
      const sortOrder = req.query.sortOrder as string || 'desc';

      // Build query
      const query: any = {};

      // Status filter
      if (status === 'active') query.isActive = true;
      else if (status === 'inactive') query.isActive = false;
      // 'all' includes both active and inactive

      // Search filter
      if (search) {
        query.$text = { $search: search };
      }

      // Category filter
      if (category) query.category = category;

      // Brand filter
      if (brand) query.brand = brand;

      // Stock status filter
      if (stockStatus === 'inStock') {
        query.$expr = {
          $gt: [
            { $subtract: ['$inventory.quantity', '$inventory.reserved'] },
            0
          ]
        };
      } else if (stockStatus === 'lowStock') {
        query.$expr = {
          $and: [
            {
              $lte: [
                { $subtract: ['$inventory.quantity', '$inventory.reserved'] },
                '$inventory.lowStockThreshold'
              ]
            },
            {
              $gt: [
                { $subtract: ['$inventory.quantity', '$inventory.reserved'] },
                0
              ]
            }
          ]
        };
      } else if (stockStatus === 'outOfStock') {
        query.$expr = {
          $lte: [
            { $subtract: ['$inventory.quantity', '$inventory.reserved'] },
            0
          ]
        };
      }

      // Build sort object
      const sort: any = {};
      if (sortBy === 'name') sort.name = sortOrder === 'asc' ? 1 : -1;
      else if (sortBy === 'price') sort['pricing.retailPrice'] = sortOrder === 'asc' ? 1 : -1;
      else if (sortBy === 'stock') sort['inventory.quantity'] = sortOrder === 'asc' ? 1 : -1;
      else sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

      // Execute query with pagination
      const skip = (page - 1) * limit;
      const [products, total] = await Promise.all([
        Product.find(query)
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .lean(),
        Product.countDocuments(query)
      ]);

      // Add computed fields
      const enrichedProducts = products.map(product => ({
        ...product,
        availableQuantity: Math.max(0, product.inventory.quantity - product.inventory.reserved),
        stockStatus: (() => {
          const available = Math.max(0, product.inventory.quantity - product.inventory.reserved);
          if (available === 0) return 'outOfStock';
          if (available <= product.inventory.lowStockThreshold) return 'lowStock';
          return 'inStock';
        })(),
        primaryImage: product.images.find((img: any) => img.isPrimary) || product.images[0]
      }));

      const totalPages = Math.ceil(total / limit);

      const response: ApiResponse = {
        success: true,
        data: enrichedProducts,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error('Admin get products error:', error);
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to retrieve products',
          timestamp: new Date().toISOString()
        }
      };
      res.status(500).json(response);
    }
  }
);

/**
 * POST /api/admin/products/bulk-update
 * Bulk update products (Admin only)
 */
router.post('/products/bulk-update',
  authenticateToken,
  requireRole(['admin']),
  [
    body('productIds').isArray({ min: 1 }).withMessage('Product IDs array is required'),
    body('updates').isObject().withMessage('Updates object is required'),
    body('action').isIn(['update', 'activate', 'deactivate', 'delete']).withMessage('Invalid action')
  ],
  async (req: AuthenticatedRequest, res: express.Response) => {
    try {
      if (handleValidationErrors(req, res)) return;

      const { productIds, updates, action } = req.body;

      let result;
      switch (action) {
        case 'update':
          result = await Product.updateMany(
            { _id: { $in: productIds } },
            { $set: updates, updatedAt: new Date() }
          );
          break;
        case 'activate':
          result = await Product.updateMany(
            { _id: { $in: productIds } },
            { $set: { isActive: true, updatedAt: new Date() } }
          );
          break;
        case 'deactivate':
          result = await Product.updateMany(
            { _id: { $in: productIds } },
            { $set: { isActive: false, updatedAt: new Date() } }
          );
          break;
        case 'delete':
          result = await Product.deleteMany({ _id: { $in: productIds } });
          break;
        default:
          throw new Error('Invalid action');
      }

      const response: ApiResponse = {
        success: true,
        data: {
          message: `Bulk ${action} completed successfully`,
          modifiedCount: result.modifiedCount || result.deletedCount,
          productIds
        }
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error('Bulk update error:', error);
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
 * GET /api/admin/categories
 * Get categories with product counts and management info
 */
router.get('/categories',
  authenticateToken,
  requireRole(['admin', 'employee']),
  async (req: AuthenticatedRequest, res: express.Response) => {
    try {
      // Get categories with product counts
      const categoriesData = await Product.aggregate([
        { $match: { isActive: true } },
        {
          $group: {
            _id: '$category',
            productCount: { $sum: 1 },
            subcategories: { $addToSet: '$subcategory' },
            brands: { $addToSet: '$brand' },
            avgPrice: { $avg: '$pricing.retailPrice' },
            totalInventory: { $sum: '$inventory.quantity' }
          }
        },
        {
          $project: {
            name: '$_id',
            productCount: 1,
            subcategories: {
              $filter: {
                input: '$subcategories',
                cond: { $ne: ['$$this', null] }
              }
            },
            brands: 1,
            avgPrice: { $round: ['$avgPrice', 2] },
            totalInventory: 1
          }
        },
        { $sort: { name: 1 } }
      ]);

      const response: ApiResponse = {
        success: true,
        data: categoriesData
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error('Admin get categories error:', error);
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to retrieve categories',
          timestamp: new Date().toISOString()
        }
      };
      res.status(500).json(response);
    }
  }
);

/**
 * POST /api/admin/categories/bulk-update
 * Bulk update category names (Admin only)
 */
router.post('/categories/bulk-update',
  authenticateToken,
  requireRole(['admin']),
  [
    body('updates').isArray({ min: 1 }).withMessage('Updates array is required'),
    body('updates.*.oldName').notEmpty().withMessage('Old category name is required'),
    body('updates.*.newName').notEmpty().withMessage('New category name is required')
  ],
  async (req: AuthenticatedRequest, res: express.Response) => {
    try {
      if (handleValidationErrors(req, res)) return;

      const { updates } = req.body;
      const results = [];

      for (const update of updates) {
        const result = await Product.updateMany(
          { category: update.oldName },
          { $set: { category: update.newName, updatedAt: new Date() } }
        );
        results.push({
          oldName: update.oldName,
          newName: update.newName,
          modifiedCount: result.modifiedCount
        });
      }

      const response: ApiResponse = {
        success: true,
        data: {
          message: 'Category bulk update completed',
          results
        }
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error('Category bulk update error:', error);
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to perform category bulk update',
          timestamp: new Date().toISOString()
        }
      };
      res.status(500).json(response);
    }
  }
);

/**
 * GET /api/admin/analytics
 * Get analytics data for admin dashboard
 */
router.get('/analytics',
  authenticateToken,
  requireRole(['admin', 'employee']),
  [
    query('period').optional().isIn(['7d', '30d', '90d', '1y']).withMessage('Invalid period'),
    query('metric').optional().isIn(['products', 'categories', 'inventory', 'all']).withMessage('Invalid metric')
  ],
  async (req: AuthenticatedRequest, res: express.Response) => {
    try {
      if (handleValidationErrors(req, res)) return;

      const period = req.query.period as string || '30d';
      const metric = req.query.metric as string || 'all';

      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      switch (period) {
        case '7d':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(startDate.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(startDate.getDate() - 90);
          break;
        case '1y':
          startDate.setFullYear(startDate.getFullYear() - 1);
          break;
      }

      const analytics: any = {};

      if (metric === 'products' || metric === 'all') {
        // Product creation trend
        const productTrend = await Product.aggregate([
          {
            $match: {
              createdAt: { $gte: startDate, $lte: endDate }
            }
          },
          {
            $group: {
              _id: {
                $dateToString: {
                  format: '%Y-%m-%d',
                  date: '$createdAt'
                }
              },
              count: { $sum: 1 }
            }
          },
          { $sort: { '_id': 1 } }
        ]);

        analytics.productTrend = productTrend;
      }

      if (metric === 'categories' || metric === 'all') {
        // Category distribution
        const categoryDistribution = await Product.aggregate([
          { $match: { isActive: true } },
          {
            $group: {
              _id: '$category',
              count: { $sum: 1 },
              totalValue: {
                $sum: {
                  $multiply: ['$pricing.retailPrice', '$inventory.quantity']
                }
              }
            }
          },
          { $sort: { count: -1 } }
        ]);

        analytics.categoryDistribution = categoryDistribution;
      }

      if (metric === 'inventory' || metric === 'all') {
        // Inventory status
        const inventoryStatus = await Product.aggregate([
          { $match: { isActive: true } },
          {
            $project: {
              category: 1,
              availableQuantity: {
                $subtract: ['$inventory.quantity', '$inventory.reserved']
              },
              lowStockThreshold: '$inventory.lowStockThreshold'
            }
          },
          {
            $group: {
              _id: '$category',
              totalProducts: { $sum: 1 },
              totalStock: { $sum: '$availableQuantity' },
              lowStockProducts: {
                $sum: {
                  $cond: [
                    { $lte: ['$availableQuantity', '$lowStockThreshold'] },
                    1,
                    0
                  ]
                }
              }
            }
          }
        ]);

        analytics.inventoryStatus = inventoryStatus;
      }

      const response: ApiResponse = {
        success: true,
        data: {
          period,
          analytics
        }
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error('Admin analytics error:', error);
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to retrieve analytics data',
          timestamp: new Date().toISOString()
        }
      };
      res.status(500).json(response);
    }
  }
);

export { router as adminRoutes };