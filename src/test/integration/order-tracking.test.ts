import request from 'supertest';
import { app } from '../../server';
import { connectDatabase } from '../../config/database';
import { Product } from '../../models/Product';
import { User } from '../../models/User';
import { Order } from '../../models/Order';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';

describe('Order Tracking Integration Tests', () => {
  let customerToken: string;
  let adminToken: string;
  let employeeToken: string;
  let testProduct: any;
  let testUser: any;
  let testOrder: any;

  beforeAll(async () => {
    await connectDatabase();
    
    // Create test users
    testUser = new User({
      email: 'customer@tracking.test',
      password: 'password123',
      firstName: 'Test',
      lastName: 'Customer',
      role: 'customer',
      isWholesaleCustomer: false
    });
    await testUser.save();

    const adminUser = new User({
      email: 'admin@tracking.test',
      password: 'password123',
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin',
      isWholesaleCustomer: false
    });
    await adminUser.save();

    const employeeUser = new User({
      email: 'employee@tracking.test',
      password: 'password123',
      firstName: 'Employee',
      lastName: 'User',
      role: 'employee',
      isWholesaleCustomer: false
    });
    await employeeUser.save();

    // Generate JWT tokens
    const jwtSecret = process.env.JWT_SECRET || 'test-secret';
    customerToken = jwt.sign(
      {
        id: testUser._id.toString(),
        email: testUser.email,
        role: testUser.role,
        isWholesaleCustomer: testUser.isWholesaleCustomer
      },
      jwtSecret,
      { expiresIn: '1h' }
    );

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

    // Create test product
    testProduct = new Product({
      name: 'Tracking Test Product',
      description: 'Test product for order tracking',
      category: 'Electronics',
      brand: 'TestBrand',
      sku: 'TRACK-TEST-001',
      images: [{ url: 'test.jpg', alt: 'Test image', isPrimary: true }],
      pricing: {
        retailPrice: 75,
        wholesalePrice: 60,
        costPrice: 45,
        currency: 'USD'
      },
      inventory: {
        quantity: 50,
        reserved: 0,
        lowStockThreshold: 10,
        trackInventory: true
      }
    });
    await testProduct.save();

    // Create test order
    const orderData = {
      items: [
        {
          productId: testProduct._id.toString(),
          quantity: 2
        }
      ],
      shippingAddress: {
        street: '456 Tracking Ave',
        city: 'Track City',
        state: 'TC',
        zipCode: '54321',
        country: 'United States'
      },
      billingAddress: {
        street: '456 Tracking Ave',
        city: 'Track City',
        state: 'TC',
        zipCode: '54321',
        country: 'United States'
      },
      paymentMethod: 'credit_card',
      notes: 'Test order for tracking'
    };

    const response = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send(orderData);

    testOrder = response.body.data;
  });

  afterAll(async () => {
    // Clean up test data
    await User.deleteMany({ 
      email: { $in: ['customer@tracking.test', 'admin@tracking.test', 'employee@tracking.test'] } 
    });
    await Product.deleteMany({ sku: 'TRACK-TEST-001' });
    await Order.deleteMany({ userId: testUser._id });
    await mongoose.connection.close();
  });

  describe('Order Tracking Details', () => {
    it('should get detailed tracking information by order ID', async () => {
      const response = await request(app)
        .get(`/api/orders/${testOrder._id}/tracking`)
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.orderId).toBe(testOrder._id);
      expect(response.body.data.orderNumber).toBe(testOrder.orderNumber);
      expect(response.body.data.currentStatus).toBe('pending');
      expect(response.body.data.estimatedDelivery).toBeDefined();
      expect(response.body.data.estimatedDelivery.estimatedDate).toBeDefined();
      expect(response.body.data.estimatedDelivery.shippingMethod).toBeDefined();
      expect(response.body.data.statusHistory).toBeDefined();
      expect(response.body.data.trackingUpdates).toBeDefined();
      expect(response.body.data.canBeCancelled).toBe(true);
      expect(response.body.data.nextPossibleStatuses).toContain('confirmed');
      expect(response.body.data.nextPossibleStatuses).toContain('cancelled');
    });

    it('should get detailed tracking information by order number', async () => {
      const response = await request(app)
        .get(`/api/orders/${testOrder.orderNumber}/tracking`)
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.orderNumber).toBe(testOrder.orderNumber);
    });

    it('should not allow customers to track other users orders', async () => {
      // Create another user and try to access the order
      const otherUser = new User({
        email: 'other@tracking.test',
        password: 'password123',
        firstName: 'Other',
        lastName: 'User',
        role: 'customer',
        isWholesaleCustomer: false
      });
      await otherUser.save();

      const jwtSecret = process.env.JWT_SECRET || 'test-secret';
      const otherToken = jwt.sign(
        {
          id: otherUser._id.toString(),
          email: otherUser.email,
          role: otherUser.role,
          isWholesaleCustomer: otherUser.isWholesaleCustomer
        },
        jwtSecret,
        { expiresIn: '1h' }
      );

      await request(app)
        .get(`/api/orders/${testOrder._id}/tracking`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(404);

      // Clean up
      await User.deleteOne({ _id: otherUser._id });
    });

    it('should allow admin to track any order', async () => {
      const response = await request(app)
        .get(`/api/orders/${testOrder._id}/tracking`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.orderId).toBe(testOrder._id);
    });
  });

  describe('Order Tracking Updates', () => {
    it('should allow admin to update tracking information', async () => {
      const trackingData = {
        trackingNumber: 'TRACK123456789',
        carrier: 'Test Shipping Co',
        currentLocation: 'Distribution Center',
        trackingUpdate: {
          location: 'Distribution Center',
          status: 'In Transit',
          description: 'Package is in transit to destination'
        }
      };

      const response = await request(app)
        .put(`/api/orders/${testOrder._id}/tracking`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(trackingData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.tracking.trackingNumber).toBe('TRACK123456789');
      expect(response.body.data.tracking.carrier).toBe('Test Shipping Co');
    });

    it('should allow employee to update tracking information', async () => {
      const trackingData = {
        currentLocation: 'Local Facility',
        trackingUpdate: {
          location: 'Local Facility',
          status: 'Out for Delivery',
          description: 'Package is out for delivery'
        }
      };

      const response = await request(app)
        .put(`/api/orders/${testOrder._id}/tracking`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .send(trackingData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.tracking.currentLocation).toBe('Local Facility');
    });

    it('should not allow customers to update tracking information', async () => {
      const trackingData = {
        trackingNumber: 'FAKE123456789',
        carrier: 'Fake Carrier'
      };

      await request(app)
        .put(`/api/orders/${testOrder._id}/tracking`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send(trackingData)
        .expect(403);
    });
  });

  describe('Order History', () => {
    it('should get order history for customer', async () => {
      const response = await request(app)
        .get(`/api/orders/user/${testUser._id}/history`)
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.orders).toBeDefined();
      expect(Array.isArray(response.body.data.orders)).toBe(true);
      expect(response.body.data.summary).toBeDefined();
      expect(response.body.data.summary.totalOrders).toBeGreaterThan(0);
      expect(response.body.data.summary.totalSpent).toBeGreaterThan(0);
      expect(response.body.data.summary.statusBreakdown).toBeDefined();
    });

    it('should get order history with filters', async () => {
      const response = await request(app)
        .get(`/api/orders/user/${testUser._id}/history?status=pending&limit=5`)
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.orders.length).toBeLessThanOrEqual(5);
    });

    it('should not allow customers to access other users order history', async () => {
      const fakeUserId = new mongoose.Types.ObjectId().toString();
      
      await request(app)
        .get(`/api/orders/user/${fakeUserId}/history`)
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(403);
    });

    it('should allow admin to access any user order history', async () => {
      const response = await request(app)
        .get(`/api/orders/user/${testUser._id}/history`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });
  });

  describe('Bulk Order Status Updates', () => {
    let bulkTestOrders: any[] = [];

    beforeAll(async () => {
      // Create multiple orders for bulk testing
      for (let i = 0; i < 3; i++) {
        const orderData = {
          items: [
            {
              productId: testProduct._id.toString(),
              quantity: 1
            }
          ],
          shippingAddress: {
            street: `${100 + i} Bulk Test St`,
            city: 'Bulk City',
            state: 'BC',
            zipCode: '12345',
            country: 'United States'
          },
          billingAddress: {
            street: `${100 + i} Bulk Test St`,
            city: 'Bulk City',
            state: 'BC',
            zipCode: '12345',
            country: 'United States'
          },
          paymentMethod: 'credit_card'
        };

        const response = await request(app)
          .post('/api/orders')
          .set('Authorization', `Bearer ${customerToken}`)
          .send(orderData);

        bulkTestOrders.push(response.body.data);
      }
    });

    it('should allow admin to bulk update order statuses', async () => {
      const orderIds = bulkTestOrders.map(order => order._id);
      
      const response = await request(app)
        .put('/api/orders/bulk/status')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          orderIds,
          status: 'confirmed',
          note: 'Bulk confirmation for testing'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.totalOrders).toBe(3);
      expect(response.body.data.successful).toBe(3);
      expect(response.body.data.failed).toBe(0);
      expect(response.body.data.successfulOrders).toHaveLength(3);
    });

    it('should not allow employees to bulk update order statuses', async () => {
      const orderIds = bulkTestOrders.map(order => order._id);
      
      await request(app)
        .put('/api/orders/bulk/status')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          orderIds,
          status: 'processing',
          note: 'Bulk processing attempt'
        })
        .expect(403);
    });

    it('should not allow customers to bulk update order statuses', async () => {
      const orderIds = bulkTestOrders.map(order => order._id);
      
      await request(app)
        .put('/api/orders/bulk/status')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          orderIds,
          status: 'cancelled',
          note: 'Bulk cancellation attempt'
        })
        .expect(403);
    });
  });

  describe('Delivery Estimation', () => {
    it('should provide accurate delivery estimates based on order status', async () => {
      // Test with pending order
      const pendingResponse = await request(app)
        .get(`/api/orders/${testOrder._id}/tracking`)
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      const pendingEstimate = pendingResponse.body.data.estimatedDelivery;
      expect(pendingEstimate.estimatedDate).toBeDefined();
      expect(pendingEstimate.minDays).toBeGreaterThan(0);
      expect(pendingEstimate.maxDays).toBeGreaterThan(pendingEstimate.minDays);
      expect(pendingEstimate.shippingMethod).toBeDefined();
      expect(pendingEstimate.confidence).toBeDefined();
      expect(Array.isArray(pendingEstimate.factors)).toBe(true);

      // Update order to confirmed and check estimate changes
      await request(app)
        .put(`/api/orders/${testOrder._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'confirmed',
          note: 'Order confirmed for delivery estimation test'
        });

      const confirmedResponse = await request(app)
        .get(`/api/orders/${testOrder._id}/tracking`)
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      const confirmedEstimate = confirmedResponse.body.data.estimatedDelivery;
      expect(confirmedEstimate.factors).toContain('Order confirmed, preparing for shipment');
    });
  });
});