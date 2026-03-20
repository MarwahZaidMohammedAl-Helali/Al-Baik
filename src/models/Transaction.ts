import mongoose, { Document, Schema } from 'mongoose';
import { OrderStatus } from '../types/common';

export interface PaymentDetails {
  method: 'credit_card' | 'debit_card' | 'paypal' | 'bank_transfer' | 'cash_on_delivery';
  provider: string; // e.g., 'stripe', 'paypal', 'square'
  transactionId: string; // External payment provider transaction ID
  last4?: string; // Last 4 digits of card (for card payments)
  cardBrand?: string; // e.g., 'visa', 'mastercard', 'amex'
  currency: string;
  exchangeRate?: number; // If different from base currency
  processingFee?: number;
  gatewayResponse?: Record<string, any>; // Raw response from payment gateway
}

export interface RefundDetails {
  refundId: string;
  amount: number;
  reason: string;
  refundedBy: string;
  refundedAt: Date;
  gatewayRefundId?: string;
  status: 'pending' | 'completed' | 'failed';
}

export interface TransactionItem {
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  discountApplied?: number;
  taxAmount?: number;
}

export interface AuditTrail {
  action: 'created' | 'authorized' | 'captured' | 'refunded' | 'voided' | 'updated';
  timestamp: Date;
  performedBy: string;
  details: string;
  previousState?: Record<string, any>;
  newState?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

export interface ITransaction extends Document {
  // Basic transaction information
  transactionNumber: string;
  orderId: string;
  userId: string;
  
  // Financial details
  amount: number;
  currency: string;
  taxAmount: number;
  shippingAmount: number;
  discountAmount: number;
  totalAmount: number;
  
  // Payment information
  paymentDetails: PaymentDetails;
  
  // Transaction status and lifecycle
  status: 'pending' | 'authorized' | 'captured' | 'completed' | 'failed' | 'cancelled' | 'refunded' | 'partially_refunded';
  orderStatus: OrderStatus;
  
  // Items purchased
  items: TransactionItem[];
  
  // Refund information
  refunds: RefundDetails[];
  refundedAmount: number;
  
  // Audit and compliance
  auditTrail: AuditTrail[];
  
  // Metadata
  metadata: Record<string, any>;
  
  // Timestamps
  authorizedAt?: Date;
  capturedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  
  // Methods
  addAuditEntry(action: AuditTrail['action'], performedBy: string, details: string, additionalData?: Partial<AuditTrail>): void;
  calculateRefundableAmount(): number;
  canBeRefunded(): boolean;
  isFullyRefunded(): boolean;
  getNetAmount(): number;
}

const PaymentDetailsSchema = new Schema({
  method: {
    type: String,
    enum: ['credit_card', 'debit_card', 'paypal', 'bank_transfer', 'cash_on_delivery'],
    required: true
  },
  provider: {
    type: String,
    required: true
  },
  transactionId: {
    type: String,
    required: true,
    unique: true
  },
  last4: String,
  cardBrand: String,
  currency: {
    type: String,
    required: true,
    default: 'USD'
  },
  exchangeRate: Number,
  processingFee: {
    type: Number,
    default: 0
  },
  gatewayResponse: Schema.Types.Mixed
}, { _id: false });

const RefundDetailsSchema = new Schema({
  refundId: {
    type: String,
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  reason: {
    type: String,
    required: true
  },
  refundedBy: {
    type: String,
    required: true
  },
  refundedAt: {
    type: Date,
    required: true
  },
  gatewayRefundId: String,
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'pending'
  }
}, { _id: false });

const TransactionItemSchema = new Schema({
  productId: {
    type: String,
    required: true
  },
  productName: {
    type: String,
    required: true
  },
  sku: {
    type: String,
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  unitPrice: {
    type: Number,
    required: true,
    min: 0
  },
  totalPrice: {
    type: Number,
    required: true,
    min: 0
  },
  discountApplied: {
    type: Number,
    default: 0,
    min: 0
  },
  taxAmount: {
    type: Number,
    default: 0,
    min: 0
  }
}, { _id: false });

const AuditTrailSchema = new Schema({
  action: {
    type: String,
    enum: ['created', 'authorized', 'captured', 'refunded', 'voided', 'updated'],
    required: true
  },
  timestamp: {
    type: Date,
    required: true,
    default: Date.now
  },
  performedBy: {
    type: String,
    required: true
  },
  details: {
    type: String,
    required: true
  },
  previousState: Schema.Types.Mixed,
  newState: Schema.Types.Mixed,
  ipAddress: String,
  userAgent: String
}, { _id: false });

const TransactionSchema = new Schema({
  transactionNumber: {
    type: String,
    required: true,
    unique: true
  },
  orderId: {
    type: String,
    required: true,
    ref: 'Order'
  },
  userId: {
    type: String,
    required: true,
    ref: 'User'
  },
  
  // Financial details
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    required: true,
    default: 'USD'
  },
  taxAmount: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  shippingAmount: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  discountAmount: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  
  // Payment information
  paymentDetails: {
    type: PaymentDetailsSchema,
    required: true
  },
  
  // Status tracking
  status: {
    type: String,
    enum: ['pending', 'authorized', 'captured', 'completed', 'failed', 'cancelled', 'refunded', 'partially_refunded'],
    default: 'pending'
  },
  orderStatus: {
    type: String,
    enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'],
    required: true
  },
  
  // Items
  items: [TransactionItemSchema],
  
  // Refunds
  refunds: [RefundDetailsSchema],
  refundedAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // Audit trail
  auditTrail: [AuditTrailSchema],
  
  // Metadata for extensibility
  metadata: {
    type: Schema.Types.Mixed,
    default: {}
  },
  
  // Lifecycle timestamps
  authorizedAt: Date,
  capturedAt: Date,
  completedAt: Date
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
TransactionSchema.index({ transactionNumber: 1 });
TransactionSchema.index({ orderId: 1 });
TransactionSchema.index({ userId: 1 });
TransactionSchema.index({ status: 1 });
TransactionSchema.index({ 'paymentDetails.transactionId': 1 });
TransactionSchema.index({ createdAt: -1 });
TransactionSchema.index({ completedAt: -1 });

// Compound indexes for common queries
TransactionSchema.index({ userId: 1, status: 1, createdAt: -1 });
TransactionSchema.index({ status: 1, createdAt: -1 });

// Generate unique transaction number before saving
TransactionSchema.pre('save', async function(next) {
  if (this.isNew && !this.transactionNumber) {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substr(2, 6).toUpperCase();
    this.transactionNumber = `TXN-${timestamp}-${random}`;
  }
  next();
});

// Instance methods
TransactionSchema.methods.addAuditEntry = function(
  action: AuditTrail['action'],
  performedBy: string,
  details: string,
  additionalData?: Partial<AuditTrail>
): void {
  const auditEntry: AuditTrail = {
    action,
    timestamp: new Date(),
    performedBy,
    details,
    ...additionalData
  };
  
  this.auditTrail.push(auditEntry);
};

TransactionSchema.methods.calculateRefundableAmount = function(): number {
  return Math.max(0, this.totalAmount - this.refundedAmount);
};

TransactionSchema.methods.canBeRefunded = function(): boolean {
  return this.status === 'completed' && this.calculateRefundableAmount() > 0;
};

TransactionSchema.methods.isFullyRefunded = function(): boolean {
  return this.refundedAmount >= this.totalAmount;
};

TransactionSchema.methods.getNetAmount = function(): number {
  return this.totalAmount - this.refundedAmount;
};

// Virtual for refund status
TransactionSchema.virtual('refundStatus').get(function() {
  if (this.refundedAmount === 0) return 'none';
  if (this.refundedAmount >= this.totalAmount) return 'full';
  return 'partial';
});

// Virtual for processing fee percentage
TransactionSchema.virtual('processingFeePercentage').get(function() {
  if (this.totalAmount === 0) return 0;
  return (this.paymentDetails.processingFee || 0) / this.totalAmount * 100;
});

export const Transaction = mongoose.model<ITransaction>('Transaction', TransactionSchema);