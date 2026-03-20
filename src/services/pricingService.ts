import { Product, IProduct } from '../models/Product';
import { DiscountCode, IDiscountCode } from '../models/DiscountCode';
import { logger } from '../utils/logger';

export interface CartItem {
  productId: string;
  quantity: number;
  product?: IProduct;
}

export interface PriceResult {
  originalPrice: number;
  finalPrice: number;
  discountApplied: number;
  discountType: 'wholesale' | 'bulk' | 'promotional' | 'none';
  discountCode?: string;
}

export interface BulkPriceResult {
  items: Array<{
    productId: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    originalUnitPrice: number;
    discountApplied: number;
  }>;
  subtotal: number;
  totalDiscount: number;
  finalTotal: number;
  discountType: 'wholesale' | 'bulk' | 'promotional' | 'none';
  discountCode?: string;
}

export interface DiscountValidation {
  isValid: boolean;
  discountCode?: IDiscountCode;
  error?: string;
}

export type UserRole = 'admin' | 'employee' | 'customer';

export class PricingService {
  /**
   * Calculate price for a single product with wholesale customer support
   */
  static async calculatePrice(
    productId: string,
    userType: UserRole,
    isWholesaleCustomer: boolean = false,
    discountCode?: string,
    quantity: number = 1
  ): Promise<PriceResult> {
    try {
      const product = await Product.findById(productId);
      if (!product || !product.isActive) {
        throw new Error('Product not found or inactive');
      }

      // Get base price based on user type and wholesale status
      let basePrice = this.getBasePriceForUser(product, userType, isWholesaleCustomer);
      const originalPrice = basePrice * quantity;
      let finalPrice = originalPrice;
      let discountApplied = 0;
      let discountType: PriceResult['discountType'] = 'none';
      let appliedDiscountCode: string | undefined;

      // Apply wholesale pricing first if applicable
      if (isWholesaleCustomer && userType === 'customer') {
        const wholesalePrice = product.pricing.wholesalePrice * quantity;
        if (wholesalePrice < originalPrice) {
          discountApplied = originalPrice - wholesalePrice;
          finalPrice = wholesalePrice;
          discountType = 'wholesale';
        }
      }

      // Apply discount code if provided (can override wholesale pricing if better)
      if (discountCode) {
        const discountValidation = await this.validateDiscountCode(discountCode);
        if (discountValidation.isValid && discountValidation.discountCode) {
          const discount = discountValidation.discountCode;
          
          // Check if user role is applicable
          if (discount.applicableUserRoles.includes(userType)) {
            // Check minimum order value
            if (!discount.minimumOrderValue || originalPrice >= discount.minimumOrderValue) {
              const discountAmount = this.calculateDiscountAmount(
                originalPrice,
                discount.discountPercentage,
                discount.discountAmount
              );
              
              // Apply discount code only if it's better than current discount
              if (discountAmount > discountApplied) {
                discountApplied = discountAmount;
                finalPrice = Math.max(0, originalPrice - discountAmount);
                discountType = discount.type as PriceResult['discountType'];
                appliedDiscountCode = discountCode;
              }
            }
          }
        }
      }

      // Apply bulk discount if no better discount and quantity qualifies
      if (quantity >= 10) {
        const bulkDiscountPercent = this.getBulkDiscountPercent(quantity);
        if (bulkDiscountPercent > 0) {
          const bulkDiscountAmount = originalPrice * (bulkDiscountPercent / 100);
          if (bulkDiscountAmount > discountApplied) {
            discountApplied = bulkDiscountAmount;
            finalPrice = originalPrice - discountApplied;
            discountType = 'bulk';
            appliedDiscountCode = undefined; // Clear discount code if bulk is better
          }
        }
      }

      const result: PriceResult = {
        originalPrice,
        finalPrice: Math.round(finalPrice * 100) / 100, // Round to 2 decimal places
        discountApplied: Math.round(discountApplied * 100) / 100,
        discountType
      };

      if (appliedDiscountCode) {
        result.discountCode = appliedDiscountCode;
      }

      logger.info('Price calculated', {
        productId,
        userType,
        isWholesaleCustomer,
        quantity,
        result
      });

      return result;
    } catch (error) {
      logger.error('Price calculation failed:', error);
      throw error;
    }
  }

  /**
   * Validate and apply discount code
   */
  static async validateAndApplyDiscount(
    code: string,
    orderTotal: number,
    userRole: UserRole
  ): Promise<{
    valid: boolean;
    discountAmount?: number;
    discountType?: string;
    error?: string;
  }> {
    try {
      const validation = await this.validateDiscountCode(code);
      
      if (!validation.isValid || !validation.discountCode) {
        return {
          valid: false,
          error: validation.error || 'Invalid discount code'
        };
      }

      const discount = validation.discountCode;

      // Check if user role is applicable
      if (!discount.applicableUserRoles.includes(userRole)) {
        return {
          valid: false,
          error: 'Discount code not applicable for your account type'
        };
      }

      // Check minimum order value
      if (discount.minimumOrderValue && orderTotal < discount.minimumOrderValue) {
        return {
          valid: false,
          error: `Minimum order value of $${discount.minimumOrderValue} required`
        };
      }

      const discountAmount = this.calculateDiscountAmount(
        orderTotal,
        discount.discountPercentage,
        discount.discountAmount
      );

      return {
        valid: true,
        discountAmount,
        discountType: discount.type
      };
    } catch (error) {
      logger.error('Discount validation and application failed:', error);
      return {
        valid: false,
        error: 'Failed to validate discount code'
      };
    }
  }

  /**
   * Validate discount code
   */
  static async validateDiscountCode(code: string): Promise<DiscountValidation> {
    try {
      const discountCode = await DiscountCode.findOne({ 
        code: code.toUpperCase(),
        isActive: true 
      });

      if (!discountCode) {
        return {
          isValid: false,
          error: 'Invalid discount code'
        };
      }

      const now = new Date();

      // Check if code is within valid date range
      if (now < discountCode.validFrom || now > discountCode.validUntil) {
        return {
          isValid: false,
          error: 'Discount code has expired'
        };
      }

      // Check usage limits
      if (discountCode.maxUses && discountCode.currentUses >= discountCode.maxUses) {
        return {
          isValid: false,
          error: 'Discount code usage limit exceeded'
        };
      }

      return {
        isValid: true,
        discountCode
      };
    } catch (error) {
      logger.error('Discount code validation failed:', error);
      return {
        isValid: false,
        error: 'Failed to validate discount code'
      };
    }
  }

  /**
   * Apply bulk discount to multiple items
   */
  static async applyBulkDiscount(
    items: CartItem[],
    userType: UserRole,
    discountCode?: string
  ): Promise<BulkPriceResult> {
    try {
      // Load product details for all items
      const itemsWithProducts = await Promise.all(
        items.map(async (item) => {
          const product = await Product.findById(item.productId);
          if (!product || !product.isActive) {
            throw new Error(`Product ${item.productId} not found or inactive`);
          }
          return { ...item, product };
        })
      );

      let subtotal = 0;
      let totalDiscount = 0;
      let discountType: BulkPriceResult['discountType'] = 'none';
      let appliedDiscountCode: string | undefined;

      // Calculate individual item prices
      const processedItems = await Promise.all(
        itemsWithProducts.map(async (item) => {
          const priceResult = await this.calculatePrice(
            item.productId,
            userType,
            false, // isWholesaleCustomer - would need to be passed from caller
            discountCode,
            item.quantity
          );

          const itemResult = {
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: priceResult.finalPrice / item.quantity,
            totalPrice: priceResult.finalPrice,
            originalUnitPrice: priceResult.originalPrice / item.quantity,
            discountApplied: priceResult.discountApplied
          };

          subtotal += priceResult.originalPrice;
          totalDiscount += priceResult.discountApplied;

          // Track the best discount type applied
          if (priceResult.discountType !== 'none') {
            discountType = priceResult.discountType;
            if (priceResult.discountCode) {
              appliedDiscountCode = priceResult.discountCode;
            }
          }

          return itemResult;
        })
      );

      // Calculate total quantity for additional bulk discounts
      const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);

      // Apply additional bulk discount if total quantity qualifies and no discount code used
      if (!appliedDiscountCode && totalQuantity >= 50) {
        const additionalBulkPercent = this.getAdditionalBulkDiscountPercent(totalQuantity);
        if (additionalBulkPercent > 0) {
          const additionalDiscount = subtotal * (additionalBulkPercent / 100);
          totalDiscount += additionalDiscount;
          discountType = 'bulk';

          // Distribute additional discount proportionally
          processedItems.forEach((item) => {
            const itemProportion = item.totalPrice / (subtotal - totalDiscount + additionalDiscount);
            const itemAdditionalDiscount = additionalDiscount * itemProportion;
            item.discountApplied += itemAdditionalDiscount;
            item.totalPrice -= itemAdditionalDiscount;
            item.unitPrice = item.totalPrice / item.quantity;
          });
        }
      }

      const finalTotal = subtotal - totalDiscount;

      const result: BulkPriceResult = {
        items: processedItems.map(item => ({
          ...item,
          unitPrice: Math.round(item.unitPrice * 100) / 100,
          totalPrice: Math.round(item.totalPrice * 100) / 100,
          originalUnitPrice: Math.round(item.originalUnitPrice * 100) / 100,
          discountApplied: Math.round(item.discountApplied * 100) / 100
        })),
        subtotal: Math.round(subtotal * 100) / 100,
        totalDiscount: Math.round(totalDiscount * 100) / 100,
        finalTotal: Math.round(finalTotal * 100) / 100,
        discountType
      };

      if (appliedDiscountCode) {
        result.discountCode = appliedDiscountCode;
      }

      logger.info('Bulk pricing calculated', {
        itemCount: items.length,
        totalQuantity,
        userType,
        result: {
          subtotal: result.subtotal,
          totalDiscount: result.totalDiscount,
          finalTotal: result.finalTotal,
          discountType: result.discountType
        }
      });

      return result;
    } catch (error) {
      logger.error('Bulk discount calculation failed:', error);
      throw error;
    }
  }

  /**
   * Get base price for user type with wholesale support
   */
  private static getBasePriceForUser(product: IProduct, userType: UserRole, isWholesaleCustomer: boolean = false): number {
    switch (userType) {
      case 'admin':
      case 'employee':
        // Admin and employees see cost price for reference
        return product.pricing.costPrice;
      case 'customer':
      default:
        // Wholesale customers get wholesale price as base, others get retail
        return isWholesaleCustomer ? product.pricing.wholesalePrice : product.pricing.retailPrice;
    }
  }

  /**
   * Calculate discount amount from percentage or fixed amount
   */
  private static calculateDiscountAmount(
    originalPrice: number,
    discountPercentage?: number,
    discountAmount?: number
  ): number {
    if (discountAmount) {
      return Math.min(discountAmount, originalPrice);
    }
    
    if (discountPercentage) {
      return originalPrice * (discountPercentage / 100);
    }
    
    return 0;
  }

  /**
   * Get bulk discount percentage based on quantity
   */
  private static getBulkDiscountPercent(quantity: number): number {
    if (quantity >= 100) return 15;
    if (quantity >= 50) return 10;
    if (quantity >= 25) return 7;
    if (quantity >= 10) return 5;
    return 0;
  }

  /**
   * Get additional bulk discount for large orders
   */
  private static getAdditionalBulkDiscountPercent(totalQuantity: number): number {
    if (totalQuantity >= 500) return 5;
    if (totalQuantity >= 200) return 3;
    if (totalQuantity >= 100) return 2;
    if (totalQuantity >= 50) return 1;
    return 0;
  }

  /**
   * Apply discount code usage (increment usage count)
   */
  static async applyDiscountCodeUsage(code: string): Promise<void> {
    try {
      await DiscountCode.findOneAndUpdate(
        { code: code.toUpperCase(), isActive: true },
        { $inc: { currentUses: 1 } }
      );

      logger.info('Discount code usage applied', { code });
    } catch (error) {
      logger.error('Failed to apply discount code usage:', error);
      throw error;
    }
  }

  /**
   * Get pricing summary for display
   */
  static async getPricingSummary(
    items: CartItem[],
    userType: UserRole,
    discountCode?: string
  ): Promise<{
    itemCount: number;
    totalQuantity: number;
    subtotal: number;
    discountAmount: number;
    finalTotal: number;
    discountType: string;
    discountCode?: string;
    savings: number;
  }> {
    const bulkResult = await this.applyBulkDiscount(items, userType, discountCode);
    
    const summary: {
      itemCount: number;
      totalQuantity: number;
      subtotal: number;
      discountAmount: number;
      finalTotal: number;
      discountType: string;
      discountCode?: string;
      savings: number;
    } = {
      itemCount: bulkResult.items.length,
      totalQuantity: bulkResult.items.reduce((sum, item) => sum + item.quantity, 0),
      subtotal: bulkResult.subtotal,
      discountAmount: bulkResult.totalDiscount,
      finalTotal: bulkResult.finalTotal,
      discountType: bulkResult.discountType,
      savings: bulkResult.totalDiscount
    };

    if (bulkResult.discountCode) {
      summary.discountCode = bulkResult.discountCode;
    }

    return summary;
  }
}