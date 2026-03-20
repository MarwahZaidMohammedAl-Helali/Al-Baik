import mongoose, { Document, Schema } from 'mongoose';
import { OrderStatus, Address } from '../types/common';

export interface OrderItem {
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface OrderPricing {
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  shippingCost: number;
  totalAmount: number;
  discountCode?: string | undefined;
}

export interface StatusUpdate {
  status: OrderStatus;
  timestamp: Date;
  note?: string;
  updatedBy?: string;
}

export interface OrderTracking {
  trackingNumber?: string;
  carrier?: string;
  estimatedDelivery?: Date;
  statusHistory: StatusUpdate[];
  currentLocation?: string;
}

export interface PaymentInfo {
  method: 'credit_card' | 'debit_card' | 'paypal' | 'bank_transfer' | 'cash_on_delivery';
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';
  transactionId?: string;
  paymentDate?: Date;
  amount: number;
  currency: string;
}

export interface IOrder extends Document {
  orderNumber: string;
  userId: string;
  items: OrderItem[];
  pricing: OrderPricing;
  shippingAddress: Address;
  billingAddress: Address;
  status: OrderStatus;
  tracking: OrderTracking;
  paymentInfo: PaymentInfo;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;

  // Methods
  generateOrderNumber(): string;
  calculateTotals(): void;
  updateStatus(status: OrderStatus, note?: string, updatedBy?: string): void;
  getEstimatedDelivery(): Date | null;
  canBeCancelled(): boolean;
  toJSON(): any;
}

const OrderItemSchema = new Schema<OrderItem>({
  productId: {
    type: String,
    required: [true, 'Product ID is required'],
    ref: 'Product'
  },
  productName: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true
  },
  sku: {
    type: String,
    required: [true, 'SKU is required'],
    uppercase: true,
    trim: true
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [1, 'Quantity must be at least 1']
  },
  unitPrice: {
    type: Number,
    required: [true, 'Unit price is required'],
    min: [0, 'Unit price cannot be negative']
  },
  totalPrice: {
    type: Number,
    required: [true, 'Total price is required'],
    min: [0, 'Total price cannot be negative']
  }
}, { _id: false });

const OrderPricingSchema = new Schema<OrderPricing>({
  subtotal: {
    type: Number,
    required: [true, 'Subtotal is required'],
    min: [0, 'Subtotal cannot be negative']
  },
  discountAmount: {
    type: Number,
    required: true,
    min: [0, 'Discount amount cannot be negative'],
    default: 0
  },
  taxAmount: {
    type: Number,
    required: true,
    min: [0, 'Tax amount cannot be negative'],
    default: 0
  },
  shippingCost: {
    type: Number,
    required: true,
    min: [0, 'Shipping cost cannot be negative'],
    default: 0
  },
  totalAmount: {
    type: Number,
    required: [true, 'Total amount is required'],
    min: [0, 'Total amount cannot be negative']
  },
  discountCode: {
    type: String,
    trim: true,
    uppercase: true
  }
}, { _id: false });

const StatusUpdateSchema = new Schema<StatusUpdate>({
  status: {
    type: String,
    required: true,
    enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled']
  },
  timestamp: {
    type: Date,
    required: true,
    default: Date.now
  },
  note: {
    type: String,
    trim: true
  },
  updatedBy: {
    type: String,
    trim: true
  }
}, { _id: false });

const OrderTrackingSchema = new Schema<OrderTracking>({
  trackingNumber: {
    type: String,
    trim: true,
    uppercase: true
  },
  carrier: {
    type: String,
    trim: true
  },
  estimatedDelivery: {
    type: Date
  },
  statusHistory: {
    type: [StatusUpdateSchema],
    required: true,
    default: []
  },
  currentLocation: {
    type: String,
    trim: true
  }
}, { _id: false });

const PaymentInfoSchema = new Schema<PaymentInfo>({
  method: {
    type: String,
    required: [true, 'Payment method is required'],
    enum: ['credit_card', 'debit_card', 'paypal', 'bank_transfer', 'cash_on_delivery']
  },
  status: {
    type: String,
    required: [true, 'Payment status is required'],
    enum: ['pending', 'processing', 'completed', 'failed', 'refunded'],
    default: 'pending'
  },
  transactionId: {
    type: String,
    trim: true
  },
  paymentDate: {
    type: Date
  },
  amount: {
    type: Number,
    required: [true, 'Payment amount is required'],
    min: [0, 'Payment amount cannot be negative']
  },
  currency: {
    type: String,
    required: true,
    default: 'USD',
    uppercase: true,
    enum: ['USD', 'EUR', 'GBP', 'CAD']
  }
}, { _id: false });

const AddressSchema = new Schema<Address>({
  type: {
    type: String,
    enum: ['billing', 'shipping'],
    required: true
  },
  street: {
    type: String,
    required: [true, 'Street address is required'],
    trim: true
  },
  city: {
    type: String,
    required: [true, 'City is required'],
    trim: true
  },
  state: {
    type: String,
    required: [true, 'State is required'],
    trim: true
  },
  zipCode: {
    type: String,
    required: [true, 'ZIP code is required'],
    trim: true
  },
  country: {
    type: String,
    required: [true, 'Country is required'],
    trim: true,
    default: 'United States'
  },
  isDefault: {
    type: Boolean,
    default: false
  }
}, { _id: false });

const OrderSchema = new Schema<IOrder>({
  orderNumber: {
    type: String,
    required: [true, 'Order number is required'],
    unique: true,
    uppercase: true,
    trim: true,
    index: true
  },
  userId: {
    type: String,
    required: [true, 'User ID is required'],
    ref: 'User',
    index: true
  },
  items: {
    type: [OrderItemSchema],
    required: [true, 'Order items are required'],
    validate: {
      validator: function(items: OrderItem[]) {
        return items.length > 0;
      },
      message: 'Order must contain at least one item'
    }
  },
  pricing: {
    type: OrderPricingSchema,
    required: true
  },
  shippingAddress: {
    type: AddressSchema,
    required: [true, 'Shipping address is required']
  },
  billingAddress: {
    type: AddressSchema,
    required: [true, 'Billing address is required']
  },
  status: {
    type: String,
    required: true,
    enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'],
    default: 'pending',
    index: true
  },
  tracking: {
    type: OrderTrackingSchema,
    required: true,
    default: () => ({
      statusHistory: [{
        status: 'pending',
        timestamp: new Date(),
        note: 'Order created'
      }]
    })
  },
  paymentInfo: {
    type: PaymentInfoSchema,
    required: true
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [1000, 'Notes cannot exceed 1000 characters']
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
OrderSchema.index({ userId: 1, createdAt: -1 });
OrderSchema.index({ status: 1, createdAt: -1 });
OrderSchema.index({ 'tracking.trackingNumber': 1 });
OrderSchema.index({ createdAt: -1 });

// Virtual for order age in days
OrderSchema.virtual('ageInDays').get(function(this: IOrder) {
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - this.createdAt.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Virtual for current status
OrderSchema.virtual('currentStatus').get(function(this: IOrder) {
  const latestStatus = this.tracking.statusHistory[this.tracking.statusHistory.length - 1];
  return latestStatus ? latestStatus.status : this.status;
});

// Pre-save middleware to generate order number if not provided
OrderSchema.pre('save', function(next) {
  if (!this.orderNumber) {
    this.orderNumber = this.generateOrderNumber();
  }

  // Validate that item totals match pricing
  this.calculateTotals();

  // Ensure status history is updated
  if (this.isModified('status')) {
    this.updateStatus(this.status, 'Status updated');
  }

  next();
});

// Pre-save middleware to validate pricing consistency
OrderSchema.pre('save', function(next) {
  const calculatedSubtotal = this.items.reduce((sum, item) => sum + item.totalPrice, 0);
  
  if (Math.abs(calculatedSubtotal - this.pricing.subtotal) > 0.01) {
    return next(new Error('Subtotal does not match sum of item totals'));
  }

  const expectedTotal = this.pricing.subtotal - this.pricing.discountAmount + 
                       this.pricing.taxAmount + this.pricing.shippingCost;
  
  if (Math.abs(expectedTotal - this.pricing.totalAmount) > 0.01) {
    return next(new Error('Total amount calculation is incorrect'));
  }

  next();
});

// Instance method to generate unique order number
OrderSchema.methods.generateOrderNumber = function(): string {
  const timestamp = Date.now().toString();
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `ORD-${timestamp.slice(-8)}-${random}`;
};

// Instance method to calculate totals
OrderSchema.methods.calculateTotals = function(): void {
  // Calculate subtotal from items
  this.pricing.subtotal = this.items.reduce((sum: number, item: OrderItem) => {
    item.totalPrice = item.unitPrice * item.quantity;
    return sum + item.totalPrice;
  }, 0);

  // Calculate total amount
  this.pricing.totalAmount = this.pricing.subtotal - this.pricing.discountAmount + 
                            this.pricing.taxAmount + this.pricing.shippingCost;
};

// Instance method to update status with history tracking
OrderSchema.methods.updateStatus = function(
  status: OrderStatus, 
  note?: string, 
  updatedBy?: string
): void {
  this.status = status;
  
  // Add to status history if not already the latest status
  const latestStatus = this.tracking.statusHistory[this.tracking.statusHistory.length - 1];
  if (!latestStatus || latestStatus.status !== status) {
    this.tracking.statusHistory.push({
      status,
      timestamp: new Date(),
      note: note || `Status changed to ${status}`,
      updatedBy
    });
  }
};

// Instance method to get estimated delivery date
OrderSchema.methods.getEstimatedDelivery = function(): Date | null {
  if (this.tracking.estimatedDelivery) {
    return this.tracking.estimatedDelivery;
  }

  // Calculate estimated delivery based on shipping method and order date
  // Default to 5-7 business days for standard shipping
  const businessDays = 7;
  const estimatedDate = new Date(this.createdAt);
  estimatedDate.setDate(estimatedDate.getDate() + businessDays);
  
  return estimatedDate;
};

// Instance method to check if order can be cancelled
OrderSchema.methods.canBeCancelled = function(): boolean {
  return ['pending', 'confirmed'].includes(this.status);
};

// Override toJSON to format data and remove sensitive information
OrderSchema.methods.toJSON = function() {
  const orderObject = this.toObject();
  
  // Add virtual fields
  orderObject.ageInDays = this.ageInDays;
  orderObject.currentStatus = this.currentStatus;
  orderObject.estimatedDelivery = this.getEstimatedDelivery();
  orderObject.canBeCancelled = this.canBeCancelled();
  
  // Remove sensitive payment information for non-admin users
  // This will be handled at the route level based on user role
  
  delete orderObject.__v;
  return orderObject;
};

// Static method to find orders by user
OrderSchema.statics.findByUser = function(userId: string, options: any = {}) {
  return this.find({ userId, ...options }).sort({ createdAt: -1 });
};

// Static method to find orders by status
OrderSchema.statics.findByStatus = function(status: OrderStatus, options: any = {}) {
  return this.find({ status, ...options }).sort({ createdAt: -1 });
};

// Static method to find orders within date range
OrderSchema.statics.findByDateRange = function(startDate: Date, endDate: Date, options: any = {}) {
  return this.find({
    createdAt: {
      $gte: startDate,
      $lte: endDate
    },
    ...options
  }).sort({ createdAt: -1 });
};

// Static method to get order statistics
OrderSchema.statics.getOrderStats = function(startDate?: Date, endDate?: Date) {
  const matchStage: any = {};
  
  if (startDate && endDate) {
    matchStage.createdAt = {
      $gte: startDate,
      $lte: endDate
    };
  }

  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalOrders: { $sum: 1 },
        totalRevenue: { $sum: '$pricing.totalAmount' },
        averageOrderValue: { $avg: '$pricing.totalAmount' },
        statusBreakdown: {
          $push: '$status'
        }
      }
    },
    {
      $project: {
        _id: 0,
        totalOrders: 1,
        totalRevenue: 1,
        averageOrderValue: 1,
        statusCounts: {
          $reduce: {
            input: '$statusBreakdown',
            initialValue: {},
            in: {
              $mergeObjects: [
                '$$value',
                {
                  $arrayToObject: [
                    [{ k: '$$this', v: { $add: [{ $ifNull: [{ $getField: { field: '$$this', input: '$$value' } }, 0] }, 1] } }]
                  ]
                }
              ]
            }
          }
        }
      }
    }
  ]);
};

export const Order = mongoose.model<IOrder>('Order', OrderSchema);