import express from 'express';
import { body, query, validationResult } from 'express-validator';
import { User } from '../models/User';
import { authenticateToken, requireRole, AuthenticatedRequest } from '../middleware/auth';
import { ApiResponse, PaginationQuery } from '../types/common';
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
 * GET /api/users
 * Get all users (Admin only)
 */
router.get('/', 
  authenticateToken,
  requireRole(['admin']),
  [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('role').optional().isIn(['admin', 'employee', 'customer']).withMessage('Invalid role'),
    query('search').optional().isString().withMessage('Search must be a string')
  ],
  async (req: AuthenticatedRequest, res: express.Response) => {
    try {
      if (handleValidationErrors(req, res)) return;

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const role = req.query.role as string;
      const search = req.query.search as string;

      // Build query
      const query: any = { isActive: true };
      
      if (role) {
        query.role = role;
      }

      if (search) {
        query.$or = [
          { firstName: { $regex: search, $options: 'i' } },
          { lastName: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } }
        ];
      }

      // Execute query with pagination
      const skip = (page - 1) * limit;
      const [users, total] = await Promise.all([
        User.find(query)
          .select('-password')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        User.countDocuments(query)
      ]);

      const response: ApiResponse = {
        success: true,
        data: users,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error('Get users error:', error);
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to retrieve users',
          timestamp: new Date().toISOString()
        }
      };
      res.status(500).json(response);
    }
  }
);

/**
 * GET /api/users/:id
 * Get user by ID (Admin, Employee, or own profile)
 */
router.get('/:id',
  authenticateToken,
  async (req: AuthenticatedRequest, res: express.Response) => {
    try {
      const userId = req.params.id;
      const currentUser = req.user!;

      // Check if user can access this profile
      const canAccess = currentUser.role === 'admin' || 
                       currentUser.role === 'employee' || 
                       currentUser.id === userId;

      if (!canAccess) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'ACCESS_DENIED',
            message: 'You can only access your own profile',
            timestamp: new Date().toISOString()
          }
        };
        res.status(403).json(response);
        return;
      }

      const user = await User.findById(userId).select('-password');
      
      if (!user || !user.isActive) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found',
            timestamp: new Date().toISOString()
          }
        };
        res.status(404).json(response);
        return;
      }

      const response: ApiResponse = {
        success: true,
        data: user
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error('Get user error:', error);
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to retrieve user',
          timestamp: new Date().toISOString()
        }
      };
      res.status(500).json(response);
    }
  }
);

/**
 * PUT /api/users/:id
 * Update user (Admin, Employee, or own profile with restrictions)
 */
router.put('/:id',
  authenticateToken,
  [
    body('firstName').optional().trim().isLength({ min: 1, max: 50 }).withMessage('First name must be 1-50 characters'),
    body('lastName').optional().trim().isLength({ min: 1, max: 50 }).withMessage('Last name must be 1-50 characters'),
    body('phone').optional().matches(/^\+?[\d\s\-\(\)]+$/).withMessage('Invalid phone number format'),
    body('role').optional().isIn(['admin', 'employee', 'customer']).withMessage('Invalid role'),
    body('isWholesaleCustomer').optional().isBoolean().withMessage('isWholesaleCustomer must be boolean'),
    body('isActive').optional().isBoolean().withMessage('isActive must be boolean')
  ],
  async (req: AuthenticatedRequest, res: express.Response) => {
    try {
      if (handleValidationErrors(req, res)) return;

      const userId = req.params.id;
      const currentUser = req.user!;
      const updates = req.body;

      // Check permissions
      const isOwnProfile = currentUser.id === userId;
      const isAdmin = currentUser.role === 'admin';
      const isEmployee = currentUser.role === 'employee';

      if (!isOwnProfile && !isAdmin && !isEmployee) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'ACCESS_DENIED',
            message: 'Insufficient permissions to update this user',
            timestamp: new Date().toISOString()
          }
        };
        res.status(403).json(response);
        return;
      }

      // Restrict what can be updated based on role
      if (isOwnProfile && !isAdmin) {
        // Users can only update their own basic info
        const allowedFields = ['firstName', 'lastName', 'phone'];
        const restrictedFields = Object.keys(updates).filter(field => !allowedFields.includes(field));
        
        if (restrictedFields.length > 0) {
          const response: ApiResponse = {
            success: false,
            error: {
              code: 'RESTRICTED_FIELDS',
              message: `You cannot update these fields: ${restrictedFields.join(', ')}`,
              timestamp: new Date().toISOString()
            }
          };
          res.status(403).json(response);
          return;
        }
      }

      // Employees cannot change roles or admin-only fields
      if (isEmployee && !isAdmin) {
        const restrictedFields = ['role', 'isActive'];
        const hasRestrictedFields = restrictedFields.some(field => field in updates);
        
        if (hasRestrictedFields) {
          const response: ApiResponse = {
            success: false,
            error: {
              code: 'INSUFFICIENT_PERMISSIONS',
              message: 'Employees cannot modify roles or user status',
              timestamp: new Date().toISOString()
            }
          };
          res.status(403).json(response);
          return;
        }
      }

      // Find and update user
      const user = await User.findById(userId);
      
      if (!user) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found',
            timestamp: new Date().toISOString()
          }
        };
        res.status(404).json(response);
        return;
      }

      // Apply updates
      Object.assign(user, updates);
      await user.save();

      // Log the update
      logger.info('User updated:', {
        updatedUserId: userId,
        updatedBy: currentUser.id,
        updatedByRole: currentUser.role,
        fields: Object.keys(updates)
      });

      const response: ApiResponse = {
        success: true,
        data: user.toJSON()
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error('Update user error:', error);
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update user',
          timestamp: new Date().toISOString()
        }
      };
      res.status(500).json(response);
    }
  }
);

/**
 * DELETE /api/users/:id
 * Deactivate user (Admin only)
 */
router.delete('/:id',
  authenticateToken,
  requireRole(['admin']),
  async (req: AuthenticatedRequest, res: express.Response) => {
    try {
      const userId = req.params.id;
      const currentUser = req.user!;

      // Prevent admin from deactivating themselves
      if (currentUser.id === userId) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'SELF_DEACTIVATION_DENIED',
            message: 'You cannot deactivate your own account',
            timestamp: new Date().toISOString()
          }
        };
        res.status(400).json(response);
        return;
      }

      const user = await User.findById(userId);
      
      if (!user) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found',
            timestamp: new Date().toISOString()
          }
        };
        res.status(404).json(response);
        return;
      }

      // Soft delete by setting isActive to false
      user.isActive = false;
      await user.save();

      logger.info('User deactivated:', {
        deactivatedUserId: userId,
        deactivatedBy: currentUser.id
      });

      const response: ApiResponse = {
        success: true,
        data: {
          message: 'User deactivated successfully'
        }
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error('Delete user error:', error);
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to deactivate user',
          timestamp: new Date().toISOString()
        }
      };
      res.status(500).json(response);
    }
  }
);

/**
 * POST /api/users/:id/role
 * Change user role (Admin only)
 */
router.post('/:id/role',
  authenticateToken,
  requireRole(['admin']),
  [
    body('role').isIn(['admin', 'employee', 'customer']).withMessage('Invalid role')
  ],
  async (req: AuthenticatedRequest, res: express.Response) => {
    try {
      if (handleValidationErrors(req, res)) return;

      const userId = req.params.id;
      const { role } = req.body;
      const currentUser = req.user!;

      const user = await User.findById(userId);
      
      if (!user || !user.isActive) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found',
            timestamp: new Date().toISOString()
          }
        };
        res.status(404).json(response);
        return;
      }

      const oldRole = user.role;
      user.role = role;
      await user.save();

      logger.info('User role changed:', {
        userId,
        oldRole,
        newRole: role,
        changedBy: currentUser.id
      });

      const response: ApiResponse = {
        success: true,
        data: {
          message: `User role changed from ${oldRole} to ${role}`,
          user: user.toJSON()
        }
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error('Change role error:', error);
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to change user role',
          timestamp: new Date().toISOString()
        }
      };
      res.status(500).json(response);
    }
  }
);

export { router as userRoutes };