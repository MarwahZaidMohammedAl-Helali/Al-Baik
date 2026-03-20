import { Transaction, ITransaction, RefundDetails } from '../models/Transaction';
import { Order } from '../models/Order';
import { InventoryService } from './inventoryService';
import { AuditService } from './auditService';
import { NotificationService } from './notificationService';
import { logger } from '../utils/logger';
import mongoose from 'mongoose';

export interface RefundRequest {
  transactionId: string;
  amount: number;
  reason: string;
  refundType: 'full' | 'partial' | 'item_specific';
  refundedBy: string;
  itemRefunds?: Array<{
    productId: string;
    quantity: number;
    refundAmount: number;
  }>;
  restockItems?: boolean;
  notifyCustomer?: boolean;
  metadata?: Record<string, any>;
}

export interface RefundValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
  maxRefundableAmount: number;
  suggestedAmount?: number;
}

export interface RefundResult {
  success: boolean;
  refund?: RefundDetails;
  transaction?: ITransaction;
  inventoryUpdates?: Array<{
    productId: string;
    quantityRestocked: number;
    newQuantity: number;
  }>;
  errorMessage?: string;
  errorCode?: string;
}

export interface RefundReport {
  totalRefunds: number;
  totalRefundAmount: number;
  averageRefundAmount: number;
  refundsByReason: Record<string, { count: number; amount: number }>;
  refundsByType: Record<RefundRequest['refundType'], { count: number; amount: number }>;
  refundsByTimeframe: Array<{
    period: string;
    count: number;
    amount: number;
  }>;
  topRefundReasons: Array<{
    reason: string;
    count: number;
    amount: number;
    percentage: number;
  }>;
  refunds: Array<{
    refundId: string;
    transactionNumber: string;
    amount: number;
    reason: string;
    refundedAt: Date;
    refundedBy: string;
  }>;
}

/**
 * Enhanced Refund Service with comprehensive processing and audit trails
 */
export class RefundService {
  /**
   * Validate a refund request before processing
   */
  static async validateRefundRequest(request: RefundRequest): Promise<RefundValidation> {
    try {
      const errors: string[] = [];
      const warnings: string[] = [];

      // Get transaction
      const transaction = await Transaction.findById(request.transactionId);
      if (!transaction) {
        errors.push('Transaction not found');
        return {
          valid: false,
          errors,
          warnings,
          maxRefundableAmount: 0
        };
      }

      // Check if transaction can be refunded
      if (!transaction.canBeRefunded()) {
        errors.push(`Transaction cannot be refunded in ${transaction.status} status`);
      }

      // Calculate maximum refundable amount
      const maxRefundableAmount = transaction.calculateRefundableAmount();
      
      // Validate refund amount
      if (request.amount <= 0) {
        errors.push('Refund amount must be positive');
      }

      if (request.amount > maxRefundableAmount) {
        errors.push(`Refund amount ($${request.amount}) exceeds refundable amount ($${maxRefundableAmount})`);
      }

      // Validate refund type and item-specific refunds
      if (request.refundType === 'item_specific') {
        if (!request.itemRefunds || request.itemRefunds.length === 0) {
          errors.push('Item-specific refunds require itemRefunds array');
        } else {
          let totalItemRefundAmount = 0;
          for (const itemRefund of request.itemRefunds) {
            const transactionItem = transaction.items.find(item => item.productId === itemRefund.productId);
            if (!transactionItem) {
              errors.push(`Product ${itemRefund.productId} not found in transaction`);
              continue;
            }

            if (itemRefund.quantity > transactionItem.quantity) {
              errors.push(`Refund quantity (${itemRefund.quantity}) exceeds transaction quantity (${transactionItem.quantity}) for product ${itemRefund.productId}`);
            }

            totalItemRefundAmount += itemRefund.refundAmount;
          }

          if (Math.abs(totalItemRefundAmount - request.amount) > 0.01) {
            warnings.push(`Total item refund amount ($${totalItemRefundAmount}) does not match requested amount ($${request.amount})`);
          }
        }
      }

      // Check for suspicious refund patterns
      const recentRefunds = await Transaction.find({
        userId: transaction.userId,
        'refunds.refundedBy': request.refundedBy,
        'refunds.refundedAt': { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
      });

      if (recentRefunds.length > 5) {
        warnings.push('Multiple refunds processed by this user in the last 24 hours');
      }

      // Large refund warning
      if (request.amount > 1000) {
        warnings.push('Large refund amount - consider additional approval');
      }

      // Full refund suggestion
      if (request.refundType === 'partial' && request.amount > maxRefundableAmount * 0.8) {
        warnings.push('Consider processing as full refund instead of partial');
      }

      return {
        valid: errors.length === 0,
        errors,
        warnings,
        maxRefundableAmount,
        ...(request.refundType === 'full' && { suggestedAmount: maxRefundableAmount })
      };
    } catch (error) {
      logger.error('Refund validation failed:', error);
      return {
        valid: false,
        errors: ['Validation error occurred'],
        warnings: [],
        maxRefundableAmount: 0
      };
    }
  }

  /**
   * Process a comprehensive refund with inventory and audit trail updates
   */
  static async processRefund(
    request: RefundRequest,
    ipAddress?: string,
    userAgent?: string,
    sessionId?: string
  ): Promise<RefundResult> {
    const session = await mongoose.startSession();
    
    try {
      return await session.withTransaction(async () => {
        // Validate refund request
        const validation = await this.validateRefundRequest(request);
        if (!validation.valid) {
          throw new Error(`Refund validation failed: ${validation.errors.join(', ')}`);
        }

        // Get transaction
        const transaction = await Transaction.findById(request.transactionId).session(session);
        if (!transaction) {
          throw new Error('Transaction not found');
        }

        // Process refund through payment gateway
        const gatewayResult = await this.processGatewayRefund(transaction, request.amount);
        if (!gatewayResult.success) {
          throw new Error(`Gateway refund failed: ${gatewayResult.errorMessage}`);
        }

        // Create refund record
        const refundDetails: RefundDetails = {
          refundId: `REF-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
          amount: request.amount,
          reason: request.reason,
          refundedBy: request.refundedBy,
          refundedAt: new Date(),
          ...(gatewayResult.refundId && { gatewayRefundId: gatewayResult.refundId }),
          status: 'completed'
        };

        // Update transaction
        transaction.refunds.push(refundDetails);
        transaction.refundedAmount += request.amount;

        // Update transaction status
        if (transaction.isFullyRefunded()) {
          transaction.status = 'refunded';
        } else {
          transaction.status = 'partially_refunded';
        }

        await transaction.save({ session });

        // Handle inventory restocking if requested
        const inventoryUpdates: Array<{
          productId: string;
          quantityRestocked: number;
          newQuantity: number;
        }> = [];

        if (request.restockItems && request.itemRefunds) {
          for (const itemRefund of request.itemRefunds) {
            try {
              const inventoryResult = await InventoryService.updateStock(
                itemRefund.productId,
                itemRefund.quantity,
                'restock',
                `Refund restock: ${request.reason}`,
                request.refundedBy,
                `refund-${refundDetails.refundId}`
              );

              inventoryUpdates.push({
                productId: itemRefund.productId,
                quantityRestocked: itemRefund.quantity,
                newQuantity: inventoryResult.newQuantity
              });
            } catch (inventoryError) {
              logger.error('Inventory restock failed during refund:', inventoryError);
              // Continue with refund even if inventory update fails
            }
          }
        }

        // Log comprehensive audit trail
        await AuditService.logRefundEvent(
          transaction,
          request.amount,
          request.reason,
          request.refundedBy,
          {
            ...(ipAddress && { ipAddress }),
            ...(userAgent && { userAgent }),
            ...(sessionId && { sessionId }),
            metadata: {
              refundType: request.refundType,
              itemRefunds: request.itemRefunds,
              restockItems: request.restockItems,
              inventoryUpdates,
              ...(gatewayResult.refundId && { gatewayRefundId: gatewayResult.refundId }),
              ...request.metadata
            }
          }
        );

        // Send notification to customer if requested
        if (request.notifyCustomer) {
          try {
            // Get order for notification context
            const order = await Order.findById(transaction.orderId);
            if (order) {
              // In a real implementation, you would send a refund notification
              // For now, we'll log it
              logger.info('Refund notification would be sent', {
                transactionId: transaction._id,
                refundAmount: request.amount,
                customerUserId: transaction.userId
              });
            }
          } catch (notificationError) {
            logger.error('Refund notification failed:', notificationError);
            // Don't fail the refund if notification fails
          }
        }

        logger.info('Refund processed successfully', {
          refundId: refundDetails.refundId,
          transactionId: transaction._id,
          transactionNumber: transaction.transactionNumber,
          refundAmount: request.amount,
          refundType: request.refundType,
          refundedBy: request.refundedBy,
          inventoryUpdatesCount: inventoryUpdates.length
        });

        return {
          success: true,
          refund: refundDetails,
          transaction,
          inventoryUpdates
        };
      });
    } catch (error) {
      logger.error('Refund processing failed:', error);
      return {
        success: false,
        errorMessage: (error as Error).message,
        errorCode: 'REFUND_PROCESSING_FAILED'
      };
    } finally {
      await session.endSession();
    }
  }

  /**
   * Get refund history for a transaction
   */
  static async getTransactionRefunds(transactionId: string): Promise<RefundDetails[]> {
    try {
      const transaction = await Transaction.findById(transactionId);
      if (!transaction) {
        throw new Error('Transaction not found');
      }

      return transaction.refunds;
    } catch (error) {
      logger.error('Get transaction refunds failed:', error);
      throw error;
    }
  }

  /**
   * Generate comprehensive refund report
   */
  static async generateRefundReport(
    filters: {
      startDate?: Date;
      endDate?: Date;
      refundedBy?: string;
      minAmount?: number;
      maxAmount?: number;
      reason?: string;
    } = {},
    limit: number = 1000
  ): Promise<RefundReport> {
    try {
      const matchStage: any = {
        'refunds.0': { $exists: true } // Has at least one refund
      };

      if (filters.startDate || filters.endDate) {
        matchStage['refunds.refundedAt'] = {};
        if (filters.startDate) matchStage['refunds.refundedAt'].$gte = filters.startDate;
        if (filters.endDate) matchStage['refunds.refundedAt'].$lte = filters.endDate;
      }

      if (filters.refundedBy) {
        matchStage['refunds.refundedBy'] = filters.refundedBy;
      }

      const aggregateResult = await Transaction.aggregate([
        { $match: matchStage },
        { $unwind: '$refunds' },
        {
          $match: {
            ...(filters.minAmount && { 'refunds.amount': { $gte: filters.minAmount } }),
            ...(filters.maxAmount && { 'refunds.amount': { $lte: filters.maxAmount } }),
            ...(filters.reason && { 'refunds.reason': { $regex: filters.reason, $options: 'i' } })
          }
        },
        {
          $group: {
            _id: null,
            totalRefunds: { $sum: 1 },
            totalRefundAmount: { $sum: '$refunds.amount' },
            averageRefundAmount: { $avg: '$refunds.amount' },
            refundsByReason: {
              $push: {
                reason: '$refunds.reason',
                amount: '$refunds.amount'
              }
            },
            allRefunds: {
              $push: {
                refundId: '$refunds.refundId',
                transactionNumber: '$transactionNumber',
                amount: '$refunds.amount',
                reason: '$refunds.reason',
                refundedAt: '$refunds.refundedAt',
                refundedBy: '$refunds.refundedBy'
              }
            }
          }
        }
      ]);

      const stats = aggregateResult[0] || {
        totalRefunds: 0,
        totalRefundAmount: 0,
        averageRefundAmount: 0,
        refundsByReason: [],
        allRefunds: []
      };

      // Process refunds by reason
      const reasonMap: Record<string, { count: number; amount: number }> = {};
      stats.refundsByReason.forEach((refund: any) => {
        const reason = refund.reason || 'Unknown';
        if (!reasonMap[reason]) {
          reasonMap[reason] = { count: 0, amount: 0 };
        }
        reasonMap[reason].count++;
        reasonMap[reason].amount += refund.amount;
      });

      // Calculate top refund reasons
      const topRefundReasons = Object.entries(reasonMap)
        .map(([reason, data]) => ({
          reason,
          count: data.count,
          amount: data.amount,
          percentage: (data.count / stats.totalRefunds) * 100
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // Mock refund types breakdown (in a real implementation, this would be tracked)
      const refundsByType: Record<RefundRequest['refundType'], { count: number; amount: number }> = {
        full: { count: Math.floor(stats.totalRefunds * 0.3), amount: stats.totalRefundAmount * 0.4 },
        partial: { count: Math.floor(stats.totalRefunds * 0.6), amount: stats.totalRefundAmount * 0.5 },
        item_specific: { count: Math.floor(stats.totalRefunds * 0.1), amount: stats.totalRefundAmount * 0.1 }
      };

      // Mock timeframe breakdown (simplified)
      const refundsByTimeframe = [
        { period: 'Last 7 days', count: Math.floor(stats.totalRefunds * 0.2), amount: stats.totalRefundAmount * 0.2 },
        { period: 'Last 30 days', count: Math.floor(stats.totalRefunds * 0.5), amount: stats.totalRefundAmount * 0.5 },
        { period: 'Last 90 days', count: stats.totalRefunds, amount: stats.totalRefundAmount }
      ];

      return {
        totalRefunds: stats.totalRefunds,
        totalRefundAmount: stats.totalRefundAmount,
        averageRefundAmount: stats.averageRefundAmount,
        refundsByReason: reasonMap,
        refundsByType,
        refundsByTimeframe,
        topRefundReasons,
        refunds: stats.allRefunds.slice(0, limit)
      };
    } catch (error) {
      logger.error('Generate refund report failed:', error);
      throw error;
    }
  }

  /**
   * Get refund statistics for dashboard
   */
  static async getRefundStatistics(
    timeframe: 'day' | 'week' | 'month' | 'year' = 'month'
  ): Promise<{
    totalRefunds: number;
    totalRefundAmount: number;
    refundRate: number; // Percentage of transactions that were refunded
    averageRefundAmount: number;
    trend: 'up' | 'down' | 'stable';
    comparisonPeriod: {
      totalRefunds: number;
      totalRefundAmount: number;
    };
  }> {
    try {
      const now = new Date();
      let startDate: Date;
      let comparisonStartDate: Date;

      switch (timeframe) {
        case 'day':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          comparisonStartDate = new Date(startDate.getTime() - 24 * 60 * 60 * 1000);
          break;
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          comparisonStartDate = new Date(startDate.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          comparisonStartDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          break;
        case 'year':
          startDate = new Date(now.getFullYear(), 0, 1);
          comparisonStartDate = new Date(now.getFullYear() - 1, 0, 1);
          break;
      }

      const [currentPeriod, comparisonPeriod, totalTransactions] = await Promise.all([
        Transaction.aggregate([
          {
            $match: {
              'refunds.refundedAt': { $gte: startDate, $lte: now },
              'refunds.0': { $exists: true }
            }
          },
          { $unwind: '$refunds' },
          {
            $match: {
              'refunds.refundedAt': { $gte: startDate, $lte: now }
            }
          },
          {
            $group: {
              _id: null,
              totalRefunds: { $sum: 1 },
              totalRefundAmount: { $sum: '$refunds.amount' },
              averageRefundAmount: { $avg: '$refunds.amount' }
            }
          }
        ]),
        Transaction.aggregate([
          {
            $match: {
              'refunds.refundedAt': { $gte: comparisonStartDate, $lt: startDate },
              'refunds.0': { $exists: true }
            }
          },
          { $unwind: '$refunds' },
          {
            $match: {
              'refunds.refundedAt': { $gte: comparisonStartDate, $lt: startDate }
            }
          },
          {
            $group: {
              _id: null,
              totalRefunds: { $sum: 1 },
              totalRefundAmount: { $sum: '$refunds.amount' }
            }
          }
        ]),
        Transaction.countDocuments({
          createdAt: { $gte: startDate, $lte: now }
        })
      ]);

      const current = currentPeriod[0] || { totalRefunds: 0, totalRefundAmount: 0, averageRefundAmount: 0 };
      const comparison = comparisonPeriod[0] || { totalRefunds: 0, totalRefundAmount: 0 };

      // Calculate refund rate
      const refundRate = totalTransactions > 0 ? (current.totalRefunds / totalTransactions) * 100 : 0;

      // Determine trend
      let trend: 'up' | 'down' | 'stable' = 'stable';
      if (current.totalRefundAmount > comparison.totalRefundAmount * 1.1) {
        trend = 'up';
      } else if (current.totalRefundAmount < comparison.totalRefundAmount * 0.9) {
        trend = 'down';
      }

      return {
        totalRefunds: current.totalRefunds,
        totalRefundAmount: current.totalRefundAmount,
        refundRate,
        averageRefundAmount: current.averageRefundAmount,
        trend,
        comparisonPeriod: {
          totalRefunds: comparison.totalRefunds,
          totalRefundAmount: comparison.totalRefundAmount
        }
      };
    } catch (error) {
      logger.error('Get refund statistics failed:', error);
      throw error;
    }
  }

  // Private helper methods

  private static async processGatewayRefund(
    transaction: ITransaction,
    refundAmount: number
  ): Promise<{ success: boolean; refundId?: string; errorMessage?: string }> {
    try {
      // Mock gateway refund processing
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
          errorMessage: 'Gateway refund processing failed'
        };
      }
    } catch (error) {
      logger.error('Gateway refund call failed:', error);
      return {
        success: false,
        errorMessage: 'Gateway communication error'
      };
    }
  }
}