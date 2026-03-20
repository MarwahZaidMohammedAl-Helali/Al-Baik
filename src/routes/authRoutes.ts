import express from 'express';
import { body, validationResult } from 'express-validator';
import { AuthService } from '../services/authService';
import { ApiResponse } from '../types/common';
import { logger } from '../utils/logger';

const router = express.Router();

// Validation middleware
const registerValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('firstName')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('First name is required and must be less than 50 characters'),
  body('lastName')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Last name is required and must be less than 50 characters'),
  body('phone')
    .optional()
    .matches(/^\+?[\d\s\-\(\)]+$/)
    .withMessage('Please provide a valid phone number'),
  body('role')
    .optional()
    .isIn(['admin', 'employee', 'customer'])
    .withMessage('Role must be admin, employee, or customer')
];

const loginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

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
 * POST /api/auth/register
 * Register a new user
 */
router.post('/register', registerValidation, async (req: express.Request, res: express.Response) => {
  try {
    // Check for validation errors
    if (handleValidationErrors(req, res)) return;

    const result = await AuthService.register(req.body);

    if (result.success) {
      const response: ApiResponse = {
        success: true,
        data: {
          user: result.user,
          token: result.token,
          refreshToken: result.refreshToken
        }
      };
      res.status(201).json(response);
    } else {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'REGISTRATION_FAILED',
          message: result.error || 'Registration failed',
          timestamp: new Date().toISOString()
        }
      };
      res.status(400).json(response);
    }
  } catch (error) {
    logger.error('Registration endpoint error:', error);
    const response: ApiResponse = {
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred',
        timestamp: new Date().toISOString()
      }
    };
    res.status(500).json(response);
  }
});

/**
 * POST /api/auth/login
 * Login user
 */
router.post('/login', loginValidation, async (req: express.Request, res: express.Response) => {
  try {
    // Check for validation errors
    if (handleValidationErrors(req, res)) return;

    const result = await AuthService.login(req.body);

    if (result.success) {
      const response: ApiResponse = {
        success: true,
        data: {
          user: result.user,
          token: result.token,
          refreshToken: result.refreshToken
        }
      };
      res.status(200).json(response);
    } else {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'LOGIN_FAILED',
          message: result.error || 'Login failed',
          timestamp: new Date().toISOString()
        }
      };
      res.status(401).json(response);
    }
  } catch (error) {
    logger.error('Login endpoint error:', error);
    const response: ApiResponse = {
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred',
        timestamp: new Date().toISOString()
      }
    };
    res.status(500).json(response);
  }
});

/**
 * POST /api/auth/refresh
 * Refresh JWT token
 */
router.post('/refresh', async (req: express.Request, res: express.Response) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'MISSING_REFRESH_TOKEN',
          message: 'Refresh token is required',
          timestamp: new Date().toISOString()
        }
      };
      res.status(400).json(response);
      return;
    }

    const result = await AuthService.refreshToken(refreshToken);

    if (result.success) {
      const response: ApiResponse = {
        success: true,
        data: {
          user: result.user,
          token: result.token,
          refreshToken: result.refreshToken
        }
      };
      res.status(200).json(response);
    } else {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'TOKEN_REFRESH_FAILED',
          message: result.error || 'Token refresh failed',
          timestamp: new Date().toISOString()
        }
      };
      res.status(401).json(response);
    }
  } catch (error) {
    logger.error('Token refresh endpoint error:', error);
    const response: ApiResponse = {
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred',
        timestamp: new Date().toISOString()
      }
    };
    res.status(500).json(response);
  }
});

/**
 * POST /api/auth/logout
 * Logout user (client-side token removal)
 */
router.post('/logout', (req: express.Request, res: express.Response) => {
  // In a JWT-based system, logout is typically handled client-side
  // by removing the token from storage. We can add token blacklisting
  // in the future if needed.
  
  const response: ApiResponse = {
    success: true,
    data: {
      message: 'Logged out successfully'
    }
  };
  res.status(200).json(response);
});

export { router as authRoutes };