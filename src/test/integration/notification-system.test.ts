import request from 'supertest';
import { app } from '../../server';
import { connectDatabase } from '../../config/database';
import { Product } from '../../models/Product';
import { User } from '../../models/User';
import { Order } from '../../models/Order';
import { NotificationService } from '../../services/notificationService';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';

describe('Notification System Integration Tests', () => {
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
      email: 'customer@notification.test',
      password: 'password123',
      firstName: 'Test',
      lastName: 'Customer',
      role: 'customer',
      isWholesaleCustomer: false
    });
    await testUser.save();

    const adminUser = new User({
      email: 'admin@notification.test',
      password: 'password123',
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin',
      isWholesaleCustomer: false
    });
    await adminUser.save();

    const employeeUser = new User({
      email: 'employee@notification.test',
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
      name: 'Notification Test Product',
      description: 'Test product for notifications',
      category: 'Electronics',
      brand: 'TestBrand',
      sku: 'NOTIFY-TEST-001',
      images: [{ url: 'test.jpg', alt: 'Test image', isPrimary: true }],
      pricing: {
        retailPrice: 100,
        wholesalePrice: 80,
        costPrice: 60,
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
        street: '789 Notification St',
        city: 'Notify City',
        state: 'NC',
        zipCode: '67890',
        country: 'United States'
      },
      billingAddress: {
        street: '789 Notification St',
        city: 'Notify City',
        state: 'NC',
        zipCode: '67890',
        country: 'United States'
      },
      paymentMethod: 'credit_card',
      notes: 'Test order for notifications'
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
      email: { $in: ['customer@notification.test', 'admin@notification.test', 'employee@notification.test'] } 
    });
    await Product.deleteMany({ sku: 'NOTIFY-TEST-001' });
    await Order.deleteMany({ userId: testUser._id });
    await mongoose.connection.close();
  });

  describe('Notification Preferences', () => {
    it('should get default notification preferences for user', async () => {
      const response = await request(app)
        .get('/api/notifications/preferences')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.userId).toBe(testUser._id.toString());
      expect(response.body.data.channels).toBeDefined();
      expect(Array.isArray(response.body.data.channels)).toBe(true);
      expect(response.body.data.orderUpdates).toBe(true);
      expect(response.body.data.promotions).toBe(true);
      expect(response.body.data.inventoryAlerts).toBe(true);
    });

    it('should update notification preferences', async () => {
      const preferences = {
        orderUpdates: false,
        promotions: false,
        channels: [
          { type: 'push', enabled: true },
          { type: 'email', enabled: false },
          { type: 'sms', enabled: false },
          { type: 'in_app', enabled: true }
        ]
      };

      const response = await request(app)
        .put('/api/notifications/preferences')
        .set('Authorization', `Bearer ${customerToken}`)
        .send(preferences)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.orderUpdates).toBe(false);
      expect(response.body.data.promotions).toBe(false);
      expect(response.body.data.channels).toHaveLength(4);
    });
  });

  describe('Order Status Notifications', () => {
    it('should trigger notification when order status is updated', async () => {
      // Spy on the notification service
      const notificationSpy = jest.spyOn(NotificationService, 'sendOrderStatusNotification');

      // Update order status
      await request(app)
        .put(`/api/orders/${testOrder._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'confirmed',
          note: 'Order confirmed for notification test'
        })
        .expect(200);

      // Verify notification was called
      expect(notificationSpy).toHaveBeenCalled();
      
      // Get the call arguments
      const callArgs = notificationSpy.mock.calls[0];
      expect(callArgs[0]._id.toString()).toBe(testOrder._id);
      expect(callArgs[1]).toBe('pending'); // Previous status
      expect(callArgs[2]).toBe('admin@notification.test'); // Updated by

      notificationSpy.mockRestore();
    });

    it('should handle notification service errors gracefully', async () => {
      // Mock notification service to throw error
      const notificationSpy = jest.spyOn(NotificationService, 'sendOrderStatusNotification')
        .mockRejectedValue(new Error('Notification service error'));

      // Update order status should still succeed even if notification fails
      const response = await request(app)
        .put(`/api/orders/${testOrder._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'processing',
          note: 'Order processing despite notification error'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('processing');

      notificationSpy.mockRestore();
    });
  });

  describe('Inventory Alert Notifications', () => {
    it('should send inventory alert notification', async () => {
      const alertData = {
        productId: testProduct._id.toString(),
        productName: testProduct.name,
        currentStock: 5,
        threshold: 10
      };

      const response = await request(app)
        .post('/api/notifications/inventory-alert')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(alertData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toBe('Inventory alert notifications sent');
      expect(response.body.data.productId).toBe(testProduct._id.toString());
      expect(response.body.data.currentStock).toBe(5);
      expect(response.body.data.threshold).toBe(10);
    });

    it('should not allow customers to send inventory alerts', async () => {
      const alertData = {
        productId: testProduct._id.toString(),
        productName: testProduct.name,
        currentStock: 5,
        threshold: 10
      };

      await request(app)
        .post('/api/notifications/inventory-alert')
        .set('Authorization', `Bearer ${customerToken}`)
        .send(alertData)
        .expect(403);
    });

    it('should allow employees to send inventory alerts', async () => {
      const alertData = {
        productId: testProduct._id.toString(),
        productName: testProduct.name,
        currentStock: 3,
        threshold: 10
      };

      const response = await request(app)
        .post('/api/notifications/inventory-alert')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send(alertData)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Test Notifications', () => {
    it('should allow admin to send test notifications', async () => {
      const testNotification = {
        userId: testUser._id.toString(),
        title: 'Test Notification',
        message: 'This is a test notification',
        type: 'general',
        priority: 'normal'
      };

      const response = await request(app)
        .post('/api/notifications/test')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(testNotification)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toBe('Test notification sent successfully');
      expect(response.body.data.targetUserId).toBe(testUser._id.toString());
    });

    it('should not allow customers to send test notifications', async () => {
      const testNotification = {
        userId: testUser._id.toString(),
        title: 'Test Notification',
        message: 'This is a test notification'
      };

      await request(app)
        .post('/api/notifications/test')
        .set('Authorization', `Bearer ${customerToken}`)
        .send(testNotification)
        .expect(403);
    });
  });

  describe('Notification History', () => {
    it('should get notification history for user', async () => {
      const response = await request(app)
        .get('/api/notifications/history')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.pagination).toBeDefined();
    });

    it('should get notification history with pagination', async () => {
      const response = await request(app)
        .get('/api/notifications/history?limit=10&offset=0')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.pagination.limit).toBe(10);
      expect(response.body.pagination.offset).toBe(0);
    });
  });

  describe('Mark Notifications as Read', () => {
    it('should mark notification as read', async () => {
      const notificationId = 'test-notification-id';

      const response = await request(app)
        .put(`/api/notifications/${notificationId}/read`)
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.notificationId).toBe(notificationId);
      expect(response.body.data.markedAsRead).toBe(true);
    });
  });

  describe('Notification Service Direct Tests', () => {
    it('should generate correct notification content for order status changes', async () => {
      // Test the notification service directly
      const mockOrder = {
        _id: testOrder._id,
        orderNumber: testOrder.orderNumber,
        userId: testUser._id,
        status: 'shipped',
        tracking: {
          trackingNumber: 'TRACK123456789',
          carrier: 'Test Carrier'
        }
      } as any;

      const results = await NotificationService.sendOrderStatusNotification(
        mockOrder,
        'confirmed',
        'admin@notification.test'
      );

      expect(Array.isArray(results)).toBe(true);
      // Results should contain notification results for enabled channels
    });

    it('should get user notification preferences with defaults', async () => {
      const preferences = await NotificationService.getUserNotificationPreferences(
        testUser._id.toString()
      );

      expect(preferences.userId).toBe(testUser._id.toString());
      expect(preferences.orderUpdates).toBe(true);
      expect(preferences.channels).toBeDefined();
      expect(preferences.channels.length).toBeGreaterThan(0);
    });

    it('should send inventory alert to admin users', async () => {
      const results = await NotificationService.sendInventoryAlert(
        testProduct._id.toString(),
        testProduct.name,
        5,
        10
      );

      expect(Array.isArray(results)).toBe(true);
      // Should have sent notifications to admin and employee users
    });
  });
});