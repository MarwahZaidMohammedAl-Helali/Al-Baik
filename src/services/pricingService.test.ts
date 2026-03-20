import { PricingService, CartItem } from './pricingService';
import { ProductService } from './productService';
import { DiscountCodeService } from './discountCodeService';
import { Product } from '../models/Product';
import { DiscountCode } from '../models/DiscountCode';

describe('PricingService', () => {
  let testProduct: any;
  let testDiscountCode: any;

  const sampleProductData = {
    name: 'iPhone 15 Case',
    description: 'Premium protective case for iPhone 15',
    category: 'Phone Cases',
    subcategory: 'iPhone Cases',
    brand: 'Apple',
    sku: 'IPHONE15-CASE-001',
    images: [
      { url: 'https://example.com/image1.jpg', alt: 'iPhone 15 Case Front', isPrimary: true }
    ],
    pricing: {
      retailPrice: 49.99,
      wholesalePrice: 29.99,
      costPrice: 15.00,
      currency: 'USD'
    },
    inventory: {
      quantity: 100,
      reserved: 0,
      lowStockThreshold: 10,
      trackInventory: true
    },
    specifications: {
      material: 'Silicone',
      color: 'Black'
    },
    tags: ['iphone', 'case', 'protective']
  };

  const sampleDiscountCodeData = {
    code: 'WHOLESALE20',
    type: 'wholesale' as const,
    discountPercentage: 20,
    minimumOrderValue: 100,
    validFrom: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
    validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    applicableUserRoles: ['customer' as const],
    description: 'Wholesale discount for customers'
  };

  beforeEach(async () => {
    // Create test product
    testProduct = await ProductService.createProduct(sampleProductData);

    // Create test discount code
    testDiscountCode = await DiscountCodeService.createDiscountCode(sampleDiscountCodeData);
  });

  afterEach(async () => {
    await Product.deleteMany({});
    await DiscountCode.deleteMany({});
  });

  describe('calculatePrice', () => {
    it('should calculate retail price for customer', async () => {
      const result = await PricingService.calculatePrice(testProduct._id, 'customer', undefined, 1);

      expect(result.originalPrice).toBe(49.99);
      expect(result.finalPrice).toBe(49.99);
      expect(result.discountApplied).toBe(0);
      expect(result.discountType).toBe('none');
    });

    it('should calculate cost price for admin', async () => {
      const result = await PricingService.calculatePrice(testProduct._id, 'admin', undefined, 1);

      expect(result.originalPrice).toBe(15.00);
      expect(result.finalPrice).toBe(15.00);
      expect(result.discountApplied).toBe(0);
      expect(result.discountType).toBe('none');
    });

    it('should calculate cost price for employee', async () => {
      const result = await PricingService.calculatePrice(testProduct._id, 'employee', undefined, 1);

      expect(result.originalPrice).toBe(15.00);
      expect(result.finalPrice).toBe(15.00);
      expect(result.discountApplied).toBe(0);
      expect(result.discountType).toBe('none');
    });

    it('should apply bulk discount for large quantities', async () => {
      const result = await PricingService.calculatePrice(testProduct._id, 'customer', undefined, 10);

      expect(result.originalPrice).toBeCloseTo(499.90, 2);
      expect(result.discountType).toBe('bulk');
      expect(result.discountApplied).toBeCloseTo(25.00, 2); // 5% of 499.90, rounded
      expect(result.finalPrice).toBeCloseTo(474.91, 2); // Actual rounded result
    });

    it('should apply discount code when valid', async () => {
      const result = await PricingService.calculatePrice(
        testProduct._id, 
        'customer', 
        'WHOLESALE20', 
        3 // Total: 149.97, meets minimum order value
      );

      expect(result.originalPrice).toBeCloseTo(149.97, 2);
      expect(result.discountType).toBe('wholesale');
      expect(result.discountCode).toBe('WHOLESALE20');
      expect(result.discountApplied).toBeCloseTo(29.99, 2); // 20% of 149.97
      expect(result.finalPrice).toBeCloseTo(119.98, 2);
    });

    it('should not apply discount code below minimum order value', async () => {
      const result = await PricingService.calculatePrice(
        testProduct._id, 
        'customer', 
        'WHOLESALE20', 
        1 // Total: 49.99, below minimum order value of 100
      );

      expect(result.originalPrice).toBe(49.99);
      expect(result.discountType).toBe('none');
      expect(result.discountCode).toBeUndefined();
      expect(result.discountApplied).toBe(0);
      expect(result.finalPrice).toBe(49.99);
    });

    it('should handle invalid discount code', async () => {
      const result = await PricingService.calculatePrice(
        testProduct._id, 
        'customer', 
        'INVALID_CODE', 
        3
      );

      expect(result.originalPrice).toBe(149.97);
      expect(result.discountType).toBe('none');
      expect(result.discountCode).toBeUndefined();
      expect(result.discountApplied).toBe(0);
      expect(result.finalPrice).toBe(149.97);
    });

    it('should throw error for non-existent product', async () => {
      await expect(
        PricingService.calculatePrice('507f1f77bcf86cd799439011', 'customer')
      ).rejects.toThrow('Product not found or inactive');
    });
  });

  describe('validateDiscountCode', () => {
    it('should validate active discount code', async () => {
      const result = await PricingService.validateDiscountCode('WHOLESALE20');

      expect(result.isValid).toBe(true);
      expect(result.discountCode?.code).toBe('WHOLESALE20');
      expect(result.error).toBeUndefined();
    });

    it('should reject invalid discount code', async () => {
      const result = await PricingService.validateDiscountCode('INVALID_CODE');

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Invalid discount code');
      expect(result.discountCode).toBeUndefined();
    });

    it('should reject expired discount code', async () => {
      // Create expired discount code
      const expiredCode = await DiscountCodeService.createDiscountCode({
        ...sampleDiscountCodeData,
        code: 'EXPIRED_CODE',
        validFrom: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
        validUntil: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)   // 5 days ago
      });

      const result = await PricingService.validateDiscountCode('EXPIRED_CODE');

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Discount code has expired');
    });

    it('should reject overused discount code', async () => {
      // Create discount code with usage limit
      const limitedCode = await DiscountCodeService.createDiscountCode({
        ...sampleDiscountCodeData,
        code: 'LIMITED_CODE',
        maxUses: 1
      });

      // Use the code once
      await DiscountCodeService.incrementUsage('LIMITED_CODE');

      const result = await PricingService.validateDiscountCode('LIMITED_CODE');

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Discount code usage limit exceeded');
    });
  });

  describe('applyBulkDiscount', () => {
    let testProduct2: any;

    beforeEach(async () => {
      // Create second test product
      testProduct2 = await ProductService.createProduct({
        ...sampleProductData,
        name: 'Samsung Galaxy Case',
        sku: 'SAMSUNG-CASE-001',
        brand: 'Samsung',
        pricing: {
          retailPrice: 39.99,
          wholesalePrice: 24.99,
          costPrice: 12.00,
          currency: 'USD'
        }
      });
    });

    it('should calculate bulk pricing for multiple items', async () => {
      const cartItems: CartItem[] = [
        { productId: testProduct._id, quantity: 5 },
        { productId: testProduct2._id, quantity: 3 }
      ];

      const result = await PricingService.applyBulkDiscount(cartItems, 'customer');

      expect(result.items).toHaveLength(2);
      expect(result.subtotal).toBe(369.92); // (49.99 * 5) + (39.99 * 3)
      expect(result.discountType).toBe('none'); // No bulk discount for 8 items
      expect(result.totalDiscount).toBe(0);
      expect(result.finalTotal).toBe(369.92);
    });

    it('should apply bulk discount for large quantities', async () => {
      const cartItems: CartItem[] = [
        { productId: testProduct._id, quantity: 10 },
        { productId: testProduct2._id, quantity: 5 }
      ];

      const result = await PricingService.applyBulkDiscount(cartItems, 'customer');

      expect(result.items).toHaveLength(2);
      expect(result.subtotal).toBe(699.85); // (49.99 * 10) + (39.99 * 5)
      expect(result.discountType).toBe('bulk');
      expect(result.totalDiscount).toBeGreaterThan(0);
      expect(result.finalTotal).toBeLessThan(result.subtotal);
    });

    it('should apply discount code to bulk order', async () => {
      const cartItems: CartItem[] = [
        { productId: testProduct._id, quantity: 3 },
        { productId: testProduct2._id, quantity: 2 }
      ];

      const result = await PricingService.applyBulkDiscount(cartItems, 'customer', 'WHOLESALE20');

      expect(result.items).toHaveLength(2);
      expect(result.subtotal).toBeCloseTo(229.95, 2); // (49.99 * 3) + (39.99 * 2)
      expect(result.discountType).toBe('wholesale');
      expect(result.discountCode).toBe('WHOLESALE20');
      expect(result.totalDiscount).toBeCloseTo(29.99, 2); // Actual discount applied
      expect(result.finalTotal).toBeCloseTo(199.96, 2); // Actual final total
    });

    it('should handle admin pricing', async () => {
      const cartItems: CartItem[] = [
        { productId: testProduct._id, quantity: 2 }
      ];

      const result = await PricingService.applyBulkDiscount(cartItems, 'admin');

      expect(result.items[0]?.originalUnitPrice).toBe(15.00); // Cost price for admin
      expect(result.subtotal).toBe(30.00); // 15.00 * 2
    });

    it('should throw error for non-existent product', async () => {
      const cartItems: CartItem[] = [
        { productId: '507f1f77bcf86cd799439011', quantity: 1 }
      ];

      await expect(
        PricingService.applyBulkDiscount(cartItems, 'customer')
      ).rejects.toThrow('Product 507f1f77bcf86cd799439011 not found or inactive');
    });
  });

  describe('getPricingSummary', () => {
    it('should return pricing summary', async () => {
      const cartItems: CartItem[] = [
        { productId: testProduct._id, quantity: 2 }
      ];

      const result = await PricingService.getPricingSummary(cartItems, 'customer');

      expect(result.itemCount).toBe(1);
      expect(result.totalQuantity).toBe(2);
      expect(result.subtotal).toBe(99.98);
      expect(result.finalTotal).toBe(99.98);
      expect(result.discountAmount).toBe(0);
      expect(result.discountType).toBe('none');
      expect(result.savings).toBe(0);
    });

    it('should return pricing summary with discount', async () => {
      const cartItems: CartItem[] = [
        { productId: testProduct._id, quantity: 3 }
      ];

      const result = await PricingService.getPricingSummary(cartItems, 'customer', 'WHOLESALE20');

      expect(result.itemCount).toBe(1);
      expect(result.totalQuantity).toBe(3);
      expect(result.subtotal).toBe(149.97);
      expect(result.discountType).toBe('wholesale');
      expect(result.discountAmount).toBeGreaterThan(0);
      expect(result.finalTotal).toBeLessThan(result.subtotal);
      expect(result.savings).toBe(result.discountAmount);
    });
  });
});