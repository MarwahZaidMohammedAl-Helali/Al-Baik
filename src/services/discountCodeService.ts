import { DiscountCode, IDiscountCode } from '../models/DiscountCode';
import { logger } from '../utils/logger';
import { PaginationQuery } from '../types/common';

export interface CreateDiscountCodeData {
  code: string;
  type: 'wholesale' | 'promotional' | 'bulk';
  discountPercentage?: number;
  discountAmount?: number;
  minimumOrderValue?: number;
  maxUses?: number;
  validFrom: Date;
  validUntil: Date;
  applicableUserRoles: ('admin' | 'employee' | 'customer')[];
  description?: string;
}

export interface UpdateDiscountCodeData {
  type?: 'wholesale' | 'promotional' | 'bulk';
  discountPercentage?: number;
  discountAmount?: number;
  minimumOrderValue?: number;
  maxUses?: number;
  validFrom?: Date;
  validUntil?: Date;
  applicableUserRoles?: ('admin' | 'employee' | 'customer')[];
  description?: string;
  isActive?: boolean;
}

export interface DiscountCodeFilters {
  type?: 'wholesale' | 'promotional' | 'bulk';
  isActive?: boolean;
  userRole?: 'admin' | 'employee' | 'customer';
  expiringSoon?: boolean; // Within 7 days
}

export interface DiscountCodeSearchOptions extends DiscountCodeFilters, PaginationQuery {
  search?: string;
}

export interface DiscountCodeListResult {
  discountCodes: IDiscountCode[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class DiscountCodeService {
  /**
   * Create a new discount code
   */
  static async createDiscountCode(data: CreateDiscountCodeData): Promise<IDiscountCode> {
    try {
      // Check if code already exists
      const existingCode = await DiscountCode.findOne({ code: data.code.toUpperCase() });
      if (existingCode) {
        throw new Error(`Discount code ${data.code} already exists`);
      }

      // Create new discount code
      const discountCode = new DiscountCode({
        ...data,
        code: data.code.toUpperCase()
      });

      await discountCode.save();

      logger.info('Discount code created successfully', {
        code: discountCode.code,
        type: discountCode.type,
        validFrom: discountCode.validFrom,
        validUntil: discountCode.validUntil
      });

      return discountCode;
    } catch (error) {
      logger.error('Discount code creation failed:', error);
      throw error;
    }
  }

  /**
   * Update an existing discount code
   */
  static async updateDiscountCode(codeId: string, updates: UpdateDiscountCodeData): Promise<IDiscountCode> {
    try {
      const discountCode = await DiscountCode.findById(codeId);
      
      if (!discountCode) {
        throw new Error('Discount code not found');
      }

      // Apply updates
      Object.assign(discountCode, updates);
      await discountCode.save();

      logger.info('Discount code updated successfully', {
        codeId,
        code: discountCode.code,
        updatedFields: Object.keys(updates)
      });

      return discountCode;
    } catch (error) {
      logger.error('Discount code update failed:', error);
      throw error;
    }
  }

  /**
   * Get discount code by ID
   */
  static async getDiscountCodeById(codeId: string): Promise<IDiscountCode | null> {
    try {
      const discountCode = await DiscountCode.findById(codeId);
      return discountCode;
    } catch (error) {
      logger.error('Get discount code by ID failed:', error);
      throw error;
    }
  }

  /**
   * Get discount code by code string
   */
  static async getDiscountCodeByCode(code: string): Promise<IDiscountCode | null> {
    try {
      const discountCode = await DiscountCode.findOne({ code: code.toUpperCase() });
      return discountCode;
    } catch (error) {
      logger.error('Get discount code by code failed:', error);
      throw error;
    }
  }

  /**
   * Get discount codes with filtering and pagination
   */
  static async getDiscountCodes(options: DiscountCodeSearchOptions = {}): Promise<DiscountCodeListResult> {
    try {
      const {
        page = 1,
        limit = 20,
        sort = 'createdAt',
        order = 'desc',
        search,
        type,
        isActive,
        userRole,
        expiringSoon
      } = options;

      // Build query
      const query: any = {};

      // Type filter
      if (type) query.type = type;

      // Active filter
      if (isActive !== undefined) query.isActive = isActive;

      // User role filter
      if (userRole) query.applicableUserRoles = userRole;

      // Expiring soon filter
      if (expiringSoon) {
        const now = new Date();
        const sevenDaysFromNow = new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000));
        query.validUntil = { $gte: now, $lte: sevenDaysFromNow };
        query.validFrom = { $lte: now };
      }

      // Text search
      if (search) {
        query.$or = [
          { code: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } }
        ];
      }

      // Build sort object
      const sortObj: any = {};
      sortObj[sort] = order === 'desc' ? -1 : 1;

      // Execute query with pagination
      const skip = (page - 1) * limit;
      const [discountCodes, total] = await Promise.all([
        DiscountCode.find(query)
          .sort(sortObj)
          .skip(skip)
          .limit(limit),
        DiscountCode.countDocuments(query)
      ]);

      return {
        discountCodes,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      };
    } catch (error) {
      logger.error('Get discount codes failed:', error);
      throw error;
    }
  }

  /**
   * Get active discount codes for a user role
   */
  static async getActiveCodesForUser(userRole: 'admin' | 'employee' | 'customer'): Promise<IDiscountCode[]> {
    try {
      const codes = await (DiscountCode as any).findActiveCodes(userRole);
      return codes;
    } catch (error) {
      logger.error('Get active codes for user failed:', error);
      throw error;
    }
  }

  /**
   * Get expiring discount codes
   */
  static async getExpiringCodes(days: number = 7): Promise<IDiscountCode[]> {
    try {
      const codes = await (DiscountCode as any).findExpiringCodes(days);
      return codes;
    } catch (error) {
      logger.error('Get expiring codes failed:', error);
      throw error;
    }
  }

  /**
   * Get overused discount codes
   */
  static async getOverusedCodes(): Promise<IDiscountCode[]> {
    try {
      const codes = await (DiscountCode as any).findOverusedCodes();
      return codes;
    } catch (error) {
      logger.error('Get overused codes failed:', error);
      throw error;
    }
  }

  /**
   * Deactivate discount code
   */
  static async deactivateDiscountCode(codeId: string): Promise<boolean> {
    try {
      const discountCode = await DiscountCode.findById(codeId);
      
      if (!discountCode) {
        throw new Error('Discount code not found');
      }

      discountCode.isActive = false;
      await discountCode.save();

      logger.info('Discount code deactivated', {
        codeId,
        code: discountCode.code
      });

      return true;
    } catch (error) {
      logger.error('Discount code deactivation failed:', error);
      throw error;
    }
  }

  /**
   * Delete discount code (hard delete)
   */
  static async deleteDiscountCode(codeId: string): Promise<boolean> {
    try {
      const result = await DiscountCode.findByIdAndDelete(codeId);
      
      if (!result) {
        throw new Error('Discount code not found');
      }

      logger.info('Discount code deleted', {
        codeId,
        code: result.code
      });

      return true;
    } catch (error) {
      logger.error('Discount code deletion failed:', error);
      throw error;
    }
  }

  /**
   * Increment usage count for a discount code
   */
  static async incrementUsage(code: string): Promise<IDiscountCode> {
    try {
      const discountCode = await DiscountCode.findOneAndUpdate(
        { code: code.toUpperCase(), isActive: true },
        { $inc: { currentUses: 1 } },
        { new: true }
      );

      if (!discountCode) {
        throw new Error('Discount code not found or inactive');
      }

      logger.info('Discount code usage incremented', {
        code: discountCode.code,
        currentUses: discountCode.currentUses,
        maxUses: discountCode.maxUses
      });

      return discountCode;
    } catch (error) {
      logger.error('Increment usage failed:', error);
      throw error;
    }
  }

  /**
   * Get discount code statistics
   */
  static async getStatistics(): Promise<{
    total: number;
    active: number;
    expired: number;
    expiringSoon: number;
    overused: number;
    byType: Record<string, number>;
  }> {
    try {
      const now = new Date();
      const sevenDaysFromNow = new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000));

      const [
        total,
        active,
        expired,
        expiringSoon,
        overused,
        byType
      ] = await Promise.all([
        DiscountCode.countDocuments({}),
        DiscountCode.countDocuments({ 
          isActive: true,
          validFrom: { $lte: now },
          validUntil: { $gte: now }
        }),
        DiscountCode.countDocuments({
          $or: [
            { validUntil: { $lt: now } },
            { validFrom: { $gt: now } }
          ]
        }),
        DiscountCode.countDocuments({
          isActive: true,
          validFrom: { $lte: now },
          validUntil: { $gte: now, $lte: sevenDaysFromNow }
        }),
        DiscountCode.countDocuments({
          isActive: true,
          maxUses: { $ne: null },
          $expr: { $gte: ['$currentUses', '$maxUses'] }
        }),
        DiscountCode.aggregate([
          { $group: { _id: '$type', count: { $sum: 1 } } }
        ])
      ]);

      const typeStats = byType.reduce((acc: Record<string, number>, item: any) => {
        acc[item._id] = item.count;
        return acc;
      }, {});

      return {
        total,
        active,
        expired,
        expiringSoon,
        overused,
        byType: typeStats
      };
    } catch (error) {
      logger.error('Get statistics failed:', error);
      throw error;
    }
  }
}