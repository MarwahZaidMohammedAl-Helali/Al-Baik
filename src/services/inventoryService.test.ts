import { InventoryService } from './inventoryService';
import { AlertService } from './alertService';
import { Product } from '../models/Product';
import { connectDatabase } from '../config/database';
import mongoose from 'mongoose';

// Mock the AlertService to avoid dependencies during testing
jest.mock('./alertService');
const mockAlertService = AlertService as jest.Mocked<typeof AlertService>;

describe('InventoryService - Low Stock Alerts and Overselling Prevention', () => {
  beforeAll(async () => {
    await connectDatabase();
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('checkAvailability with overselling prevention', () => {
    it('should prevent overselling and generate alert when stock is insufficient', async () => {
      // Create a test product with low stock
      const product = new Product({
        name: 'Test Product',
        description: 'Test description',
        category: 'Electronics',
        brand: 'TestBrand',
        sku: 'TEST-001',
        images: [{ url: 'test.jpg', alt: 'Test image', isPrimary: true }],
        pricing: {
          retailPrice: 100,
          wholesalePrice: 80,
          costPrice: 60,
          currency: 'USD'
        },
        inventory: {
          quantity: 5,
          reserved: 0,
          lowStockThreshold: 10,
          trackInventory: true
        }
      });

      await product.save();

      // Mock the alert service
      mockAlertService.generateOversellAlert.mockResolvedValue({
        id: 'test-alert',
        type: 'overselling_attempt',
        title: 'Overselling Attempt Prevented',
        message: 'Test message',
        severity: 'high',
        targetRoles: ['admin', 'employee'],
        data: {},
        createdAt: new Date(),
        readBy: [],
        isActive: true
      });

      // Test overselling prevention
      const isAvailable = await InventoryService.checkAvailability(
        product._id.toString(),
        10, // Request more than available
        'test-user',
        'test-order-123'
      );

      expect(isAvailable).toBe(false);
      expect(mockAlertService.generateOversellAlert).toHaveBeenCalledWith(
        expect.objectContaining({
          productId: product._id.toString(),
          sku: 'TEST-001',
          productName: 'Test Product',
          requestedQuantity: 10,
          availableQuantity: 5,
          attemptedBy: 'test-user',
          orderReference: 'test-order-123'
        })
      );

      // Clean up
      await Product.findByIdAndDelete(product._id);
    });

    it('should allow purchase when stock is sufficient', async () => {
      // Create a test product with sufficient stock
      const product = new Product({
        name: 'Test Product 2',
        description: 'Test description',
        category: 'Electronics',
        brand: 'TestBrand',
        sku: 'TEST-002',
        images: [{ url: 'test.jpg', alt: 'Test image', isPrimary: true }],
        pricing: {
          retailPrice: 100,
          wholesalePrice: 80,
          costPrice: 60,
          currency: 'USD'
        },
        inventory: {
          quantity: 20,
          reserved: 0,
          lowStockThreshold: 10,
          trackInventory: true
        }
      });

      await product.save();

      // Test normal availability check
      const isAvailable = await InventoryService.checkAvailability(
        product._id.toString(),
        5, // Request less than available
        'test-user',
        'test-order-456'
      );

      expect(isAvailable).toBe(true);
      expect(mockAlertService.generateOversellAlert).not.toHaveBeenCalled();

      // Clean up
      await Product.findByIdAndDelete(product._id);
    });
  });

  describe('validateOrderQuantities', () => {
    it('should validate multiple items and prevent overselling', async () => {
      // Create test products
      const product1 = new Product({
        name: 'Product 1',
        description: 'Test description',
        category: 'Electronics',
        brand: 'TestBrand',
        sku: 'TEST-003',
        images: [{ url: 'test.jpg', alt: 'Test image', isPrimary: true }],
        pricing: {
          retailPrice: 100,
          wholesalePrice: 80,
          costPrice: 60,
          currency: 'USD'
        },
        inventory: {
          quantity: 5,
          reserved: 0,
          lowStockThreshold: 10,
          trackInventory: true
        }
      });

      const product2 = new Product({
        name: 'Product 2',
        description: 'Test description',
        category: 'Electronics',
        brand: 'TestBrand',
        sku: 'TEST-004',
        images: [{ url: 'test.jpg', alt: 'Test image', isPrimary: true }],
        pricing: {
          retailPrice: 100,
          wholesalePrice: 80,
          costPrice: 60,
          currency: 'USD'
        },
        inventory: {
          quantity: 15,
          reserved: 0,
          lowStockThreshold: 10,
          trackInventory: true
        }
      });

      await product1.save();
      await product2.save();

      // Mock the alert service
      mockAlertService.generateOversellAlert.mockResolvedValue({
        id: 'test-alert',
        type: 'overselling_attempt',
        title: 'Overselling Attempt Prevented',
        message: 'Test message',
        severity: 'high',
        targetRoles: ['admin', 'employee'],
        data: {},
        createdAt: new Date(),
        readBy: [],
        isActive: true
      });

      // Test order validation with mixed availability
      const validation = await InventoryService.validateOrderQuantities(
        [
          { productId: product1._id.toString(), quantity: 10 }, // Not available
          { productId: product2._id.toString(), quantity: 5 }   // Available
        ],
        'test-user',
        'test-order-789'
      );

      expect(validation.valid).toBe(false);
      expect(validation.errors).toHaveLength(1);
      expect(validation.errors[0]).toMatchObject({
        productId: product1._id.toString(),
        sku: 'TEST-003',
        requestedQuantity: 10,
        availableQuantity: 5
      });

      expect(mockAlertService.generateOversellAlert).toHaveBeenCalledTimes(1);

      // Clean up
      await Product.findByIdAndDelete(product1._id);
      await Product.findByIdAndDelete(product2._id);
    });
  });

  describe('getLowStockAlerts', () => {
    it('should generate low stock alerts for products below threshold', async () => {
      // Create test products with different stock levels
      const lowStockProduct = new Product({
        name: 'Low Stock Product',
        description: 'Test description',
        category: 'Electronics',
        brand: 'TestBrand',
        sku: 'LOW-001',
        images: [{ url: 'test.jpg', alt: 'Test image', isPrimary: true }],
        pricing: {
          retailPrice: 100,
          wholesalePrice: 80,
          costPrice: 60,
          currency: 'USD'
        },
        inventory: {
          quantity: 5,
          reserved: 0,
          lowStockThreshold: 10,
          trackInventory: true
        }
      });

      const outOfStockProduct = new Product({
        name: 'Out of Stock Product',
        description: 'Test description',
        category: 'Electronics',
        brand: 'TestBrand',
        sku: 'OUT-001',
        images: [{ url: 'test.jpg', alt: 'Test image', isPrimary: true }],
        pricing: {
          retailPrice: 100,
          wholesalePrice: 80,
          costPrice: 60,
          currency: 'USD'
        },
        inventory: {
          quantity: 0,
          reserved: 0,
          lowStockThreshold: 10,
          trackInventory: true
        }
      });

      await lowStockProduct.save();
      await outOfStockProduct.save();

      // Mock the alert service
      mockAlertService.generateLowStockAlerts.mockResolvedValue([]);

      // Get low stock alerts
      const alerts = await InventoryService.getLowStockAlerts(true);

      expect(alerts.length).toBeGreaterThanOrEqual(2);
      
      const lowAlert = alerts.find(a => a.sku === 'LOW-001');
      const outAlert = alerts.find(a => a.sku === 'OUT-001');

      expect(lowAlert).toBeDefined();
      expect(lowAlert?.severity).toBe('low');
      expect(lowAlert?.availableQuantity).toBe(5);

      expect(outAlert).toBeDefined();
      expect(outAlert?.severity).toBe('out_of_stock');
      expect(outAlert?.availableQuantity).toBe(0);

      expect(mockAlertService.generateLowStockAlerts).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ sku: 'LOW-001' }),
          expect.objectContaining({ sku: 'OUT-001' })
        ])
      );

      // Clean up
      await Product.findByIdAndDelete(lowStockProduct._id);
      await Product.findByIdAndDelete(outOfStockProduct._id);
    });
  });
});