import mongoose, { Document, Schema } from 'mongoose';

export interface ProductImage {
  url: string;
  alt: string;
  isPrimary: boolean;
}

export interface ProductPricing {
  retailPrice: number;
  wholesalePrice: number;
  costPrice: number;
  currency: string;
}

export interface InventoryInfo {
  quantity: number;
  reserved: number;
  lowStockThreshold: number;
  trackInventory: boolean;
}

export interface IProduct extends Document {
  name: string;
  description: string;
  category: string;
  subcategory?: string;
  brand: string;
  sku: string;
  images: ProductImage[];
  pricing: ProductPricing;
  inventory: InventoryInfo;
  specifications: Record<string, any>;
  tags: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;

  // Methods
  getAvailableQuantity(): number;
  isInStock(requestedQuantity?: number): boolean;
  getPriceForRole(role: 'admin' | 'employee' | 'customer', isWholesale?: boolean): number;
  toJSON(): any;
}

const ProductImageSchema = new Schema<ProductImage>({
  url: {
    type: String,
    required: true,
    trim: true
  },
  alt: {
    type: String,
    required: true,
    trim: true
  },
  isPrimary: {
    type: Boolean,
    default: false
  }
}, { _id: false });

const ProductPricingSchema = new Schema<ProductPricing>({
  retailPrice: {
    type: Number,
    required: [true, 'Retail price is required'],
    min: [0, 'Retail price must be positive']
  },
  wholesalePrice: {
    type: Number,
    required: [true, 'Wholesale price is required'],
    min: [0, 'Wholesale price must be positive']
  },
  costPrice: {
    type: Number,
    required: [true, 'Cost price is required'],
    min: [0, 'Cost price must be positive']
  },
  currency: {
    type: String,
    required: true,
    default: 'USD',
    uppercase: true,
    enum: ['USD', 'EUR', 'GBP', 'CAD']
  }
}, { _id: false });

const InventoryInfoSchema = new Schema<InventoryInfo>({
  quantity: {
    type: Number,
    required: true,
    min: [0, 'Quantity cannot be negative'],
    default: 0
  },
  reserved: {
    type: Number,
    required: true,
    min: [0, 'Reserved quantity cannot be negative'],
    default: 0
  },
  lowStockThreshold: {
    type: Number,
    required: true,
    min: [0, 'Low stock threshold cannot be negative'],
    default: 10
  },
  trackInventory: {
    type: Boolean,
    required: true,
    default: true
  }
}, { _id: false });

const ProductSchema = new Schema<IProduct>({
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true,
    maxlength: [200, 'Product name cannot exceed 200 characters']
  },
  description: {
    type: String,
    required: [true, 'Product description is required'],
    trim: true,
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    trim: true,
    index: true
  },
  subcategory: {
    type: String,
    trim: true,
    index: true
  },
  brand: {
    type: String,
    required: [true, 'Brand is required'],
    trim: true,
    index: true
  },
  sku: {
    type: String,
    required: [true, 'SKU is required'],
    unique: true,
    uppercase: true,
    trim: true,
    match: [/^[A-Z0-9\-_]+$/, 'SKU can only contain uppercase letters, numbers, hyphens, and underscores']
  },
  images: {
    type: [ProductImageSchema],
    validate: {
      validator: function(images: ProductImage[]) {
        return images.length > 0;
      },
      message: 'At least one product image is required'
    }
  },
  pricing: {
    type: ProductPricingSchema,
    required: true
  },
  inventory: {
    type: InventoryInfoSchema,
    required: true
  },
  specifications: {
    type: Schema.Types.Mixed,
    default: {}
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  isActive: {
    type: Boolean,
    default: true,
    index: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
ProductSchema.index({ name: 'text', description: 'text', tags: 'text' });
ProductSchema.index({ category: 1, subcategory: 1 });
ProductSchema.index({ brand: 1 });
ProductSchema.index({ 'pricing.retailPrice': 1 });
ProductSchema.index({ 'pricing.wholesalePrice': 1 });
ProductSchema.index({ 'inventory.quantity': 1 });
ProductSchema.index({ isActive: 1, createdAt: -1 });

// Virtual for available quantity
ProductSchema.virtual('availableQuantity').get(function(this: IProduct) {
  return Math.max(0, this.inventory.quantity - this.inventory.reserved);
});

// Virtual for primary image
ProductSchema.virtual('primaryImage').get(function(this: IProduct) {
  return this.images.find(img => img.isPrimary) || this.images[0];
});

// Pre-save middleware to ensure only one primary image
ProductSchema.pre('save', function(next) {
  if (this.isModified('images')) {
    const primaryImages = this.images.filter(img => img.isPrimary);
    
    if (primaryImages.length === 0 && this.images.length > 0) {
      // Set first image as primary if none is set
      const firstImage = this.images[0];
      if (firstImage) {
        firstImage.isPrimary = true;
      }
    } else if (primaryImages.length > 1) {
      // Ensure only the first primary image remains primary
      this.images.forEach((img, index) => {
        img.isPrimary = index === this.images.findIndex(i => i.isPrimary);
      });
    }
  }

  // Validate pricing logic
  if (this.pricing.wholesalePrice > this.pricing.retailPrice) {
    return next(new Error('Wholesale price cannot be higher than retail price'));
  }

  if (this.pricing.costPrice > this.pricing.wholesalePrice) {
    return next(new Error('Cost price cannot be higher than wholesale price'));
  }

  next();
});

// Instance method to get available quantity
ProductSchema.methods.getAvailableQuantity = function(): number {
  return Math.max(0, this.inventory.quantity - this.inventory.reserved);
};

// Instance method to check stock availability
ProductSchema.methods.isInStock = function(requestedQuantity: number = 1): boolean {
  if (!this.inventory.trackInventory) {
    return true; // Always in stock if not tracking inventory
  }
  return this.getAvailableQuantity() >= requestedQuantity;
};

// Instance method to get price based on user role
ProductSchema.methods.getPriceForRole = function(
  role: 'admin' | 'employee' | 'customer', 
  isWholesale: boolean = false
): number {
  // Admin and employees see cost price for reference
  if (role === 'admin' || role === 'employee') {
    return this.pricing.costPrice;
  }
  
  // Wholesale customers get wholesale price
  if (isWholesale) {
    return this.pricing.wholesalePrice;
  }
  
  // Regular customers get retail price
  return this.pricing.retailPrice;
};

// Override toJSON to include virtual fields and format data
ProductSchema.methods.toJSON = function() {
  const productObject = this.toObject();
  
  // Add virtual fields
  productObject.availableQuantity = this.getAvailableQuantity();
  productObject.primaryImage = this.primaryImage;
  
  // Remove sensitive data for non-admin users
  // This will be handled at the route level based on user role
  
  delete productObject.__v;
  return productObject;
};

// Static method to find products by category
ProductSchema.statics.findByCategory = function(category: string, subcategory?: string) {
  const query: any = { category, isActive: true };
  if (subcategory) {
    query.subcategory = subcategory;
  }
  return this.find(query);
};

// Static method to find low stock products
ProductSchema.statics.findLowStock = function() {
  return this.find({
    isActive: true,
    'inventory.trackInventory': true,
    $expr: {
      $lte: [
        { $subtract: ['$inventory.quantity', '$inventory.reserved'] },
        '$inventory.lowStockThreshold'
      ]
    }
  });
};

// Static method for text search
ProductSchema.statics.searchProducts = function(searchTerm: string, options: any = {}) {
  const query = {
    $text: { $search: searchTerm },
    isActive: true,
    ...options
  };
  
  return this.find(query, { score: { $meta: 'textScore' } })
    .sort({ score: { $meta: 'textScore' } });
};

export const Product = mongoose.model<IProduct>('Product', ProductSchema);