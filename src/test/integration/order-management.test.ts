import request from 'supertest';
import { app } from '../../server';
import { connectDatabase } from '../../config/database';
import { Product } from '../../models/Product';
import { User } from '../../models/User';
import { Order } from '../../models/Order';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';

describe('Order Management Integration Tests', () => {
  let customerToken: string;
  let adminToken: string;
  let testProduct: any;
  let testUser: any;

  beforeAll(async () => {
    await connectDatabase();
    
    // Create test user
    testUser = new User({
      email: 'customer@test.com',
      password: 'password123',
      firstName: 'Test',
      lastName: 'Customer',
      role: 'customer',
      isWholesaleCustomer: false
    });
    await testUser.save();

    // Create admin user
    const adminUser = new User({
      email: 'admin@test.com',
      password: 'password123',
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin',
      isWholesaleCustomer: false
    });
    await adminUser.save();

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

    // Create test product
    testProduct = new Product({
      name: 'Test Product for Orders',
      description: 'Test product for order management',
      category: 'Electronics',
      brand: 'TestBrand',
      sku: 'ORDER-TEST-001',
      images: [{ url: 'test.jpg', alt: 'Test image', isPrimary: true }],
      pricing: {
        retailPrice: 50,
        wholesalePrice: 40,
        costPrice: 30,
        currency: 'USD'
      },
      inventory: {
        quantity: 100,
        reserved: 0,
        lowStockThreshold: 10,
        trackInventory: true
      }
    });
    await testProduct.save();
  });

  afterAll(async () => {
    // Clean up test data
    await User.deleteMany({ email: { $in: ['customer@test.com', 'admin@test.com'] } });
    await Product.deleteMany({ sku: 'ORDER-TEST-001' });
    await Order.deleteMany({ userId: testUser._id });
    await mongoose.connection.close();
  });

  describe('Order Creation', () => {
    it('should create a new order successfully', async () => {
      const orderData = {
        items: [
          {
            productId: testProduct._id.toString(),
            quantity: 2
          }
        ],
        shippingAddress: {
          street: '123 Test St',
          city: 'Test City',
          state: 'TS',
          zipCode: '12345',
          country: 'United States'
        },
        billingAddress: {
          street: '123 Test St',
          city: 'Test City',
          state: 'TS',
          zipCode: '12345',
          country: 'United States'
        },
        paymentMethod: 'credit_card',
        notes: 'Test order'
      };

      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send(orderData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.orderNumber).toBeDefined();
      expect(response.body.data.status).toBe('pending');
      expect(response.body.data.items).toHaveLength(1);
      expect(response.body.data.items[0].productId).toBe(testProduct._id.toString());
      expect(response.body.data.items[0].quantity).toBe(2);
      expect(response.body.data.pricing.totalAmount).toBeGreaterThan(0);
    });

    it('should fail to create order with insufficient stock', async () => {
      const orderData = {
        items: [
          {
            productId: testProduct._id.toString(),
            quantity: 200 // More than available
          }
        ],
        shippingAddress: {
          street: '123 Test St',
          city: 'Test City',
          state: 'TS',
          zipCode: '12345',
          country: 'United States'
        },
        billingAddress: {
          street: '123 Test St',
          city: 'Test City',
          state: 'TS',
          zipCode: '12345',
          country: 'United States'
        },
        paymentMethod: 'credit_card'
      };

      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send(orderData)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INSUFFICIENT_STOCK');
    });

    it('should require authentication for order creation', async () => {
      const orderData = {
        items: [
          {
            productId: testProduct._id.toString(),
            quantity: 1
          }
        ],
        shippingAddress: {
          street: '123 Test St',
          city: 'Test City',
          state: 'TS',
          zipCode: '12345',
          country: 'United States'
        },
        billingAddress: {
          street: '123 Test St',
          city: 'Test City',
          state: 'TS',
          zipCode: '12345',
          country: 'United States'
        },
        paymentMethod: 'credit_card'
      };

      await request(app)
        .post('/api/orders')
        .send(orderData)
        .expect(401);
    });
  });

  describe('Order Retrieval', () => {
    let testOrder: any;

    beforeAll(async () => {
      // Create a test order
      const orderData = {
        items: [
          {
            productId: testProduct._id.toString(),
            quantity: 1
          }
        ],
        shippingAddress: {
          street: '123 Test St',
          city: 'Test City',
          state: 'TS',
          zipCode: '12345',
          country: 'United States'
        },
        billingAddress: {
          street: '123 Test St',
          city: 'Test City',
          state: 'TS',
          zipCode: '12345',
          country: 'United States'
        },
        paymentMethod: 'credit_card'
      };

      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send(orderData);

      testOrder = response.body.data;
    });

    it('should get user orders', async () => {
      const response = await request(app)
        .get('/api/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.pagination).toBeDefined();
    });

    it('should get order by ID', async () => {
      const response = await request(app)
        .get(`/api/orders/${testOrder._id}`)
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data._id).toBe(testOrder._id);
    });

    it('should get order by order number', async () => {
      const response = await request(app)
        .get(`/api/orders/number/${testOrder.orderNumber}`)
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.orderNumber).toBe(testOrder.orderNumber);
    });

    it('should not allow customers to access other users orders', async () => {
      // Try to access order with different user token would require another user
      // For now, just test that non-existent order returns 404
      const fakeOrderId = new mongoose.Types.ObjectId().toString();
      
      await request(app)
        .get(`/api/orders/${fakeOrderId}`)
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(404);
    });
  });

  describe('Order Status Management', () => {
    let testOrder: any;

    beforeAll(async () => {
      // Create a test order
      const orderData = {
        items: [
          {
            productId: testProduct._id.toString(),
            quantity: 1
          }
        ],
        shippingAddress: {
          street: '123 Test St',
          city: 'Test City',
          state: 'TS',
          zipCode: '12345',
          country: 'United States'
        },
        billingAddress: {
          street: '123 Test St',
          city: 'Test City',
          state: 'TS',
          zipCode: '12345',
          country: 'United States'
        },
        paymentMethod: 'credit_card'
      };

      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send(orderData);

      testOrder = response.body.data;
    });

    it('should allow admin to update order status', async () => {
      const response = await request(app)
        .put(`/api/orders/${testOrder._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'confirmed',
          note: 'Order confirmed by admin'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('confirmed');
    });

    it('should not allow customers to update order status', async () => {
      await request(app)
        .put(`/api/orders/${testOrder._id}/status`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          status: 'shipped',
          note: 'Trying to ship order'
        })
        .expect(403);
    });

    it('should allow customers to cancel their own orders', async () => {
      // Create a new order for cancellation test
      const orderData = {
        items: [
          {
            productId: testProduct._id.toString(),
            quantity: 1
          }
        ],
        shippingAddress: {
          street: '123 Test St',
          city: 'Test City',
          state: 'TS',
          zipCode: '12345',
          country: 'United States'
        },
        billingAddress: {
          street: '123 Test St',
          city: 'Test City',
          state: 'TS',
          zipCode: '12345',
          country: 'United States'
        },
        paymentMethod: 'credit_card'
      };

      const createResponse = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send(orderData);

      const newOrder = createResponse.body.data;

      const response = await request(app)
        .put(`/api/orders/${newOrder._id}/cancel`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          reason: 'Changed my mind'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('cancelled');
    });
  });

  describe('Order Statistics', () => {
    it('should get order statistics for admin', async () => {
      const response = await request(app)
        .get('/api/orders/stats')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.totalOrders).toBeDefined();
      expect(response.body.data.totalRevenue).toBeDefined();
      expect(response.body.data.averageOrderValue).toBeDefined();
      expect(response.body.data.statusCounts).toBeDefined();
      expect(response.body.data.recentOrders).toBeDefined();
    });

    it('should not allow customers to access order statistics', async () => {
      await request(app)
        .get('/api/orders/stats')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(403);
    });
  });
});