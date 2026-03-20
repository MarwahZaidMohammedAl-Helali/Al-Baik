import { ProductService } from './productService';
import { Product } from '../models/Product';

describe('ProductService', () => {
  afterEach(async () => {
    await Product.deleteMany({});
  });

  const sampleProductData = {
    name: 'iPhone 15 Case',
    description: 'Premium protective case for iPhone 15',
    category: 'Phone Cases',
    subcategory: 'iPhone Cases',
    brand: 'Apple',
    sku: 'IPHONE15-CASE-001',
    images: [
      { url: 'https://example.com/image1.jpg', alt: 'iPhone 15 Case Front', isPrimary: true },
      { url: 'https://example.com/image2.jpg', alt: 'iPhone 15 Case Back', isPrimary: false }
    ],
    pricing: {
      retailPrice: 49.99,
      wholesalePrice: 29.99,
      costPrice: 15.00,
      currency: 'USD'
    },
    inventory: {
      quantity: 100,
      reserved: 0,
      lowStockThreshold: 10,
      trackInventory: true
    },
    specifications: {
      material: 'Silicone',
      color: 'Black',
      compatibility: 'iPhone 15'
    },
    tags: ['iphone', 'case', 'protective', 'silicone']
  };

  describe('createProduct', () => {
    it('should create a new product successfully', async () => {
      const product = await ProductService.createProduct(sampleProductData);

      expect(product).toBeDefined();
      expect(product.name).toBe(sampleProductData.name);
      expect(product.sku).toBe(sampleProductData.sku);
      expect(product.pricing.retailPrice).toBe(sampleProductData.pricing.retailPrice);
      expect(product.inventory.quantity).toBe(sampleProductData.inventory.quantity);
      expect(product.isActive).toBe(true);
    });

    it('should not create product with duplicate SKU', async () => {
      await ProductService.createProduct(sampleProductData);

      await expect(ProductService.createProduct(sampleProductData))
        .rejects.toThrow('Product with SKU IPHONE15-CASE-001 already exists');
    });

    it('should convert SKU to uppercase', async () => {
      const productData = { ...sampleProductData, sku: 'lowercase-sku-123' };
      const product = await ProductService.createProduct(productData);

      expect(product.sku).toBe('LOWERCASE-SKU-123');
    });
  });

  describe('updateProduct', () => {
    let productId: string;

    beforeEach(async () => {
      const product = await ProductService.createProduct(sampleProductData);
      productId = product._id.toString();
    });

    it('should update product successfully', async () => {
      const updates = {
        name: 'Updated iPhone 15 Case',
        pricing: {
          retailPrice: 59.99,
          wholesalePrice: 39.99,
          costPrice: 20.00,
          currency: 'USD'
        }
      };

      const updatedProduct = await ProductService.updateProduct(productId, updates);

      expect(updatedProduct.name).toBe(updates.name);
      expect(updatedProduct.pricing.retailPrice).toBe(updates.pricing.retailPrice);
    });

    it('should throw error for non-existent product', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      
      await expect(ProductService.updateProduct(fakeId, { name: 'Updated' }))
        .rejects.toThrow('Product not found');
    });
  });

  describe('getProductById', () => {
    let productId: string;

    beforeEach(async () => {
      const product = await ProductService.createProduct(sampleProductData);
      productId = product._id.toString();
    });

    it('should get product by ID', async () => {
      const product = await ProductService.getProductById(productId);

      expect(product).toBeDefined();
      expect(product!.name).toBe(sampleProductData.name);
    });

    it('should return null for non-existent product', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const product = await ProductService.getProductById(fakeId);

      expect(product).toBeNull();
    });
  });

  describe('getProductBySku', () => {
    beforeEach(async () => {
      await ProductService.createProduct(sampleProductData);
    });

    it('should get product by SKU', async () => {
      const product = await ProductService.getProductBySku(sampleProductData.sku);

      expect(product).toBeDefined();
      expect(product!.sku).toBe(sampleProductData.sku);
    });

    it('should be case insensitive', async () => {
      const product = await ProductService.getProductBySku(sampleProductData.sku.toLowerCase());

      expect(product).toBeDefined();
      expect(product!.sku).toBe(sampleProductData.sku);
    });

    it('should return null for non-existent SKU', async () => {
      const product = await ProductService.getProductBySku('NON-EXISTENT-SKU');

      expect(product).toBeNull();
    });
  });

  describe('getProducts', () => {
    beforeEach(async () => {
      // Create multiple test products
      await ProductService.createProduct(sampleProductData);
      
      await ProductService.createProduct({
        ...sampleProductData,
        name: 'Samsung Galaxy Case',
        description: 'Premium protective case for Samsung Galaxy',
        sku: 'SAMSUNG-CASE-001',
        category: 'Phone Cases',
        subcategory: 'Samsung Cases',
        brand: 'Samsung',
        tags: ['samsung', 'case', 'protective', 'silicone'],
        specifications: {
          material: 'Silicone',
          color: 'Black',
          compatibility: 'Samsung Galaxy'
        }
      });

      await ProductService.createProduct({
        ...sampleProductData,
        name: 'Wireless Charger',
        description: 'Fast wireless charging pad for smartphones',
        sku: 'WIRELESS-CHARGER-001',
        category: 'Chargers',
        brand: 'Anker',
        tags: ['charger', 'wireless', 'fast-charging'],
        specifications: {
          material: 'Plastic',
          color: 'Black',
          compatibility: 'Universal'
        },
        pricing: {
          retailPrice: 79.99,
          wholesalePrice: 49.99,
          costPrice: 25.00,
          currency: 'USD'
        }
      });
    });

    it('should get all products with pagination', async () => {
      const result = await ProductService.getProducts({ page: 1, limit: 10 });

      expect(result.products).toHaveLength(3);
      expect(result.total).toBe(3);
      expect(result.page).toBe(1);
      expect(result.totalPages).toBe(1);
    });

    it('should filter by category', async () => {
      const result = await ProductService.getProducts({ category: 'Phone Cases' });

      expect(result.products).toHaveLength(2);
      expect(result.products.every(p => p.category === 'Phone Cases')).toBe(true);
    });

    it('should filter by brand', async () => {
      const result = await ProductService.getProducts({ brand: 'Apple' });

      expect(result.products).toHaveLength(1);
      expect(result.products[0]?.brand).toBe('Apple');
    });

    it('should filter by price range', async () => {
      const result = await ProductService.getProducts({ 
        minPrice: 50, 
        maxPrice: 80,
        priceType: 'retail'
      });

      expect(result.products).toHaveLength(1);
      expect(result.products[0]?.pricing.retailPrice).toBeGreaterThanOrEqual(50);
      expect(result.products[0]?.pricing.retailPrice).toBeLessThanOrEqual(80);
    });

    it('should search products by text', async () => {
      const result = await ProductService.searchProducts('iPhone');

      expect(result.products).toHaveLength(1);
      expect(result.products[0]?.name).toContain('iPhone');
    });
  });

  describe('deleteProduct', () => {
    let productId: string;

    beforeEach(async () => {
      const product = await ProductService.createProduct(sampleProductData);
      productId = product._id.toString();
    });

    it('should soft delete product', async () => {
      const result = await ProductService.deleteProduct(productId);

      expect(result).toBe(true);

      const product = await Product.findById(productId);
      expect(product!.isActive).toBe(false);
    });

    it('should throw error for non-existent product', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      
      await expect(ProductService.deleteProduct(fakeId))
        .rejects.toThrow('Product not found');
    });
  });

  describe('updateInventory', () => {
    let productId: string;

    beforeEach(async () => {
      const product = await ProductService.createProduct(sampleProductData);
      productId = product._id.toString();
    });

    it('should set inventory quantity', async () => {
      const updatedProduct = await ProductService.updateInventory(productId, 50, 'set');

      expect(updatedProduct.inventory.quantity).toBe(50);
    });

    it('should add to inventory quantity', async () => {
      const updatedProduct = await ProductService.updateInventory(productId, 25, 'add');

      expect(updatedProduct.inventory.quantity).toBe(125); // 100 + 25
    });

    it('should subtract from inventory quantity', async () => {
      const updatedProduct = await ProductService.updateInventory(productId, 30, 'subtract');

      expect(updatedProduct.inventory.quantity).toBe(70); // 100 - 30
    });

    it('should not allow negative inventory', async () => {
      const updatedProduct = await ProductService.updateInventory(productId, 150, 'subtract');

      expect(updatedProduct.inventory.quantity).toBe(0);
    });
  });

  describe('reserveInventory', () => {
    let productId: string;

    beforeEach(async () => {
      const product = await ProductService.createProduct(sampleProductData);
      productId = product._id.toString();
    });

    it('should reserve inventory successfully', async () => {
      const result = await ProductService.reserveInventory(productId, 20);

      expect(result).toBe(true);

      const product = await Product.findById(productId);
      expect(product!.inventory.reserved).toBe(20);
    });

    it('should throw error for insufficient inventory', async () => {
      await expect(ProductService.reserveInventory(productId, 150))
        .rejects.toThrow('Insufficient inventory available');
    });
  });

  describe('releaseReservedInventory', () => {
    let productId: string;

    beforeEach(async () => {
      const product = await ProductService.createProduct(sampleProductData);
      productId = product._id.toString();
      await ProductService.reserveInventory(productId, 30);
    });

    it('should release reserved inventory', async () => {
      const result = await ProductService.releaseReservedInventory(productId, 20);

      expect(result).toBe(true);

      const product = await Product.findById(productId);
      expect(product!.inventory.reserved).toBe(10); // 30 - 20
    });

    it('should not allow negative reserved inventory', async () => {
      const result = await ProductService.releaseReservedInventory(productId, 50);

      expect(result).toBe(true);

      const product = await Product.findById(productId);
      expect(product!.inventory.reserved).toBe(0);
    });
  });

  describe('getLowStockProducts', () => {
    beforeEach(async () => {
      // Create product with low stock
      await ProductService.createProduct({
        ...sampleProductData,
        sku: 'LOW-STOCK-001',
        inventory: {
          quantity: 5,
          reserved: 0,
          lowStockThreshold: 10,
          trackInventory: true
        }
      });

      // Create product with normal stock
      await ProductService.createProduct({
        ...sampleProductData,
        sku: 'NORMAL-STOCK-001',
        inventory: {
          quantity: 50,
          reserved: 0,
          lowStockThreshold: 10,
          trackInventory: true
        }
      });
    });

    it('should return low stock products', async () => {
      const lowStockProducts = await ProductService.getLowStockProducts();

      expect(lowStockProducts).toHaveLength(1);
      expect(lowStockProducts[0]?.sku).toBe('LOW-STOCK-001');
    });
  });

  describe('getCategories', () => {
    beforeEach(async () => {
      await ProductService.createProduct(sampleProductData);
      
      await ProductService.createProduct({
        ...sampleProductData,
        name: 'Wireless Charger',
        sku: 'CHARGER-001',
        category: 'Chargers',
        subcategory: 'Wireless Chargers'
      });
    });

    it('should return categories with subcategories', async () => {
      const categories = await ProductService.getCategories();

      expect(categories).toHaveLength(2);
      expect(categories.find(c => c.category === 'Phone Cases')).toBeDefined();
      expect(categories.find(c => c.category === 'Chargers')).toBeDefined();
    });
  });

  describe('getBrands', () => {
    beforeEach(async () => {
      await ProductService.createProduct(sampleProductData);
      
      await ProductService.createProduct({
        ...sampleProductData,
        name: 'Samsung Case',
        sku: 'SAMSUNG-001',
        brand: 'Samsung'
      });
    });

    it('should return sorted list of brands', async () => {
      const brands = await ProductService.getBrands();

      expect(brands).toEqual(['Apple', 'Samsung']);
    });
  });
});