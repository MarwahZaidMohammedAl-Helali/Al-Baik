import { Product, IProduct, ProductImage, ProductPricing, InventoryInfo } from '../models/Product';
import { logger } from '../utils/logger';
import { PaginationQuery } from '../types/common';

export interface CreateProductData {
  name: string;
  description: string;
  category: string;
  subcategory?: string;
  brand: string;
  sku: string;
  images: ProductImage[];
  pricing: ProductPricing;
  inventory: InventoryInfo;
  specifications?: Record<string, any>;
  tags?: string[];
}

export interface UpdateProductData {
  name?: string;
  description?: string;
  category?: string;
  subcategory?: string;
  brand?: string;
  images?: ProductImage[];
  pricing?: ProductPricing;
  inventory?: InventoryInfo;
  specifications?: Record<string, any>;
  tags?: string[];
  isActive?: boolean;
}

export interface ProductFilters {
  category?: string;
  subcategory?: string;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  tags?: string[];
  isActive?: boolean;
}

export interface ProductSearchOptions extends ProductFilters, PaginationQuery {
  search?: string;
  priceType?: 'retail' | 'wholesale';
}

export interface ProductListResult {
  products: IProduct[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class ProductService {
  /**
   * Create a new product
   */
  static async createProduct(productData: CreateProductData): Promise<IProduct> {
    try {
      // Check if SKU already exists
      const existingProduct = await Product.findOne({ sku: productData.sku.toUpperCase() });
      if (existingProduct) {
        throw new Error(`Product with SKU ${productData.sku} already exists`);
      }

      // Create new product
      const product = new Product({
        ...productData,
        sku: productData.sku.toUpperCase()
      });

      await product.save();

      logger.info('Product created successfully', {
        productId: product._id,
        sku: product.sku,
        name: product.name
      });

      return product;
    } catch (error) {
      logger.error('Product creation failed:', error);
      throw error;
    }
  }

  /**
   * Update an existing product
   */
  static async updateProduct(productId: string, updates: UpdateProductData): Promise<IProduct> {
    try {
      const product = await Product.findById(productId);
      
      if (!product) {
        throw new Error('Product not found');
      }

      // Apply updates
      Object.assign(product, updates);
      await product.save();

      logger.info('Product updated successfully', {
        productId: product._id,
        sku: product.sku,
        updatedFields: Object.keys(updates)
      });

      return product;
    } catch (error) {
      logger.error('Product update failed:', error);
      throw error;
    }
  }

  /**
   * Get product by ID
   */
  static async getProductById(productId: string): Promise<IProduct | null> {
    try {
      const product = await Product.findById(productId);
      return product;
    } catch (error) {
      logger.error('Get product by ID failed:', error);
      throw error;
    }
  }

  /**
   * Get product by SKU
   */
  static async getProductBySku(sku: string): Promise<IProduct | null> {
    try {
      const product = await Product.findOne({ sku: sku.toUpperCase() });
      return product;
    } catch (error) {
      logger.error('Get product by SKU failed:', error);
      throw error;
    }
  }

  /**
   * Get products with filtering and pagination
   */
  static async getProducts(options: ProductSearchOptions = {}): Promise<ProductListResult> {
    try {
      const {
        page = 1,
        limit = 20,
        sort = 'createdAt',
        order = 'desc',
        search,
        category,
        subcategory,
        brand,
        minPrice,
        maxPrice,
        inStock,
        tags,
        isActive = true,
        priceType = 'retail'
      } = options;

      // Build query
      const query: any = { isActive };

      // Category filters
      if (category) query.category = category;
      if (subcategory) query.subcategory = subcategory;
      if (brand) query.brand = brand;

      // Price filters
      const priceField = priceType === 'wholesale' ? 'pricing.wholesalePrice' : 'pricing.retailPrice';
      if (minPrice !== undefined) {
        query[priceField] = { ...query[priceField], $gte: minPrice };
      }
      if (maxPrice !== undefined) {
        query[priceField] = { ...query[priceField], $lte: maxPrice };
      }

      // Stock filter
      if (inStock) {
        query.$expr = {
          $gt: [
            { $subtract: ['$inventory.quantity', '$inventory.reserved'] },
            0
          ]
        };
      }

      // Tags filter
      if (tags && tags.length > 0) {
        query.tags = { $in: tags };
      }

      // Text search
      if (search) {
        query.$text = { $search: search };
      }

      // Build sort object
      const sortObj: any = {};
      if (search) {
        sortObj.score = { $meta: 'textScore' };
      }
      sortObj[sort] = order === 'desc' ? -1 : 1;

      // Execute query with pagination
      const skip = (page - 1) * limit;
      const [products, total] = await Promise.all([
        Product.find(query)
          .sort(sortObj)
          .skip(skip)
          .limit(limit),
        Product.countDocuments(query)
      ]);

      return {
        products,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      };
    } catch (error) {
      logger.error('Get products failed:', error);
      throw error;
    }
  }

  /**
   * Search products by text
   */
  static async searchProducts(searchTerm: string, options: ProductSearchOptions = {}): Promise<ProductListResult> {
    return this.getProducts({ ...options, search: searchTerm });
  }

  /**
   * Get products by category
   */
  static async getProductsByCategory(
    category: string, 
    subcategory?: string, 
    options: ProductSearchOptions = {}
  ): Promise<ProductListResult> {
    const searchOptions: ProductSearchOptions = { ...options, category };
    if (subcategory) {
      searchOptions.subcategory = subcategory;
    }
    return this.getProducts(searchOptions);
  }

  /**
   * Delete product (soft delete)
   */
  static async deleteProduct(productId: string): Promise<boolean> {
    try {
      const product = await Product.findById(productId);
      
      if (!product) {
        throw new Error('Product not found');
      }

      product.isActive = false;
      await product.save();

      logger.info('Product deleted (soft delete)', {
        productId: product._id,
        sku: product.sku
      });

      return true;
    } catch (error) {
      logger.error('Product deletion failed:', error);
      throw error;
    }
  }

  /**
   * Update product inventory
   */
  static async updateInventory(
    productId: string, 
    quantityChange: number, 
    type: 'add' | 'subtract' | 'set' = 'set'
  ): Promise<IProduct> {
    try {
      const product = await Product.findById(productId);
      
      if (!product) {
        throw new Error('Product not found');
      }

      const oldQuantity = product.inventory.quantity;
      
      switch (type) {
        case 'add':
          product.inventory.quantity += quantityChange;
          break;
        case 'subtract':
          product.inventory.quantity = Math.max(0, product.inventory.quantity - quantityChange);
          break;
        case 'set':
          product.inventory.quantity = Math.max(0, quantityChange);
          break;
      }

      await product.save();

      logger.info('Product inventory updated', {
        productId: product._id,
        sku: product.sku,
        oldQuantity,
        newQuantity: product.inventory.quantity,
        change: quantityChange,
        type
      });

      return product;
    } catch (error) {
      logger.error('Inventory update failed:', error);
      throw error;
    }
  }

  /**
   * Reserve inventory for orders
   */
  static async reserveInventory(productId: string, quantity: number): Promise<boolean> {
    try {
      const product = await Product.findById(productId);
      
      if (!product) {
        throw new Error('Product not found');
      }

      if (!product.isInStock(quantity)) {
        throw new Error('Insufficient inventory available');
      }

      product.inventory.reserved += quantity;
      await product.save();

      logger.info('Inventory reserved', {
        productId: product._id,
        sku: product.sku,
        reservedQuantity: quantity,
        totalReserved: product.inventory.reserved
      });

      return true;
    } catch (error) {
      logger.error('Inventory reservation failed:', error);
      throw error;
    }
  }

  /**
   * Release reserved inventory
   */
  static async releaseReservedInventory(productId: string, quantity: number): Promise<boolean> {
    try {
      const product = await Product.findById(productId);
      
      if (!product) {
        throw new Error('Product not found');
      }

      product.inventory.reserved = Math.max(0, product.inventory.reserved - quantity);
      await product.save();

      logger.info('Reserved inventory released', {
        productId: product._id,
        sku: product.sku,
        releasedQuantity: quantity,
        totalReserved: product.inventory.reserved
      });

      return true;
    } catch (error) {
      logger.error('Inventory release failed:', error);
      throw error;
    }
  }

  /**
   * Get low stock products
   */
  static async getLowStockProducts(): Promise<IProduct[]> {
    try {
      const products = await (Product as any).findLowStock();
      return products;
    } catch (error) {
      logger.error('Get low stock products failed:', error);
      throw error;
    }
  }

  /**
   * Get product categories
   */
  static async getCategories(): Promise<{ category: string; subcategories: string[] }[]> {
    try {
      const categories = await Product.aggregate([
        { $match: { isActive: true } },
        {
          $group: {
            _id: '$category',
            subcategories: { $addToSet: '$subcategory' }
          }
        },
        {
          $project: {
            category: '$_id',
            subcategories: {
              $filter: {
                input: '$subcategories',
                cond: { $ne: ['$$this', null] }
              }
            }
          }
        },
        { $sort: { category: 1 } }
      ]);

      return categories;
    } catch (error) {
      logger.error('Get categories failed:', error);
      throw error;
    }
  }

  /**
   * Get product brands
   */
  static async getBrands(): Promise<string[]> {
    try {
      const brands = await Product.distinct('brand', { isActive: true });
      return brands.sort();
    } catch (error) {
      logger.error('Get brands failed:', error);
      throw error;
    }
  }
}