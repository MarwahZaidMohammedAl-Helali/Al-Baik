import { Transaction, ITransaction, PaymentDetails, RefundDetails, TransactionItem, AuditTrail } from '../models/Transaction';
import { Order, IOrder } from '../models/Order';
import { User } from '../models/User';
import { logger } from '../utils/logger';
import { OrderStatus } from '../types/common';
import mongoose from 'mongoose';

export interface CreateTransactionData {
  orderId: string;
  userId: string;
  paymentMethod: PaymentDetails['method'];
  paymentProvider: string;
  amount: number;
  taxAmount: number;
  shippingAmount: number;
  discountAmount: number;
  currency?: string;
  metadata?: Record<string, any>;
}

export interface PaymentGatewayResponse {
  success: boolean;
  transactionId: string;
  status: 'authorized' | 'captured' | 'failed';
  amount: number;
  currency: string;
  processingFee?: number;
  last4?: string;
  cardBrand?: string;
  gatewayResponse: Record<string, any>;
  errorMessage?: string;
  errorCode?: string;
}

export interface RefundRequest {
  transactionId: string;
  amount: number;
  reason: string;
  refundedBy: string;
  metadata?: Record<string, any>;
}

export interface TransactionFilters {
  userId?: string;
  status?: ITransaction['status'];
  orderStatus?: OrderStatus;
  startDate?: Date;
  endDate?: Date;
  minAmount?: number;
  maxAmount?: number;
  paymentMethod?: PaymentDetails['method'];
  paymentProvider?: string;
}

export interface TransactionSummary {
  transactionId: string;
  transactionNumber: string;
  orderId: string;
  amount: number;
  totalAmount: number;
  status: ITransaction['status'];
  paymentMethod: PaymentDetails['method'];
  createdAt: Date;
  completedAt?: Date;
}

export interface TransactionReport {
  totalTransactions: number;
  totalAmount: number;
  totalRefunded: number;
  netAmount: number;
  averageTransactionValue: number;
  statusBreakdown: Record<ITransaction['status'], number>;
  paymentMethodBreakdown: Record<PaymentDetails['method'], number>;
  transactions: TransactionSummary[];
}

/**
 * Transaction Service for handling all payment processing and financial operations
 */
export class TransactionService {
  private static paymentGatewayConfig = {
    stripe: {
      apiKey: process.env.STRIPE_SECRET_KEY,
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET
    },
    paypal: {
      clientId: process.env.PAYPAL_CLIENT_ID,
      clientSecret: process.env.PAYPAL_CLIENT_SECRET,
      environment: process.env.PAYPAL_ENVIRONMENT || 'sandbox'
    }
  };

  /**
   * Create a new transaction from an order
   */
  static async createTransaction(
    transactionData: CreateTransactionData,
    performedBy: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<ITransaction> {
    const session = await mongoose.startSession();
    
    try {
      return await session.withTransaction(async () => {
        // Validate order exists and is in correct state
        const order = await Order.findById(transactionData.orderId).session(session);
        if (!order) {
          throw new Error('Order not found');
        }

        if (order.status !== 'confirmed') {
          throw new Error('Order must be confirmed before creating transaction');
        }

        // Validate user exists
        const user = await User.findById(transactionData.userId).session(session);
        if (!user) {
          throw new Error('User not found');
        }

        // Check if transaction already exists for this order
        const existingTransaction = await Transaction.findOne({ orderId: transactionData.orderId }).session(session);
        if (existingTransaction) {
          throw new Error('Transaction already exists for this order');
        }

        // Convert order items to transaction items
        const transactionItems: TransactionItem[] = order.items.map(item => ({
          productId: item.productId,
          productName: item.productName,
          sku: item.sku,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
          discountApplied: 0, // Will be calculated based on order discount
          taxAmount: 0 // Will be calculated based on order tax
        }));

        // Calculate total amount
        const totalAmount = transactionData.amount + transactionData.taxAmount + 
                           transactionData.shippingAmount - transactionData.discountAmount;

        // Create transaction record
        const transaction = new Transaction({
          orderId: transactionData.orderId,
          userId: transactionData.userId,
          amount: transactionData.amount,
          currency: transactionData.currency || 'USD',
          taxAmount: transactionData.taxAmount,
          shippingAmount: transactionData.shippingAmount,
          discountAmount: transactionData.discountAmount,
          totalAmount,
          paymentDetails: {
            method: transactionData.paymentMethod,
            provider: transactionData.paymentProvider,
            transactionId: '', // Will be set after payment gateway call
            currency: transactionData.currency || 'USD',
            processingFee: 0,
            gatewayResponse: {}
          },
          status: 'pending',
          orderStatus: order.status,
          items: transactionItems,
          refunds: [],
          refundedAmount: 0,
          auditTrail: [],
          metadata: transactionData.metadata || {}
        });

        // Add initial audit entry
        transaction.addAuditEntry(
          'created',
          performedBy,
          'Transaction created from order',
          {
            ipAddress,
            userAgent,
            previousState: null,
            newState: { status: 'pending', totalAmount }
          }
        );

        await transaction.save({ session });

        logger.info('Transaction created', {
          transactionId: transaction._id,
          transactionNumber: transaction.transactionNumber,
          orderId: transactionData.orderId,
          userId: transactionData.userId,
          totalAmount,
          paymentMethod: transactionData.paymentMethod,
          paymentProvider: transactionData.paymentProvider
        });

        return transaction;
      });
    } catch (error) {
      logger.error('Transaction creation failed:', error);
      throw error;
    } finally {
      await session.endSession();
    }
  }

  /**
   * Process payment through payment gateway
   */
  static async processPayment(
    transactionId: string,
    performedBy: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<ITransaction> {
    const session = await mongoose.startSession();
    
    try {
      return await session.withTransaction(async () => {
        const transaction = await Transaction.findById(transactionId).session(session);
        if (!transaction) {
          throw new Error('Transaction not found');
        }

        if (transaction.status !== 'pending') {
          throw new Error(`Cannot process payment for transaction in ${transaction.status} status`);
        }

        // Process payment through gateway
        const paymentResult = await this.callPaymentGateway(transaction);

        // Update transaction with payment result
        const previousState = {
          status: transaction.status,
          paymentDetails: { ...transaction.paymentDetails }
        };

        transaction.paymentDetails.transactionId = paymentResult.transactionId;
        transaction.paymentDetails.processingFee = paymentResult.processingFee || 0;
        transaction.paymentDetails.last4 = paymentResult.last4;
        transaction.paymentDetails.cardBrand = paymentResult.cardBrand;
        transaction.paymentDetails.gatewayResponse = paymentResult.gatewayResponse;

        if (paymentResult.success) {
          transaction.status = paymentResult.status;
          
          if (paymentResult.status === 'authorized') {
            transaction.authorizedAt = new Date();
          } else if (paymentResult.status === 'captured') {
            transaction.capturedAt = new Date();
            transaction.completedAt = new Date();
            transaction.status = 'completed';
          }

          transaction.addAuditEntry(
            paymentResult.status,
            performedBy,
            `Payment ${paymentResult.status} successfully`,
            {
              ipAddress,
              userAgent,
              previousState,
              newState: {
                status: transaction.status,
                transactionId: paymentResult.transactionId,
                processingFee: paymentResult.processingFee
              }
            }
          );
        } else {
          transaction.status = 'failed';
          transaction.addAuditEntry(
            'updated',
            performedBy,
            `Payment failed: ${paymentResult.errorMessage}`,
            {
              ipAddress,
              userAgent,
              previousState,
              newState: {
                status: 'failed',
                errorCode: paymentResult.errorCode,
                errorMessage: paymentResult.errorMessage
              }
            }
          );
        }

        await transaction.save({ session });

        logger.info('Payment processed', {
          transactionId: transaction._id,
          transactionNumber: transaction.transactionNumber,
          success: paymentResult.success,
          status: transaction.status,
          gatewayTransactionId: paymentResult.transactionId,
          processingFee: paymentResult.processingFee
        });

        return transaction;
      });
    } catch (error) {
      logger.error('Payment processing failed:', error);
      throw error;
    } finally {
      await session.endSession();
    }
  }

  /**
   * Process refund for a transaction
   */
  static async processRefund(
    refundRequest: RefundRequest,
    performedBy: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<ITransaction> {
    const session = await mongoose.startSession();
    
    try {
      return await session.withTransaction(async () => {
        const transaction = await Transaction.findById(refundRequest.transactionId).session(session);
        if (!transaction) {
          throw new Error('Transaction not found');
        }

        if (!transaction.canBeRefunded()) {
          throw new Error('Transaction cannot be refunded');
        }

        const refundableAmount = transaction.calculateRefundableAmount();
        if (refundRequest.amount > refundableAmount) {
          throw new Error(`Refund amount (${refundRequest.amount}) exceeds refundable amount (${refundableAmount})`);
        }

        // Process refund through payment gateway
        const refundResult = await this.callRefundGateway(transaction, refundRequest.amount);

        // Create refund record
        const refundDetails: RefundDetails = {
          refundId: `REF-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
          amount: refundRequest.amount,
          reason: refundRequest.reason,
          refundedBy: refundRequest.refundedBy,
          refundedAt: new Date(),
          gatewayRefundId: refundResult.refundId,
          status: refundResult.success ? 'completed' : 'failed'
        };

        const previousState = {
          status: transaction.status,
          refundedAmount: transaction.refundedAmount,
          refundsCount: transaction.refunds.length
        };

        transaction.refunds.push(refundDetails);

        if (refundResult.success) {
          transaction.refundedAmount += refundRequest.amount;
          
          // Update transaction status based on refund amount
          if (transaction.isFullyRefunded()) {
            transaction.status = 'refunded';
          } else {
            transaction.status = 'partially_refunded';
          }

          transaction.addAuditEntry(
            'refunded',
            performedBy,
            `Refund processed: ${refundRequest.reason}`,
            {
              ipAddress,
              userAgent,
              previousState,
              newState: {
                status: transaction.status,
                refundedAmount: transaction.refundedAmount,
                refundId: refundDetails.refundId
              }
            }
          );
        } else {
          transaction.addAuditEntry(
            'updated',
            performedBy,
            `Refund failed: ${refundResult.errorMessage}`,
            {
              ipAddress,
              userAgent,
              previousState,
              newState: {
                refundError: refundResult.errorMessage
              }
            }
          );
        }

        await transaction.save({ session });

        logger.info('Refund processed', {
          transactionId: transaction._id,
          transactionNumber: transaction.transactionNumber,
          refundAmount: refundRequest.amount,
          success: refundResult.success,
          refundId: refundDetails.refundId,
          newStatus: transaction.status
        });

        return transaction;
      });
    } catch (error) {
      logger.error('Refund processing failed:', error);
      throw error;
    } finally {
      await session.endSession();
    }
  }

  /**
   * Get transaction by ID
   */
  static async getTransactionById(transactionId: string): Promise<ITransaction | null> {
    try {
      const transaction = await Transaction.findById(transactionId)
        .populate('userId', 'firstName lastName email')
        .populate('orderId');

      return transaction;
    } catch (error) {
      logger.error('Get transaction by ID failed:', error);
      throw error;
    }
  }

  /**
   * Get transaction by transaction number
   */
  static async getTransactionByNumber(transactionNumber: string): Promise<ITransaction | null> {
    try {
      const transaction = await Transaction.findOne({ transactionNumber })
        .populate('userId', 'firstName lastName email')
        .populate('orderId');

      return transaction;
    } catch (error) {
      logger.error('Get transaction by number failed:', error);
      throw error;
    }
  }

  /**
   * Get transactions with filters
   */
  static async getTransactions(
    filters: TransactionFilters,
    page: number = 1,
    limit: number = 10
  ): Promise<{
    transactions: ITransaction[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      const query: any = {};

      if (filters.userId) query.userId = filters.userId;
      if (filters.status) query.status = filters.status;
      if (filters.orderStatus) query.orderStatus = filters.orderStatus;
      if (filters.paymentMethod) query['paymentDetails.method'] = filters.paymentMethod;
      if (filters.paymentProvider) query['paymentDetails.provider'] = filters.paymentProvider;
      
      if (filters.startDate || filters.endDate) {
        query.createdAt = {};
        if (filters.startDate) query.createdAt.$gte = filters.startDate;
        if (filters.endDate) query.createdAt.$lte = filters.endDate;
      }

      if (filters.minAmount || filters.maxAmount) {
        query.totalAmount = {};
        if (filters.minAmount) query.totalAmount.$gte = filters.minAmount;
        if (filters.maxAmount) query.totalAmount.$lte = filters.maxAmount;
      }

      const skip = (page - 1) * limit;
      
      const [transactions, total] = await Promise.all([
        Transaction.find(query)
          .populate('userId', 'firstName lastName email')
          .populate('orderId', 'orderNumber')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        Transaction.countDocuments(query)
      ]);

      return {
        transactions,
        total,
        page,
        totalPages: Math.ceil(total / limit)
      };
    } catch (error) {
      logger.error('Get transactions failed:', error);
      throw error;
    }
  }

  /**
   * Generate transaction report
   */
  static async generateTransactionReport(
    filters: TransactionFilters,
    limit: number = 100
  ): Promise<TransactionReport> {
    try {
      const query: any = {};

      if (filters.userId) query.userId = filters.userId;
      if (filters.status) query.status = filters.status;
      if (filters.orderStatus) query.orderStatus = filters.orderStatus;
      if (filters.paymentMethod) query['paymentDetails.method'] = filters.paymentMethod;
      if (filters.paymentProvider) query['paymentDetails.provider'] = filters.paymentProvider;
      
      if (filters.startDate || filters.endDate) {
        query.createdAt = {};
        if (filters.startDate) query.createdAt.$gte = filters.startDate;
        if (filters.endDate) query.createdAt.$lte = filters.endDate;
      }

      if (filters.minAmount || filters.maxAmount) {
        query.totalAmount = {};
        if (filters.minAmount) query.totalAmount.$gte = filters.minAmount;
        if (filters.maxAmount) query.totalAmount.$lte = filters.maxAmount;
      }

      const [aggregateResult, transactions] = await Promise.all([
        Transaction.aggregate([
          { $match: query },
          {
            $group: {
              _id: null,
              totalTransactions: { $sum: 1 },
              totalAmount: { $sum: '$totalAmount' },
              totalRefunded: { $sum: '$refundedAmount' },
              netAmount: { $sum: { $subtract: ['$totalAmount', '$refundedAmount'] } },
              averageTransactionValue: { $avg: '$totalAmount' },
              statusBreakdown: { $push: '$status' },
              paymentMethodBreakdown: { $push: '$paymentDetails.method' }
            }
          }
        ]),
        Transaction.find(query)
          .select('transactionNumber orderId totalAmount status paymentDetails.method createdAt completedAt')
          .sort({ createdAt: -1 })
          .limit(limit)
      ]);

      const stats = aggregateResult[0] || {
        totalTransactions: 0,
        totalAmount: 0,
        totalRefunded: 0,
        netAmount: 0,
        averageTransactionValue: 0,
        statusBreakdown: [],
        paymentMethodBreakdown: []
      };

      // Process breakdowns
      const statusBreakdown: Record<ITransaction['status'], number> = {
        pending: 0,
        authorized: 0,
        captured: 0,
        completed: 0,
        failed: 0,
        cancelled: 0,
        refunded: 0,
        partially_refunded: 0
      };

      const paymentMethodBreakdown: Record<PaymentDetails['method'], number> = {
        credit_card: 0,
        debit_card: 0,
        paypal: 0,
        bank_transfer: 0,
        cash_on_delivery: 0
      };

      stats.statusBreakdown.forEach((status: ITransaction['status']) => {
        statusBreakdown[status] = (statusBreakdown[status] || 0) + 1;
      });

      stats.paymentMethodBreakdown.forEach((method: PaymentDetails['method']) => {
        paymentMethodBreakdown[method] = (paymentMethodBreakdown[method] || 0) + 1;
      });

      const transactionSummaries: TransactionSummary[] = transactions.map((tx: any) => ({
        transactionId: tx._id.toString(),
        transactionNumber: tx.transactionNumber,
        orderId: tx.orderId,
        amount: tx.amount,
        totalAmount: tx.totalAmount,
        status: tx.status,
        paymentMethod: tx.paymentDetails.method,
        createdAt: tx.createdAt,
        completedAt: tx.completedAt
      }));

      return {
        totalTransactions: stats.totalTransactions,
        totalAmount: stats.totalAmount,
        totalRefunded: stats.totalRefunded,
        netAmount: stats.netAmount,
        averageTransactionValue: stats.averageTransactionValue,
        statusBreakdown,
        paymentMethodBreakdown,
        transactions: transactionSummaries
      };
    } catch (error) {
      logger.error('Generate transaction report failed:', error);
      throw error;
    }
  }

  // Private helper methods for payment gateway integration

  private static async callPaymentGateway(transaction: ITransaction): Promise<PaymentGatewayResponse> {
    try {
      // Mock payment gateway implementation
      // In a real implementation, this would call Stripe, PayPal, etc.
      
      const provider = transaction.paymentDetails.provider;
      const method = transaction.paymentDetails.method;
      
      // Simulate different success rates based on payment method
      const successRate = method === 'credit_card' ? 0.95 : 
                         method === 'paypal' ? 0.98 : 
                         method === 'bank_transfer' ? 0.90 : 0.85;
      
      const isSuccess = Math.random() < successRate;
      
      if (isSuccess) {
        const mockTransactionId = `${provider.toUpperCase()}_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
        const processingFee = transaction.totalAmount * 0.029; // 2.9% processing fee
        
        return {
          success: true,
          transactionId: mockTransactionId,
          status: method === 'credit_card' ? 'captured' : 'authorized',
          amount: transaction.totalAmount,
          currency: transaction.currency,
          processingFee,
          last4: method.includes('card') ? '4242' : undefined,
          cardBrand: method.includes('card') ? 'visa' : undefined,
          gatewayResponse: {
            provider,
            timestamp: new Date().toISOString(),
            mockResponse: true,
            processingTime: Math.floor(Math.random() * 3000) + 500 // 500-3500ms
          }
        };
      } else {
        return {
          success: false,
          transactionId: '',
          status: 'failed',
          amount: transaction.totalAmount,
          currency: transaction.currency,
          gatewayResponse: {
            provider,
            timestamp: new Date().toISOString(),
            mockResponse: true
          },
          errorMessage: 'Payment declined by issuer',
          errorCode: 'CARD_DECLINED'
        };
      }
    } catch (error) {
      logger.error('Payment gateway call failed:', error);
      return {
        success: false,
        transactionId: '',
        status: 'failed',
        amount: transaction.totalAmount,
        currency: transaction.currency,
        gatewayResponse: {},
        errorMessage: 'Gateway communication error',
        errorCode: 'GATEWAY_ERROR'
      };
    }
  }

  private static async callRefundGateway(
    transaction: ITransaction,
    refundAmount: number
  ): Promise<{ success: boolean; refundId?: string; errorMessage?: string }> {
    try {
      // Mock refund gateway implementation
      // In a real implementation, this would call the payment provider's refund API
      
      const provider = transaction.paymentDetails.provider;
      
      // Simulate high success rate for refunds
      const isSuccess = Math.random() < 0.98;
      
      if (isSuccess) {
        const mockRefundId = `${provider.toUpperCase()}_REF_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
        
        return {
          success: true,
          refundId: mockRefundId
        };
      } else {
        return {
          success: false,
          errorMessage: 'Refund processing failed at gateway'
        };
      }
    } catch (error) {
      logger.error('Refund gateway call failed:', error);
      return {
        success: false,
        errorMessage: 'Gateway communication error'
      };
    }
  }
}