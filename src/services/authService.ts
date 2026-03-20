import jwt from 'jsonwebtoken';
import { User, IUser } from '../models/User';
import { UserRole } from '../types/common';
import { logger } from '../utils/logger';

export interface UserRegistrationData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role?: UserRole;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResult {
  success: boolean;
  token?: string;
  refreshToken?: string;
  user?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    isWholesaleCustomer: boolean;
  };
  error?: string;
}

export interface JWTPayload {
  id: string;
  email: string;
  role: UserRole;
  isWholesaleCustomer: boolean;
}

export class AuthService {
  private static getJWTSecret(): string {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET is not configured');
    }
    return secret;
  }

  private static getJWTRefreshSecret(): string {
    const secret = process.env.JWT_REFRESH_SECRET;
    if (!secret) {
      throw new Error('JWT_REFRESH_SECRET is not configured');
    }
    return secret;
  }

  private static readonly JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
  private static readonly JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

  /**
   * Register a new user
   */
  static async register(userData: UserRegistrationData): Promise<AuthResult> {
    try {
      // Check if user already exists
      const existingUser = await User.findOne({ email: userData.email.toLowerCase() });
      if (existingUser) {
        return {
          success: false,
          error: 'User with this email already exists'
        };
      }

      // Create new user
      const user = new User({
        email: userData.email.toLowerCase(),
        password: userData.password,
        firstName: userData.firstName,
        lastName: userData.lastName,
        phone: userData.phone,
        role: userData.role || 'customer'
      });

      await user.save();

      // Generate tokens
      const { token, refreshToken } = this.generateTokens(user);

      logger.info('User registered successfully', {
        userId: user._id,
        email: user.email,
        role: user.role
      });

      return {
        success: true,
        token,
        refreshToken,
        user: {
          id: user._id.toString(),
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          isWholesaleCustomer: user.isWholesaleCustomer
        }
      };
    } catch (error) {
      logger.error('Registration failed:', error);
      return {
        success: false,
        error: 'Registration failed. Please try again.'
      };
    }
  }

  /**
   * Login user
   */
  static async login(credentials: LoginCredentials): Promise<AuthResult> {
    try {
      // Find user and include password for comparison
      const user = await User.findOne({ 
        email: credentials.email.toLowerCase(),
        isActive: true 
      }).select('+password');

      if (!user) {
        return {
          success: false,
          error: 'Invalid email or password'
        };
      }

      // Check password
      const isPasswordValid = await user.comparePassword(credentials.password);
      if (!isPasswordValid) {
        logger.warn('Failed login attempt', {
          email: credentials.email,
          timestamp: new Date().toISOString()
        });
        
        return {
          success: false,
          error: 'Invalid email or password'
        };
      }

      // Generate tokens
      const { token, refreshToken } = this.generateTokens(user);

      logger.info('User logged in successfully', {
        userId: user._id,
        email: user.email,
        role: user.role
      });

      return {
        success: true,
        token,
        refreshToken,
        user: {
          id: user._id.toString(),
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          isWholesaleCustomer: user.isWholesaleCustomer
        }
      };
    } catch (error) {
      logger.error('Login failed:', error);
      return {
        success: false,
        error: 'Login failed. Please try again.'
      };
    }
  }

  /**
   * Validate JWT token
   */
  static async validateToken(token: string): Promise<JWTPayload | null> {
    try {
      const decoded = jwt.verify(token, this.getJWTSecret()) as JWTPayload;
      
      // Verify user still exists and is active
      const user = await User.findById(decoded.id);
      if (!user || !user.isActive) {
        return null;
      }

      return decoded;
    } catch (error) {
      logger.warn('Token validation failed:', {
        error: (error as Error).message,
        token: token ? token.substring(0, 20) + '...' : 'undefined'
      });
      return null;
    }
  }

  /**
   * Refresh JWT token
   */
  static async refreshToken(refreshToken: string): Promise<AuthResult> {
    try {
      const decoded = jwt.verify(refreshToken, this.getJWTRefreshSecret()) as JWTPayload;
      
      // Find user
      const user = await User.findById(decoded.id);
      if (!user || !user.isActive) {
        return {
          success: false,
          error: 'Invalid refresh token'
        };
      }

      // Generate new tokens
      const tokens = this.generateTokens(user);

      return {
        success: true,
        token: tokens.token,
        refreshToken: tokens.refreshToken,
        user: {
          id: user._id.toString(),
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          isWholesaleCustomer: user.isWholesaleCustomer
        }
      };
    } catch (error) {
      logger.warn('Token refresh failed:', error);
      return {
        success: false,
        error: 'Invalid refresh token'
      };
    }
  }

  /**
   * Generate JWT tokens
   */
  private static generateTokens(user: IUser): { token: string; refreshToken: string } {
    const payload: JWTPayload = {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      isWholesaleCustomer: user.isWholesaleCustomer
    };

    const token = jwt.sign(payload, this.getJWTSecret(), {
      expiresIn: this.JWT_EXPIRES_IN
    } as jwt.SignOptions);

    const refreshToken = jwt.sign(payload, this.getJWTRefreshSecret(), {
      expiresIn: this.JWT_REFRESH_EXPIRES_IN
    } as jwt.SignOptions);

    return { token, refreshToken };
  }

  /**
   * Create admin user (for initial setup)
   */
  static async createAdminUser(userData: UserRegistrationData): Promise<AuthResult> {
    try {
      // Check if admin already exists
      const existingAdmin = await User.findOne({ role: 'admin' });
      if (existingAdmin) {
        return {
          success: false,
          error: 'Admin user already exists'
        };
      }

      // Create admin user
      const adminData = {
        ...userData,
        role: 'admin' as UserRole
      };

      return await this.register(adminData);
    } catch (error) {
      logger.error('Admin creation failed:', error);
      return {
        success: false,
        error: 'Failed to create admin user'
      };
    }
  }
}