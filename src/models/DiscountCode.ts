import mongoose, { Document, Schema } from 'mongoose';

export interface IDiscountCode extends Document {
  code: string;
  type: 'wholesale' | 'promotional' | 'bulk';
  discountPercentage?: number;
  discountAmount?: number;
  minimumOrderValue?: number;
  maxUses?: number;
  currentUses: number;
  validFrom: Date;
  validUntil: Date;
  isActive: boolean;
  applicableUserRoles: ('admin' | 'employee' | 'customer')[];
  description?: string;
  createdAt: Date;
  updatedAt: Date;

  // Methods
  isValidForUser(userRole: 'admin' | 'employee' | 'customer'): boolean;
  isExpired(): boolean;
  hasUsageRemaining(): boolean;
  getDiscountAmount(orderValue: number): number;
}

const DiscountCodeSchema = new Schema<IDiscountCode>({
  code: {
    type: String,
    required: [true, 'Discount code is required'],
    unique: true,
    uppercase: true,
    trim: true,
    minlength: [3, 'Code must be at least 3 characters'],
    maxlength: [20, 'Code cannot exceed 20 characters'],
    match: [/^[A-Z0-9\-_]+$/, 'Code can only contain uppercase letters, numbers, hyphens, and underscores']
  },
  type: {
    type: String,
    required: [true, 'Discount type is required'],
    enum: {
      values: ['wholesale', 'promotional', 'bulk'],
      message: 'Type must be wholesale, promotional, or bulk'
    },
    index: true
  },
  discountPercentage: {
    type: Number,
    min: [0, 'Discount percentage cannot be negative'],
    max: [100, 'Discount percentage cannot exceed 100%'],
    validate: {
      validator: function(this: IDiscountCode, value: number) {
        // Either percentage or amount must be provided, but not both
        return (value !== undefined) !== (this.discountAmount !== undefined);
      },
      message: 'Either discount percentage or discount amount must be provided, but not both'
    }
  },
  discountAmount: {
    type: Number,
    min: [0, 'Discount amount cannot be negative'],
    validate: {
      validator: function(this: IDiscountCode, value: number) {
        // Either percentage or amount must be provided, but not both
        return (value !== undefined) !== (this.discountPercentage !== undefined);
      },
      message: 'Either discount percentage or discount amount must be provided, but not both'
    }
  },
  minimumOrderValue: {
    type: Number,
    min: [0, 'Minimum order value cannot be negative'],
    default: 0
  },
  maxUses: {
    type: Number,
    min: [1, 'Max uses must be at least 1'],
    default: null // null means unlimited uses
  },
  currentUses: {
    type: Number,
    min: [0, 'Current uses cannot be negative'],
    default: 0
  },
  validFrom: {
    type: Date,
    required: [true, 'Valid from date is required'],
    index: true
  },
  validUntil: {
    type: Date,
    required: [true, 'Valid until date is required'],
    index: true,
    validate: {
      validator: function(this: IDiscountCode, value: Date) {
        return value > this.validFrom;
      },
      message: 'Valid until date must be after valid from date'
    }
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  applicableUserRoles: [{
    type: String,
    enum: {
      values: ['admin', 'employee', 'customer'],
      message: 'User role must be admin, employee, or customer'
    }
  }],
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
DiscountCodeSchema.index({ code: 1, isActive: 1 });
DiscountCodeSchema.index({ type: 1, isActive: 1 });
DiscountCodeSchema.index({ validFrom: 1, validUntil: 1 });
DiscountCodeSchema.index({ isActive: 1, validFrom: 1, validUntil: 1 });

// Virtual for remaining uses
DiscountCodeSchema.virtual('remainingUses').get(function(this: IDiscountCode) {
  if (!this.maxUses) return null; // Unlimited
  return Math.max(0, this.maxUses - this.currentUses);
});

// Virtual for usage percentage
DiscountCodeSchema.virtual('usagePercentage').get(function(this: IDiscountCode) {
  if (!this.maxUses) return 0;
  return (this.currentUses / this.maxUses) * 100;
});

// Pre-save middleware for validation
DiscountCodeSchema.pre('save', function(next) {
  // Ensure at least one user role is specified
  if (!this.applicableUserRoles || this.applicableUserRoles.length === 0) {
    this.applicableUserRoles = ['customer']; // Default to customer
  }

  // Validate date range
  if (this.validUntil <= this.validFrom) {
    return next(new Error('Valid until date must be after valid from date'));
  }

  // Ensure either percentage or amount is provided
  if (!this.discountPercentage && !this.discountAmount) {
    return next(new Error('Either discount percentage or discount amount must be provided'));
  }

  if (this.discountPercentage && this.discountAmount) {
    return next(new Error('Cannot have both discount percentage and discount amount'));
  }

  next();
});

// Instance method to check if valid for user
DiscountCodeSchema.methods.isValidForUser = function(userRole: 'admin' | 'employee' | 'customer'): boolean {
  return this.applicableUserRoles.includes(userRole);
};

// Instance method to check if expired
DiscountCodeSchema.methods.isExpired = function(): boolean {
  const now = new Date();
  return now < this.validFrom || now > this.validUntil;
};

// Instance method to check usage remaining
DiscountCodeSchema.methods.hasUsageRemaining = function(): boolean {
  if (!this.maxUses) return true; // Unlimited uses
  return this.currentUses < this.maxUses;
};

// Instance method to calculate discount amount
DiscountCodeSchema.methods.getDiscountAmount = function(orderValue: number): number {
  if (this.discountAmount) {
    return Math.min(this.discountAmount, orderValue);
  }
  
  if (this.discountPercentage) {
    return orderValue * (this.discountPercentage / 100);
  }
  
  return 0;
};

// Static method to find active codes
DiscountCodeSchema.statics.findActiveCodes = function(userRole?: 'admin' | 'employee' | 'customer') {
  const now = new Date();
  const query: any = {
    isActive: true,
    validFrom: { $lte: now },
    validUntil: { $gte: now }
  };

  if (userRole) {
    query.applicableUserRoles = userRole;
  }

  return this.find(query).sort({ validUntil: 1 });
};

// Static method to find expiring codes
DiscountCodeSchema.statics.findExpiringCodes = function(days: number = 7) {
  const now = new Date();
  const futureDate = new Date(now.getTime() + (days * 24 * 60 * 60 * 1000));

  return this.find({
    isActive: true,
    validFrom: { $lte: now },
    validUntil: { $gte: now, $lte: futureDate }
  }).sort({ validUntil: 1 });
};

// Static method to find overused codes
DiscountCodeSchema.statics.findOverusedCodes = function() {
  return this.find({
    isActive: true,
    maxUses: { $ne: null },
    $expr: { $gte: ['$currentUses', '$maxUses'] }
  });
};

export const DiscountCode = mongoose.model<IDiscountCode>('DiscountCode', DiscountCodeSchema);