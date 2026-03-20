import express from 'express';
import { body, query, validationResult } from 'express-validator';
import { ProductService } from '../services/productService';
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
const createProductValidation = [
  body('name').trim().isLength({ min: 1, max: 200 }).withMessage('Name must be 1-200 characters'),
  body('description').trim().isLength({ min: 1, max: 2000 }).withMessage('Description must be 1-2000 characters'),
  body('category').trim().isLength({ min: 1 }).withMessage('Category is required'),
  body('brand').trim().isLength({ min: 1 }).withMessage('Brand is required'),
  body('sku').trim().isLength({ min: 1 }).matches(/^[A-Z0-9\-_]+$/i).withMessage('SKU can only contain letters, numbers, hyphens, and underscores'),
  body('images').isArray({ min: 1 }).withMessage('At least one image is required'),
  body('images.*.url').isURL().withMessage('Image URL must be valid'),
  body('images.*.alt').trim().isLength({ min: 1 }).withMessage('Image alt text is required'),
  body('pricing.retailPrice').isFloat({ min: 0 }).withMessage('Retail price must be positive'),
  body('pricing.wholesalePrice').isFloat({ min: 0 }).withMessage('Wholesale price must be positive'),
  body('pricing.costPrice').isFloat({ min: 0 }).withMessage('Cost price must be positive'),
  body('pricing.currency').isIn(['USD', 'EUR', 'GBP', 'CAD']).withMessage('Invalid currency'),
  body('inventory.quantity').isInt({ min: 0 }).withMessage('Quantity must be non-negative'),
  body('inventory.lowStockThreshold').isInt({ min: 0 }).withMessage('Low stock threshold must be non-negative')
];

const updateProductValidation = [
  body('name').optional().trim().isLength({ min: 1, max: 200 }).withMessage('Name must be 1-200 characters'),
  body('description').optional().trim().isLength({ min: 1, max: 2000 }).withMessage('Description must be 1-2000 characters'),
  body('category').optional().trim().isLength({ min: 1 }).withMessage('Category cannot be empty'),
  body('brand').optional().trim().isLength({ min: 1 }).withMessage('Brand cannot be empty'),
  body('images').optional().isArray({ min: 1 }).withMessage('At least one image is required'),
  body('images.*.url').optional().isURL().withMessage('Image URL must be valid'),
  body('images.*.alt').optional().trim().isLength({ min: 1 }).withMessage('Image alt text is required'),
  body('pricing.retailPrice').optional().isFloat({ min: 0 }).withMessage('Retail price must be positive'),
  body('pricing.wholesalePrice').optional().isFloat({ min: 0 }).withMessage('Wholesale price must be positive'),
  body('pricing.costPrice').optional().isFloat({ min: 0 }).withMessage('Cost price must be positive'),
  body('inventory.quantity').optional().isInt({ min: 0 }).withMessage('Quantity must be non-negative'),
  body('inventory.lowStockThreshold').optional().isInt({ min: 0 }).withMessage('Low stock threshold must be non-negative')
];

/**
 * GET /api/products
 * Get products with filtering and pagination
 */
router.get('/',
  [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be positive'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1-100'),
    query('search').optional().isString().withMessage('Search must be string'),
    query('category').optional().isString().withMessage('Category must be string'),
    query('brand').optional().isString().withMessage('Brand must be string'),
    query('minPrice').optional().isFloat({ min: 0 }).withMessage('Min price must be positive'),
    query('maxPrice').optional().isFloat({ min: 0 }).withMessage('Max price must be positive'),
    query('inStock').optional().isBoolean().withMessage('InStock must be boolean'),
    query('priceType').optional().isIn(['retail', 'wholesale']).withMessage('Price type must be retail or wholesale')
  ],
  async (req: express.Request, res: express.Response) => {
    try {
      if (handleValidationErrors(req, res)) return;

      const options = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 20,
        search: req.query.search as string,
        category: req.query.category as string,
        subcategory: req.query.subcategory as string,
        brand: req.query.brand as string,
        minPrice: req.query.minPrice ? parseFloat(req.query.minPrice as string) : undefined,
        maxPrice: req.query.maxPrice ? parseFloat(req.query.maxPrice as string) : undefined,
        inStock: req.query.inStock === 'true',
        priceType: (req.query.priceType as 'retail' | 'wholesale') || 'retail',
        tags: req.query.tags ? (req.query.tags as string).split(',') : undefined
      };

      // Filter out undefined values
      const filteredOptions = Object.fromEntries(
        Object.entries(options).filter(([_, value]) => value !== undefined)
      ) as any;

      const result = await ProductService.getProducts(filteredOptions);

      const response: ApiResponse = {
        success: true,
        data: result.products,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: result.totalPages
        }
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error('Get products error:', error);
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
 * GET /api/products/categories
 * Get product categories
 */
router.get('/categories', async (req: express.Request, res: express.Response) => {
  try {
    const categories = await ProductService.getCategories();

    const response: ApiResponse = {
      success: true,
      data: categories
    };

    res.status(200).json(response);
  } catch (error) {
    logger.error('Get categories error:', error);
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
});

/**
 * GET /api/products/brands
 * Get product brands
 */
router.get('/brands', async (req: express.Request, res: express.Response) => {
  try {
    const brands = await ProductService.getBrands();

    const response: ApiResponse = {
      success: true,
      data: brands
    };

    res.status(200).json(response);
  } catch (error) {
    logger.error('Get brands error:', error);
    const response: ApiResponse = {
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to retrieve brands',
        timestamp: new Date().toISOString()
      }
    };
    res.status(500).json(response);
  }
});

/**
 * GET /api/products/low-stock
 * Get low stock products (Admin/Employee only)
 */
router.get('/low-stock',
  authenticateToken,
  requireRole(['admin', 'employee']),
  async (req: AuthenticatedRequest, res: express.Response) => {
    try {
      const products = await ProductService.getLowStockProducts();

      const response: ApiResponse = {
        success: true,
        data: products
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error('Get low stock products error:', error);
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to retrieve low stock products',
          timestamp: new Date().toISOString()
        }
      };
      res.status(500).json(response);
    }
  }
);

/**
 * GET /api/products/:id
 * Get product by ID
 */
router.get('/:id', async (req: express.Request, res: express.Response) => {
  try {
    const productId = req.params.id;
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

    const product = await ProductService.getProductById(productId);

    if (!product || !product.isActive) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'PRODUCT_NOT_FOUND',
          message: 'Product not found',
          timestamp: new Date().toISOString()
        }
      };
      res.status(404).json(response);
      return;
    }

    const response: ApiResponse = {
      success: true,
      data: product
    };

    res.status(200).json(response);
  } catch (error) {
    logger.error('Get product error:', error);
    const response: ApiResponse = {
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to retrieve product',
        timestamp: new Date().toISOString()
      }
    };
    res.status(500).json(response);
  }
});

/**
 * POST /api/products
 * Create new product (Admin/Employee only)
 */
router.post('/',
  authenticateToken,
  requireRole(['admin', 'employee']),
  createProductValidation,
  async (req: AuthenticatedRequest, res: express.Response) => {
    try {
      if (handleValidationErrors(req, res)) return;

      const product = await ProductService.createProduct(req.body);

      const response: ApiResponse = {
        success: true,
        data: product
      };

      res.status(201).json(response);
    } catch (error) {
      logger.error('Create product error:', error);
      
      let statusCode = 500;
      let errorCode = 'INTERNAL_SERVER_ERROR';
      let message = 'Failed to create product';

      if ((error as Error).message.includes('already exists')) {
        statusCode = 409;
        errorCode = 'DUPLICATE_SKU';
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
 * PUT /api/products/:id
 * Update product (Admin/Employee only)
 */
router.put('/:id',
  authenticateToken,
  requireRole(['admin', 'employee']),
  updateProductValidation,
  async (req: AuthenticatedRequest, res: express.Response) => {
    try {
      if (handleValidationErrors(req, res)) return;

      const productId = req.params.id;
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

      const product = await ProductService.updateProduct(productId, req.body);

      const response: ApiResponse = {
        success: true,
        data: product
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error('Update product error:', error);
      
      let statusCode = 500;
      let errorCode = 'INTERNAL_SERVER_ERROR';
      let message = 'Failed to update product';

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
 * DELETE /api/products/:id
 * Delete product (Admin only)
 */
router.delete('/:id',
  authenticateToken,
  requireRole(['admin']),
  async (req: AuthenticatedRequest, res: express.Response) => {
    try {
      const productId = req.params.id;
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

      await ProductService.deleteProduct(productId);

      const response: ApiResponse = {
        success: true,
        data: {
          message: 'Product deleted successfully'
        }
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error('Delete product error:', error);
      
      let statusCode = 500;
      let errorCode = 'INTERNAL_SERVER_ERROR';
      let message = 'Failed to delete product';

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
 * PUT /api/products/:id/inventory
 * Update product inventory (Admin/Employee only)
 */
router.put('/:id/inventory',
  authenticateToken,
  requireRole(['admin', 'employee']),
  [
    body('quantity').isInt({ min: 0 }).withMessage('Quantity must be non-negative'),
    body('type').optional().isIn(['add', 'subtract', 'set']).withMessage('Type must be add, subtract, or set')
  ],
  async (req: AuthenticatedRequest, res: express.Response) => {
    try {
      if (handleValidationErrors(req, res)) return;

      const productId = req.params.id;
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

      const { quantity, type = 'set' } = req.body;

      const product = await ProductService.updateInventory(productId, quantity, type);

      const response: ApiResponse = {
        success: true,
        data: product
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error('Update inventory error:', error);
      
      let statusCode = 500;
      let errorCode = 'INTERNAL_SERVER_ERROR';
      let message = 'Failed to update inventory';

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

export { router as productRoutes };