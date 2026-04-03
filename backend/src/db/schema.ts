import { sqliteTable, text, integer, real, blob } from 'drizzle-orm/sqlite-core';
import { createId } from '@paralleldrive/cuid2';

// Categories table
export const categories = sqliteTable('categories', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  name: text('name').notNull(),
  nameAr: text('name_ar').notNull(),
  description: text('description'),
  descriptionAr: text('description_ar'),
  icon: text('icon'),
  color: text('color').default('#D32F2F'),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  sortOrder: integer('sort_order').default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

// Products table
export const products = sqliteTable('products', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  name: text('name').notNull(),
  nameAr: text('name_ar').notNull(),
  description: text('description'),
  descriptionAr: text('description_ar'),
  price: real('price').notNull(),
  currency: text('currency').default('JOD'),
  sku: text('sku').unique(),
  categoryId: text('category_id').references(() => categories.id),
  mainImage: text('main_image'),
  images: text('images'), // JSON array of image URLs
  videoUrl: text('video_url'),
  specifications: text('specifications'), // JSON object
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  inStock: integer('in_stock', { mode: 'boolean' }).default(true),
  stockQuantity: integer('stock_quantity').default(0),
  weight: real('weight'),
  dimensions: text('dimensions'), // JSON object {length, width, height}
  tags: text('tags'), // JSON array of tags
  rating: real('rating').default(0),
  reviewCount: integer('review_count').default(0),
  salesCount: integer('sales_count').default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

// Users table
export const users = sqliteTable('users', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  email: text('email').unique().notNull(),
  password: text('password').notNull(), // Hashed
  firstName: text('first_name'),
  lastName: text('last_name'),
  phone: text('phone'),
  role: text('role').default('customer'), // customer, staff, admin
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  emailVerified: integer('email_verified', { mode: 'boolean' }).default(false),
  lastLogin: integer('last_login', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

// Orders table
export const orders = sqliteTable('orders', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  userId: text('user_id').references(() => users.id),
  status: text('status').default('pending'), // pending, confirmed, processing, shipped, delivered, cancelled
  totalAmount: real('total_amount').notNull(),
  currency: text('currency').default('JOD'),
  shippingAddress: text('shipping_address'), // JSON object
  billingAddress: text('billing_address'), // JSON object
  paymentMethod: text('payment_method'),
  paymentStatus: text('payment_status').default('pending'), // pending, paid, failed, refunded
  notes: text('notes'),
  trackingNumber: text('tracking_number'),
  shippedAt: integer('shipped_at', { mode: 'timestamp' }),
  deliveredAt: integer('delivered_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

// Order items table
export const orderItems = sqliteTable('order_items', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  orderId: text('order_id').references(() => orders.id),
  productId: text('product_id').references(() => products.id),
  quantity: integer('quantity').notNull(),
  unitPrice: real('unit_price').notNull(),
  totalPrice: real('total_price').notNull(),
  productSnapshot: text('product_snapshot'), // JSON snapshot of product at time of order
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

// Reviews table
export const reviews = sqliteTable('reviews', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  productId: text('product_id').references(() => products.id),
  userId: text('user_id').references(() => users.id),
  rating: integer('rating').notNull(), // 1-5
  title: text('title'),
  comment: text('comment'),
  isVerified: integer('is_verified', { mode: 'boolean' }).default(false),
  isVisible: integer('is_visible', { mode: 'boolean' }).default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

// Cart items table (for persistent cart)
export const cartItems = sqliteTable('cart_items', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  userId: text('user_id').references(() => users.id),
  productId: text('product_id').references(() => products.id),
  quantity: integer('quantity').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

// Media files table (for R2 storage tracking)
export const mediaFiles = sqliteTable('media_files', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  filename: text('filename').notNull(),
  originalName: text('original_name').notNull(),
  mimeType: text('mime_type').notNull(),
  size: integer('size').notNull(),
  url: text('url').notNull(),
  type: text('type').notNull(), // image, video, document
  entityType: text('entity_type'), // product, category, user
  entityId: text('entity_id'),
  uploadedBy: text('uploaded_by').references(() => users.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

// Settings table (for app configuration)
export const settings = sqliteTable('settings', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  key: text('key').unique().notNull(),
  value: text('value'),
  type: text('type').default('string'), // string, number, boolean, json
  description: text('description'),
  isPublic: integer('is_public', { mode: 'boolean' }).default(false),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});