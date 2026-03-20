import request from 'supertest';
import { app } from '../../server';
import { connectDatabase } from '../../config/database';
import { Product } from '../../models/Product';
import { User } from '../../models/User';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';

describe('Inventory Alerts Integration Tests', () => {
  let adminToken: string;
  let employeeToken: string;
  let testProduct: any;

  beforeAll(async () => {
    await connectDatabase();
    
    // Create test users
    const adminUser = new User({
      email: 'admin@test.com',
      password: 'password123',
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin',
      isWholesaleCustomer: false
    });
    await adminUser.save();

    const employeeUser = new User({
      email: 'employee@test.com',
      password: 'password123',
      firstName: 'Employee',
      lastName: 'User',
      role: 'employee',
      isWholesaleCustomer: false
    });
    await employeeUser.save();

    // Generate JWT tokens
    const jwtSecret = process.env.JWT_SECRET || 'test-secret';
    adminToken = jwt.sign(
      {
        id: adminUser._id.toString(),
        email: adminUser.email,
        role: adminUser.role,
        isWholesaleCustomer: adminUser.isWholesaleCustomer
      },
      jwtSecret,
      { expiresIn: '1h' }
    );

    employeeToken = jwt.sign(
      {
        id: employeeUser._id.toString(),
        email: employeeUser.email,
        role: employeeUser.role,
        isWholesaleCustomer: employeeUser.isWholesaleCustomer
      },
      jwtSecret,
      { expiresIn: '1h' }
    );

    // Create test product with low stock
    testProduct = new Product({
      name: 'Low Stock Test Product',
      description: 'Test product for low stock alerts',
      category: 'Electronics',
      brand: 'TestBrand',
      sku: 'LOW-STOCK-001',
      images: [{ url: 'test.jpg', alt: 'Test image', isPrimary: true }],
      pricing: {
        retailPrice: 100,
        wholesalePrice: 80,
        costPrice: 60,
        currency: 'USD'
      },
      inventory: {
        quantity: 3, // Below threshold
        reserved: 0,
        lowStockThreshold: 10,
        trackInventory: true
      }
    });
    await testProduct.save();
  });

  afterAll(async () => {
    // Clean up test data
    await User.deleteMany({ email: { $in: ['admin@test.com', 'employee@test.com'] } });
    await Product.deleteMany({ sku: 'LOW-STOCK-001' });
    await mongoose.connection.close();
  });

  describe('Low Stock Alerts', () => {
    it('should generate low stock alerts for admin users', async () => {
      const response = await request(app)
        .get('/api/inventory/alerts/low-stock')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.alerts).toBeDefined();
      expect(Array.isArray(response.body.data.alerts)).toBe(true);
      
      // Should find our test product in low stock alerts
      const lowStockAlert = response.body.data.alerts.find(
        (alert: any) => alert.sku === 'LOW-STOCK-001'
      );
      expect(lowStockAlert).toBeDefined();
      expect(lowStockAlert.severity).toBe('low');
      expect(lowStockAlert.availableQuantity).toBe(3);
      expect(lowStockAlert.lowStockThreshold).toBe(10);
    });

    it('should generate low stock alerts for employee users', async () => {
      const response = await request(app)
        .get('/api/inventory/alerts/low-stock')
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.alerts).toBeDefined();
    });

    it('should deny access to low stock alerts for unauthenticated users', async () => {
      await request(app)
        .get('/api/inventory/alerts/low-stock')
        .expect(401);
    });
  });

  describe('Overselling Prevention', () => {
    it('should prevent overselling when checking availability', async () => {
      const response = await request(app)
        .get(`/api/inventory/${testProduct._id}/availability?quantity=15`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.available).toBe(false);
      expect(response.body.data.requestedQuantity).toBe(15);
    });

    it('should allow purchase when stock is sufficient', async () => {
      const response = await request(app)
        .get(`/api/inventory/${testProduct._id}/availability?quantity=2`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.available).toBe(true);
      expect(response.body.data.requestedQuantity).toBe(2);
    });

    it('should validate order quantities and prevent overselling', async () => {
      const orderItems = [
        {
          productId: testProduct._id.toString(),
          quantity: 20 // More than available
        }
      ];

      const response = await request(app)
        .post('/api/alerts/inventory/validate-order')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ items: orderItems, orderReference: 'TEST-ORDER-001' })
        .expect(409); // Conflict due to insufficient stock

      expect(response.body.success).toBe(true);
      expect(response.body.data.valid).toBe(false);
      expect(response.body.data.errors).toHaveLength(1);
      expect(response.body.data.errors[0].sku).toBe('LOW-STOCK-001');
    });
  });

  describe('Alert Management', () => {
    it('should get alerts for admin users', async () => {
      const response = await request(app)
        .get('/api/alerts')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.alerts).toBeDefined();
      expect(response.body.data.total).toBeDefined();
      expect(response.body.data.unread).toBeDefined();
    });

    it('should get alert statistics', async () => {
      const response = await request(app)
        .get('/api/alerts/stats')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.total).toBeDefined();
      expect(response.body.data.byType).toBeDefined();
      expect(response.body.data.bySeverity).toBeDefined();
      expect(response.body.data.unread).toBeDefined();
    });

    it('should trigger inventory monitoring', async () => {
      const response = await request(app)
        .post('/api/alerts/inventory/monitor')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toBe('Inventory monitoring completed');
      expect(response.body.data.lowStockCount).toBeDefined();
      expect(response.body.data.criticalStockCount).toBeDefined();
      expect(response.body.data.outOfStockCount).toBeDefined();
    });
  });
});