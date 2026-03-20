import request from 'supertest';
import { app } from '../../server';
import { connectDatabase } from '../../config/database';
import { Product } from '../../models/Product';
import { User } from '../../models/User';
import { Order } from '../../models/Order';
import { Transaction } from '../../models/Transaction';
import { TransactionService } from '../../services/transactionService';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';

describe('Transaction System Integration Tests', () => {
  let customerToken: string;
  let adminToken: string;
  let employeeToken: string;
  let testProduct: any;
  let testUser: any;
  let testOrder: any;
  let testTransaction: any;

  beforeAll(async () => {
    await connectDatabase();
    
    // Create test users
    testUser = new User({
      email: 'customer@transaction.test',
      password: 'password123',
      firstName: 'Test',
      lastName: 'Customer',
      role: 'customer',
      isWholesaleCustomer: false
    });
    await testUser.save();

    const adminUser = new User({
      email: 'admin@transaction.test',
      password: 'password123',
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin',
      isWholesaleCustomer: false
    });
    await adminUser.save();

    const employeeUser = new User({
      email: 'employee@transaction.test',
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
      name: 'Transaction Test Product',
      description: 'Test product for transactions',
      category: 'Electronics',
      brand: 'TestBrand',
      sku: 'TXN-TEST-001',
      images: [{ url: 'test.jpg', alt: 'Test image', isPrimary: true }],
      pricing: {
        retailPrice: 150,
        wholesalePrice: 120,
        costPrice: 90,
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

    // Create test order
    const orderData = {
      items: [
        {
          productId: testProduct._id.toString(),
          quantity: 2
        }
      ],
      shippingAddress: {
        street: '123 Transaction St',
        city: 'Transaction City',
        state: 'TC',
        zipCode: '12345',
        country: 'United States'
      },
      billingAddress: {
        street: '123 Transaction St',
        city: 'Transaction City',
        state: 'TC',
        zipCode: '12345',
        country: 'United States'
      },
      paymentMethod: 'credit_card',
      notes: 'Test order for transactions'
    };

    const orderResponse = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send(orderData);

    testOrder = orderResponse.body.data;

    // Confirm the order so it can be used for transactions
    await request(app)
      .put(`/api/orders/${testOrder._id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        status: 'confirmed',
        note: 'Order confirmed for transaction testing'
      });
  });

  afterAll(async () => {
    // Clean up test data
    await User.deleteMany({ 
      email: { $in: ['customer@transaction.test', 'admin@transaction.test', 'employee@transaction.test'] } 
    });
    await Product.deleteMany({ sku: 'TXN-TEST-001' });
    await Order.deleteMany({ userId: testUser._id });
    await Transaction.deleteMany({ userId: testUser._id });
    await mongoose.connection.close();
  });

  describe('Transaction Creation', () => {
    it('should create a transaction from a confirmed order', async () => {
      const transactionData = {
        orderId: testOrder._id,
        userId: testUser._id.toString(),
        paymentMethod: 'credit_card',
        paymentProvider: 'stripe',
        amount: 300,
        taxAmount: 25.50,
        shippingAmount: 9.99,
        discountAmount: 0,
        currency: 'USD',
        metadata: {
          testTransaction: true
        }
      };

      const response = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(transactionData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.orderId).toBe(testOrder._id);
      expect(response.body.data.userId).toBe(testUser._id.toString());
      expect(response.body.data.status).toBe('pending');
      expect(response.body.data.totalAmount).toBe(335.49); // 300 + 25.50 + 9.99
      expect(response.body.data.transactionNumber).toMatch(/^TXN-/);
      expect(response.body.data.auditTrail).toHaveLength(1);
      expect(response.body.data.auditTrail[0].action).toBe('created');

      testTransaction = response.body.data;
    });

    it('should not allow customers to create transactions', async () => {
      const transactionData = {
        orderId: testOrder._id,
        userId: testUser._id.toString(),
        paymentMethod: 'credit_card',
        paymentProvider: 'stripe',
        amount: 300,
        taxAmount: 25.50,
        shippingAmount: 9.99,
        discountAmount: 0
      };

      await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${customerToken}`)
        .send(transactionData)
        .expect(403);
    });

    it('should allow employees to create transactions', async () => {
      // Create another order for employee test
      const orderData = {
        items: [
          {
            productId: testProduct._id.toString(),
            quantity: 1
          }
        ],
        shippingAddress: {
          street: '456 Employee St',
          city: 'Employee City',
          state: 'EC',
          zipCode: '54321',
          country: 'United States'
        },
        billingAddress: {
          street: '456 Employee St',
          city: 'Employee City',
          state: 'EC',
          zipCode: '54321',
          country: 'United States'
        },
        paymentMethod: 'paypal'
      };

      const orderResponse = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send(orderData);

      const employeeOrder = orderResponse.body.data;

      // Confirm the order
      await request(app)
        .put(`/api/orders/${employeeOrder._id}/status`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          status: 'confirmed',
          note: 'Order confirmed by employee'
        });

      const transactionData = {
        orderId: employeeOrder._id,
        userId: testUser._id.toString(),
        paymentMethod: 'paypal',
        paymentProvider: 'paypal',
        amount: 150,
        taxAmount: 12.75,
        shippingAmount: 9.99,
        discountAmount: 0
      };

      const response = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send(transactionData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.paymentDetails.method).toBe('paypal');
      expect(response.body.data.paymentDetails.provider).toBe('paypal');
    });

    it('should not create duplicate transactions for the same order', async () => {
      const transactionData = {
        orderId: testOrder._id,
        userId: testUser._id.toString(),
        paymentMethod: 'credit_card',
        paymentProvider: 'stripe',
        amount: 300,
        taxAmount: 25.50,
        shippingAmount: 9.99,
        discountAmount: 0
      };

      await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(transactionData)
        .expect(409);
    });
  });

  describe('Payment Processing', () => {
    it('should process payment for a pending transaction', async () => {
      const response = await request(app)
        .post(`/api/transactions/${testTransaction._id}/process`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toMatch(/^(authorized|captured|completed)$/);
      expect(response.body.data.paymentDetails.transactionId).toBeDefined();
      expect(response.body.data.paymentDetails.processingFee).toBeGreaterThan(0);
      expect(response.body.data.auditTrail.length).toBeGreaterThan(1);

      // Update testTransaction for further tests
      testTransaction = response.body.data;
    });

    it('should not allow customers to process payments', async () => {
      await request(app)
        .post(`/api/transactions/${testTransaction._id}/process`)
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(403);
    });

    it('should not process payment for non-pending transactions', async () => {
      await request(app)
        .post(`/api/transactions/${testTransaction._id}/process`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);
    });
  });

  describe('Transaction Retrieval', () => {
    it('should get transaction by ID for admin', async () => {
      const response = await request(app)
        .get(`/api/transactions/${testTransaction._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data._id).toBe(testTransaction._id);
      expect(response.body.data.transactionNumber).toBe(testTransaction.transactionNumber);
    });

    it('should get transaction by transaction number', async () => {
      const response = await request(app)
        .get(`/api/transactions/number/${testTransaction.transactionNumber}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data._id).toBe(testTransaction._id);
    });

    it('should allow customers to view their own transactions', async () => {
      const response = await request(app)
        .get(`/api/transactions/${testTransaction._id}`)
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data._id).toBe(testTransaction._id);
    });

    it('should not allow customers to view other users transactions', async () => {
      // Create another user and try to access the transaction
      const otherUser = new User({
        email: 'other@transaction.test',
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
        .get(`/api/transactions/${testTransaction._id}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(403);

      // Clean up
      await User.deleteOne({ _id: otherUser._id });
    });
  });

  describe('Transaction Listing', () => {
    it('should get transactions list for admin with filters', async () => {
      const response = await request(app)
        .get('/api/transactions?status=completed&limit=10')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.pagination).toBeDefined();
      expect(response.body.pagination.limit).toBe(10);
    });

    it('should get only customer own transactions for customer users', async () => {
      const response = await request(app)
        .get('/api/transactions')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      
      // All transactions should belong to the customer
      response.body.data.forEach((transaction: any) => {
        expect(transaction.userId).toBe(testUser._id.toString());
      });
    });

    it('should filter transactions by date range', async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 1); // Yesterday
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 1); // Tomorrow

      const response = await request(app)
        .get(`/api/transactions?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });
  });

  describe('Refund Processing', () => {
    it('should process refund for completed transaction (admin only)', async () => {
      // Ensure transaction is in completed state
      if (testTransaction.status !== 'completed') {
        // Update transaction status to completed for refund test
        await Transaction.findByIdAndUpdate(testTransaction._id, { 
          status: 'completed',
          completedAt: new Date()
        });
      }

      const refundData = {
        amount: 50.00,
        reason: 'Customer requested partial refund',
        metadata: {
          customerRequest: true
        }
      };

      const response = await request(app)
        .post(`/api/transactions/${testTransaction._id}/refund`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(refundData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.refundedAmount).toBe(50.00);
      expect(response.body.data.status).toBe('partially_refunded');
      expect(response.body.data.refunds).toHaveLength(1);
      expect(response.body.data.refunds[0].amount).toBe(50.00);
      expect(response.body.data.refunds[0].reason).toBe('Customer requested partial refund');
    });

    it('should not allow employees to process refunds', async () => {
      const refundData = {
        amount: 25.00,
        reason: 'Employee refund attempt'
      };

      await request(app)
        .post(`/api/transactions/${testTransaction._id}/refund`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .send(refundData)
        .expect(403);
    });

    it('should not allow customers to process refunds', async () => {
      const refundData = {
        amount: 25.00,
        reason: 'Customer refund attempt'
      };

      await request(app)
        .post(`/api/transactions/${testTransaction._id}/refund`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send(refundData)
        .expect(403);
    });

    it('should not allow refund amount exceeding refundable amount', async () => {
      const refundData = {
        amount: 500.00, // More than transaction total
        reason: 'Excessive refund attempt'
      };

      await request(app)
        .post(`/api/transactions/${testTransaction._id}/refund`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(refundData)
        .expect(400);
    });
  });

  describe('Transaction Reports', () => {
    it('should generate transaction summary report for admin', async () => {
      const response = await request(app)
        .get('/api/transactions/reports/summary')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.totalTransactions).toBeGreaterThan(0);
      expect(response.body.data.totalAmount).toBeGreaterThan(0);
      expect(response.body.data.statusBreakdown).toBeDefined();
      expect(response.body.data.paymentMethodBreakdown).toBeDefined();
      expect(response.body.data.transactions).toBeDefined();
      expect(Array.isArray(response.body.data.transactions)).toBe(true);
    });

    it('should generate filtered transaction report', async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 1);
      const endDate = new Date();

      const response = await request(app)
        .get(`/api/transactions/reports/summary?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}&paymentMethod=credit_card`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });

    it('should not allow customers to generate reports', async () => {
      await request(app)
        .get('/api/transactions/reports/summary')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(403);
    });

    it('should allow employees to generate reports', async () => {
      const response = await request(app)
        .get('/api/transactions/reports/summary')
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Transaction Service Direct Tests', () => {
    it('should calculate refundable amount correctly', async () => {
      const transaction = await TransactionService.getTransactionById(testTransaction._id);
      expect(transaction).toBeDefined();
      
      if (transaction) {
        const refundableAmount = transaction.calculateRefundableAmount();
        expect(refundableAmount).toBe(transaction.totalAmount - transaction.refundedAmount);
        expect(refundableAmount).toBeGreaterThan(0);
      }
    });

    it('should check if transaction can be refunded', async () => {
      const transaction = await TransactionService.getTransactionById(testTransaction._id);
      expect(transaction).toBeDefined();
      
      if (transaction) {
        const canRefund = transaction.canBeRefunded();
        expect(typeof canRefund).toBe('boolean');
      }
    });

    it('should calculate net amount correctly', async () => {
      const transaction = await TransactionService.getTransactionById(testTransaction._id);
      expect(transaction).toBeDefined();
      
      if (transaction) {
        const netAmount = transaction.getNetAmount();
        expect(netAmount).toBe(transaction.totalAmount - transaction.refundedAmount);
      }
    });

    it('should add audit trail entries correctly', async () => {
      const transaction = await TransactionService.getTransactionById(testTransaction._id);
      expect(transaction).toBeDefined();
      
      if (transaction) {
        const initialAuditCount = transaction.auditTrail.length;
        
        transaction.addAuditEntry(
          'updated',
          'test@example.com',
          'Test audit entry',
          { ipAddress: '127.0.0.1' }
        );
        
        expect(transaction.auditTrail.length).toBe(initialAuditCount + 1);
        expect(transaction.auditTrail[transaction.auditTrail.length - 1].action).toBe('updated');
        expect(transaction.auditTrail[transaction.auditTrail.length - 1].performedBy).toBe('test@example.com');
        expect(transaction.auditTrail[transaction.auditTrail.length - 1].details).toBe('Test audit entry');
      }
    });
  });
});