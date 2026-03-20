import mongoose, { Document, Schema } from 'mongoose';
import { logger } from '../utils/logger';
import { ITransaction } from '../models/Transaction';
import { IOrder } from '../models/Order';

export interface AuditEvent {
  eventId: string;
  eventType: 'transaction' | 'refund' | 'order' | 'inventory' | 'pricing' | 'user' | 'system';
  action: string;
  entityType: 'transaction' | 'order' | 'product' | 'user' | 'discount_code' | 'inventory';
  entityId: string;
  userId?: string;
  performedBy: string;
  timestamp: Date;
  description: string;
  previousState?: Record<string, any>;
  newState?: Record<string, any>;
  metadata: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  tags: string[];
}

export interface IAuditLog extends Document {
  eventId: string;
  eventType: AuditEvent['eventType'];
  action: string;
  entityType: AuditEvent['entityType'];
  entityId: string;
  userId?: string;
  performedBy: string;
  timestamp: Date;
  description: string;
  previousState?: Record<string, any>;
  newState?: Record<string, any>;
  metadata: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  riskLevel: AuditEvent['riskLevel'];
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

const AuditLogSchema = new Schema({
  eventId: {
    type: String,
    required: true,
    unique: true
  },
  eventType: {
    type: String,
    enum: ['transaction', 'refund', 'order', 'inventory', 'pricing', 'user', 'system'],
    required: true
  },
  action: {
    type: String,
    required: true
  },
  entityType: {
    type: String,
    enum: ['transaction', 'order', 'product', 'user', 'discount_code', 'inventory'],
    required: true
  },
  entityId: {
    type: String,
    required: true
  },
  userId: String,
  performedBy: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    required: true,
    default: Date.now
  },
  description: {
    type: String,
    required: true
  },
  previousState: Schema.Types.Mixed,
  newState: Schema.Types.Mixed,
  metadata: {
    type: Schema.Types.Mixed,
    default: {}
  },
  ipAddress: String,
  userAgent: String,
  sessionId: String,
  riskLevel: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'low'
  },
  tags: [{
    type: String
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance and querying
AuditLogSchema.index({ eventId: 1 });
AuditLogSchema.index({ eventType: 1, timestamp: -1 });
AuditLogSchema.index({ entityType: 1, entityId: 1, timestamp: -1 });
AuditLogSchema.index({ userId: 1, timestamp: -1 });
AuditLogSchema.index({ performedBy: 1, timestamp: -1 });
AuditLogSchema.index({ riskLevel: 1, timestamp: -1 });
AuditLogSchema.index({ tags: 1, timestamp: -1 });
AuditLogSchema.index({ timestamp: -1 });

// Compound indexes for common queries
AuditLogSchema.index({ eventType: 1, action: 1, timestamp: -1 });
AuditLogSchema.index({ entityType: 1, entityId: 1, eventType: 1, timestamp: -1 });

// Generate unique event ID before saving
AuditLogSchema.pre('save', async function(next) {
  if (this.isNew && !this.eventId) {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substr(2, 8).toUpperCase();
    this.eventId = `AUDIT-${timestamp}-${random}`;
  }
  next();
});

export const AuditLog = mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);

export interface AuditFilters {
  eventType?: AuditEvent['eventType'];
  action?: string;
  entityType?: AuditEvent['entityType'];
  entityId?: string;
  userId?: string;
  performedBy?: string;
  startDate?: Date;
  endDate?: Date;
  riskLevel?: AuditEvent['riskLevel'];
  tags?: string[];
  ipAddress?: string;
}

export interface AuditReport {
  totalEvents: number;
  eventTypeBreakdown: Record<AuditEvent['eventType'], number>;
  actionBreakdown: Record<string, number>;
  riskLevelBreakdown: Record<AuditEvent['riskLevel'], number>;
  topUsers: Array<{ user: string; eventCount: number }>;
  recentEvents: AuditEvent[];
  timeRange: {
    startDate: Date;
    endDate: Date;
  };
}

/**
 * Comprehensive Audit Service for financial and system operations
 */
export class AuditService {
  /**
   * Log a financial audit event
   */
  static async logFinancialEvent(
    action: string,
    entityType: AuditEvent['entityType'],
    entityId: string,
    performedBy: string,
    description: string,
    options: {
      previousState?: Record<string, any>;
      newState?: Record<string, any>;
      metadata?: Record<string, any>;
      ipAddress?: string;
      userAgent?: string;
      sessionId?: string;
      userId?: string;
      riskLevel?: AuditEvent['riskLevel'];
      tags?: string[];
    } = {}
  ): Promise<IAuditLog> {
    try {
      const auditEvent: Partial<AuditEvent> = {
        eventType: 'transaction',
        action,
        entityType,
        entityId,
        performedBy,
        description,
        timestamp: new Date(),
        ...(options.previousState && { previousState: options.previousState }),
        ...(options.newState && { newState: options.newState }),
        metadata: options.metadata || {},
        ...(options.ipAddress && { ipAddress: options.ipAddress }),
        ...(options.userAgent && { userAgent: options.userAgent }),
        ...(options.sessionId && { sessionId: options.sessionId }),
        ...(options.userId && { userId: options.userId }),
        riskLevel: options.riskLevel || this.calculateRiskLevel(action, entityType),
        tags: options.tags || this.generateTags(action, entityType)
      };

      const auditLog = new AuditLog(auditEvent);
      await auditLog.save();

      logger.info('Financial audit event logged', {
        eventId: auditLog.eventId,
        action,
        entityType,
        entityId,
        performedBy,
        riskLevel: auditLog.riskLevel
      });

      return auditLog;
    } catch (error) {
      logger.error('Failed to log financial audit event:', error);
      throw error;
    }
  }

  /**
   * Log a refund audit event with enhanced tracking
   */
  static async logRefundEvent(
    transaction: ITransaction,
    refundAmount: number,
    reason: string,
    performedBy: string,
    options: {
      ipAddress?: string;
      userAgent?: string;
      sessionId?: string;
      metadata?: Record<string, any>;
    } = {}
  ): Promise<IAuditLog> {
    try {
      const previousState = {
        status: transaction.status,
        refundedAmount: transaction.refundedAmount,
        refundsCount: transaction.refunds.length
      };

      const newRefundedAmount = transaction.refundedAmount + refundAmount;
      const newStatus = newRefundedAmount >= transaction.totalAmount ? 'refunded' : 'partially_refunded';

      const newState = {
        status: newStatus,
        refundedAmount: newRefundedAmount,
        refundsCount: transaction.refunds.length + 1,
        refundAmount,
        reason
      };

      const metadata = {
        transactionNumber: transaction.transactionNumber,
        orderId: transaction.orderId,
        originalAmount: transaction.totalAmount,
        refundAmount,
        newRefundedAmount,
        remainingRefundable: transaction.totalAmount - newRefundedAmount,
        refundReason: reason,
        paymentMethod: transaction.paymentDetails.method,
        paymentProvider: transaction.paymentDetails.provider,
        ...options.metadata
      };

      return await this.logFinancialEvent(
        'refund_processed',
        'transaction',
        transaction._id.toString(),
        performedBy,
        `Refund of $${refundAmount} processed for transaction ${transaction.transactionNumber}: ${reason}`,
        {
          previousState,
          newState,
          metadata,
          ...(options.ipAddress && { ipAddress: options.ipAddress }),
          ...(options.userAgent && { userAgent: options.userAgent }),
          ...(options.sessionId && { sessionId: options.sessionId }),
          userId: transaction.userId.toString(),
          riskLevel: refundAmount > 1000 ? 'high' : refundAmount > 100 ? 'medium' : 'low',
          tags: ['refund', 'financial', transaction.paymentDetails.method, transaction.paymentDetails.provider]
        }
      );
    } catch (error) {
      logger.error('Failed to log refund audit event:', error);
      throw error;
    }
  }

  /**
   * Log transaction creation audit event
   */
  static async logTransactionCreation(
    transaction: ITransaction,
    performedBy: string,
    options: {
      ipAddress?: string;
      userAgent?: string;
      sessionId?: string;
      metadata?: Record<string, any>;
    } = {}
  ): Promise<IAuditLog> {
    try {
      const newState = {
        transactionNumber: transaction.transactionNumber,
        status: transaction.status,
        totalAmount: transaction.totalAmount,
        paymentMethod: transaction.paymentDetails.method,
        paymentProvider: transaction.paymentDetails.provider,
        currency: transaction.currency
      };

      const metadata = {
        transactionNumber: transaction.transactionNumber,
        orderId: transaction.orderId,
        totalAmount: transaction.totalAmount,
        currency: transaction.currency,
        paymentMethod: transaction.paymentDetails.method,
        paymentProvider: transaction.paymentDetails.provider,
        itemCount: transaction.items.length,
        ...options.metadata
      };

      return await this.logFinancialEvent(
        'transaction_created',
        'transaction',
        transaction._id.toString(),
        performedBy,
        `Transaction ${transaction.transactionNumber} created for $${transaction.totalAmount}`,
        {
          newState,
          metadata,
          ...(options.ipAddress && { ipAddress: options.ipAddress }),
          ...(options.userAgent && { userAgent: options.userAgent }),
          ...(options.sessionId && { sessionId: options.sessionId }),
          userId: transaction.userId.toString(),
          riskLevel: transaction.totalAmount > 5000 ? 'high' : transaction.totalAmount > 1000 ? 'medium' : 'low',
          tags: ['transaction', 'creation', 'financial', transaction.paymentDetails.method]
        }
      );
    } catch (error) {
      logger.error('Failed to log transaction creation audit event:', error);
      throw error;
    }
  }

  /**
   * Log payment processing audit event
   */
  static async logPaymentProcessing(
    transaction: ITransaction,
    paymentResult: { success: boolean; status: string; transactionId: string; errorMessage?: string },
    performedBy: string,
    options: {
      ipAddress?: string;
      userAgent?: string;
      sessionId?: string;
      metadata?: Record<string, any>;
    } = {}
  ): Promise<IAuditLog> {
    try {
      const previousState = {
        status: 'pending',
        paymentDetails: {
          transactionId: '',
          processingFee: 0
        }
      };

      const newState = {
        status: paymentResult.status,
        paymentDetails: {
          transactionId: paymentResult.transactionId,
          processingFee: transaction.paymentDetails.processingFee
        },
        success: paymentResult.success
      };

      const metadata = {
        transactionNumber: transaction.transactionNumber,
        paymentSuccess: paymentResult.success,
        paymentStatus: paymentResult.status,
        gatewayTransactionId: paymentResult.transactionId,
        processingFee: transaction.paymentDetails.processingFee,
        paymentMethod: transaction.paymentDetails.method,
        paymentProvider: transaction.paymentDetails.provider,
        errorMessage: paymentResult.errorMessage,
        ...options.metadata
      };

      const action = paymentResult.success ? 'payment_processed' : 'payment_failed';
      const description = paymentResult.success 
        ? `Payment processed successfully for transaction ${transaction.transactionNumber}`
        : `Payment failed for transaction ${transaction.transactionNumber}: ${paymentResult.errorMessage}`;

      return await this.logFinancialEvent(
        action,
        'transaction',
        transaction._id.toString(),
        performedBy,
        description,
        {
          previousState,
          newState,
          metadata,
          ...(options.ipAddress && { ipAddress: options.ipAddress }),
          ...(options.userAgent && { userAgent: options.userAgent }),
          ...(options.sessionId && { sessionId: options.sessionId }),
          userId: transaction.userId.toString(),
          riskLevel: paymentResult.success ? 'low' : 'medium',
          tags: ['payment', paymentResult.success ? 'success' : 'failure', transaction.paymentDetails.method]
        }
      );
    } catch (error) {
      logger.error('Failed to log payment processing audit event:', error);
      throw error;
    }
  }

  /**
   * Get audit logs with filters
   */
  static async getAuditLogs(
    filters: AuditFilters,
    page: number = 1,
    limit: number = 50
  ): Promise<{
    logs: IAuditLog[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      const query: any = {};

      if (filters.eventType) query.eventType = filters.eventType;
      if (filters.action) query.action = filters.action;
      if (filters.entityType) query.entityType = filters.entityType;
      if (filters.entityId) query.entityId = filters.entityId;
      if (filters.userId) query.userId = filters.userId;
      if (filters.performedBy) query.performedBy = filters.performedBy;
      if (filters.riskLevel) query.riskLevel = filters.riskLevel;
      if (filters.ipAddress) query.ipAddress = filters.ipAddress;
      
      if (filters.tags && filters.tags.length > 0) {
        query.tags = { $in: filters.tags };
      }
      
      if (filters.startDate || filters.endDate) {
        query.timestamp = {};
        if (filters.startDate) query.timestamp.$gte = filters.startDate;
        if (filters.endDate) query.timestamp.$lte = filters.endDate;
      }

      const skip = (page - 1) * limit;
      
      const [logs, total] = await Promise.all([
        AuditLog.find(query)
          .sort({ timestamp: -1 })
          .skip(skip)
          .limit(limit),
        AuditLog.countDocuments(query)
      ]);

      return {
        logs,
        total,
        page,
        totalPages: Math.ceil(total / limit)
      };
    } catch (error) {
      logger.error('Get audit logs failed:', error);
      throw error;
    }
  }

  /**
   * Generate comprehensive audit report
   */
  static async generateAuditReport(
    filters: AuditFilters,
    limit: number = 1000
  ): Promise<AuditReport> {
    try {
      const query: any = {};

      if (filters.eventType) query.eventType = filters.eventType;
      if (filters.action) query.action = filters.action;
      if (filters.entityType) query.entityType = filters.entityType;
      if (filters.userId) query.userId = filters.userId;
      if (filters.riskLevel) query.riskLevel = filters.riskLevel;
      
      if (filters.startDate || filters.endDate) {
        query.timestamp = {};
        if (filters.startDate) query.timestamp.$gte = filters.startDate;
        if (filters.endDate) query.timestamp.$lte = filters.endDate;
      }

      const [aggregateResult, recentLogs] = await Promise.all([
        AuditLog.aggregate([
          { $match: query },
          {
            $group: {
              _id: null,
              totalEvents: { $sum: 1 },
              eventTypes: { $push: '$eventType' },
              actions: { $push: '$action' },
              riskLevels: { $push: '$riskLevel' },
              users: { $push: '$performedBy' },
              minDate: { $min: '$timestamp' },
              maxDate: { $max: '$timestamp' }
            }
          }
        ]),
        AuditLog.find(query)
          .sort({ timestamp: -1 })
          .limit(limit)
      ]);

      const stats = aggregateResult[0] || {
        totalEvents: 0,
        eventTypes: [],
        actions: [],
        riskLevels: [],
        users: [],
        minDate: new Date(),
        maxDate: new Date()
      };

      // Process breakdowns
      const eventTypeBreakdown: Record<AuditEvent['eventType'], number> = {
        transaction: 0,
        refund: 0,
        order: 0,
        inventory: 0,
        pricing: 0,
        user: 0,
        system: 0
      };

      const actionBreakdown: Record<string, number> = {};
      const riskLevelBreakdown: Record<AuditEvent['riskLevel'], number> = {
        low: 0,
        medium: 0,
        high: 0,
        critical: 0
      };

      stats.eventTypes.forEach((type: AuditEvent['eventType']) => {
        eventTypeBreakdown[type] = (eventTypeBreakdown[type] || 0) + 1;
      });

      stats.actions.forEach((action: string) => {
        actionBreakdown[action] = (actionBreakdown[action] || 0) + 1;
      });

      stats.riskLevels.forEach((level: AuditEvent['riskLevel']) => {
        riskLevelBreakdown[level] = (riskLevelBreakdown[level] || 0) + 1;
      });

      // Calculate top users
      const userCounts: Record<string, number> = {};
      stats.users.forEach((user: string) => {
        userCounts[user] = (userCounts[user] || 0) + 1;
      });

      const topUsers = Object.entries(userCounts)
        .map(([user, eventCount]) => ({ user, eventCount }))
        .sort((a, b) => b.eventCount - a.eventCount)
        .slice(0, 10);

      // Convert recent logs to AuditEvent format
      const recentEvents: AuditEvent[] = recentLogs.map(log => ({
        eventId: log.eventId,
        eventType: log.eventType,
        action: log.action,
        entityType: log.entityType,
        entityId: log.entityId,
        ...(log.userId && { userId: log.userId }),
        performedBy: log.performedBy,
        timestamp: log.timestamp,
        description: log.description,
        ...(log.previousState && { previousState: log.previousState }),
        ...(log.newState && { newState: log.newState }),
        metadata: log.metadata,
        ...(log.ipAddress && { ipAddress: log.ipAddress }),
        ...(log.userAgent && { userAgent: log.userAgent }),
        ...(log.sessionId && { sessionId: log.sessionId }),
        riskLevel: log.riskLevel,
        tags: log.tags
      }));

      return {
        totalEvents: stats.totalEvents,
        eventTypeBreakdown,
        actionBreakdown,
        riskLevelBreakdown,
        topUsers,
        recentEvents,
        timeRange: {
          startDate: stats.minDate,
          endDate: stats.maxDate
        }
      };
    } catch (error) {
      logger.error('Generate audit report failed:', error);
      throw error;
    }
  }

  /**
   * Get audit trail for a specific entity
   */
  static async getEntityAuditTrail(
    entityType: AuditEvent['entityType'],
    entityId: string,
    limit: number = 100
  ): Promise<IAuditLog[]> {
    try {
      const logs = await AuditLog.find({
        entityType,
        entityId
      })
        .sort({ timestamp: -1 })
        .limit(limit);

      return logs;
    } catch (error) {
      logger.error('Get entity audit trail failed:', error);
      throw error;
    }
  }

  // Private helper methods

  private static calculateRiskLevel(action: string, entityType: AuditEvent['entityType']): AuditEvent['riskLevel'] {
    // High-risk actions
    if (action.includes('refund') || action.includes('delete') || action.includes('void')) {
      return 'high';
    }

    // Medium-risk actions
    if (action.includes('update') || action.includes('modify') || action.includes('payment')) {
      return 'medium';
    }

    // Critical actions (rare but important)
    if (action.includes('admin') || action.includes('system') || action.includes('security')) {
      return 'critical';
    }

    return 'low';
  }

  private static generateTags(action: string, entityType: AuditEvent['entityType']): string[] {
    const tags: string[] = [entityType];

    if (action.includes('create')) tags.push('creation');
    if (action.includes('update')) tags.push('modification');
    if (action.includes('delete')) tags.push('deletion');
    if (action.includes('refund')) tags.push('refund', 'financial');
    if (action.includes('payment')) tags.push('payment', 'financial');
    if (action.includes('transaction')) tags.push('transaction', 'financial');
    if (action.includes('failed')) tags.push('failure');
    if (action.includes('success')) tags.push('success');

    return tags;
  }
}