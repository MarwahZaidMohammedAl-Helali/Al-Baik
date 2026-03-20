import request from 'supertest';
import { app } from '../server';
import { Product } from '../models/Product';
import { AuthService } from '../services/authService';

describe('Product Routes', () => {
  let adminToken: string;
  let employeeToken: string;
  let customerToken: string;

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
      color: 'Black'
    },
    tags: ['iphone', 'case', 'protective']
  };

  beforeEach(async () => {
    // Create test users
    const adminResult = await AuthService.register({
      email: 'admin@example.com',
      password: 'password123',
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin'
    });
    adminToken = adminResult.token!;

    const employeeResult = await AuthService.register({
      email: 'employee@example.com',
      password: 'password123',
      firstName: 'Employee',
      lastName: 'User',
      role: 'employee'
    });
    employeeToken = employeeResult.token!;

    const customerResult = await AuthService.register({
      email: 'customer@example.com',
      password: 'password123',
      firstName: 'Customer',
      lastName: 'User',
      role: 'customer'
    });
    customerToken = customerResult.token!;
  });

  afterEach(async () => {
    await Product.deleteMany({});
  });

  describe('GET /api/products', () => {
    beforeEach(async () => {
      // Create test products
      await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(sampleProductData);

      await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          ...sampleProductData,
          name: 'Samsung Galaxy Case',
          description: 'Premium protective case for Samsung Galaxy',
          sku: 'SAMSUNG-CASE-001',
          brand: 'Samsung',
          tags: ['samsung', 'case', 'protective']
        });
    });

    it('should get all products without authentication', async () => {
      const response = await request(app)
        .get('/api/products')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: expect.any(Array),
        pagination: {
          page: 1,
          limit: 20,
          total: 2,
          totalPages: 1
        }
      });

      expect(response.body.data).toHaveLength(2);
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/products?page=1&limit=1')
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.pagination.limit).toBe(1);
    });

    it('should filter by category', async () => {
      const response = await request(app)
        .get('/api/products?category=Phone Cases')
        .expect(200);

      expect(response.body.data).toHaveLength(2);
      expect(response.body.data.every((p: any) => p.category === 'Phone Cases')).toBe(true);
    });

    it('should filter by brand', async () => {
      const response = await request(app)
        .get('/api/products?brand=Apple')
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].brand).toBe('Apple');
    });

    it('should search products', async () => {
      const response = await request(app)
        .get('/api/products?search=iPhone')
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].name).toContain('iPhone');
    });
  });

  describe('GET /api/products/categories', () => {
    beforeEach(async () => {
      await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(sampleProductData);
    });

    it('should get product categories', async () => {
      const response = await request(app)
        .get('/api/products/categories')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: expect.any(Array)
      });

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].category).toBe('Phone Cases');
    });
  });

  describe('GET /api/products/brands', () => {
    beforeEach(async () => {
      await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(sampleProductData);
    });

    it('should get product brands', async () => {
      const response = await request(app)
        .get('/api/products/brands')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: ['Apple']
      });
    });
  });

  describe('GET /api/products/low-stock', () => {
    beforeEach(async () => {
      await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          ...sampleProductData,
          sku: 'LOW-STOCK-001',
          inventory: {
            quantity: 5,
            reserved: 0,
            lowStockThreshold: 10,
            trackInventory: true
          }
        });
    });

    it('should allow admin to get low stock products', async () => {
      const response = await request(app)
        .get('/api/products/low-stock')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: expect.any(Array)
      });

      expect(response.body.data).toHaveLength(1);
    });

    it('should allow employee to get low stock products', async () => {
      const response = await request(app)
        .get('/api/products/low-stock')
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(200);

      expect(response.body.data).toHaveLength(1);
    });

    it('should deny customer access to low stock products', async () => {
      const response = await request(app)
        .get('/api/products/low-stock')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(403);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS'
        }
      });
    });
  });

  describe('GET /api/products/:id', () => {
    let productId: string;

    beforeEach(async () => {
      const createResponse = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(sampleProductData);

      productId = createResponse.body.data._id;
    });

    it('should get product by ID without authentication', async () => {
      const response = await request(app)
        .get(`/api/products/${productId}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          _id: productId,
          name: sampleProductData.name,
          sku: sampleProductData.sku
        }
      });
    });

    it('should return 404 for non-existent product', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      
      const response = await request(app)
        .get(`/api/products/${fakeId}`)
        .expect(404);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'PRODUCT_NOT_FOUND'
        }
      });
    });
  });

  describe('POST /api/products', () => {
    it('should allow admin to create product', async () => {
      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(sampleProductData)
        .expect(201);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          name: sampleProductData.name,
          sku: sampleProductData.sku,
          pricing: sampleProductData.pricing
        }
      });
    });

    it('should allow employee to create product', async () => {
      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send(sampleProductData)
        .expect(201);

      expect(response.body.success).toBe(true);
    });

    it('should deny customer from creating product', async () => {
      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${customerToken}`)
        .send(sampleProductData)
        .expect(403);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS'
        }
      });
    });

    it('should return validation error for invalid data', async () => {
      const invalidData = { ...sampleProductData };
      delete (invalidData as any).name;

      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'VALIDATION_ERROR'
        }
      });
    });

    it('should return error for duplicate SKU', async () => {
      // Create first product
      await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(sampleProductData);

      // Try to create second product with same SKU
      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(sampleProductData)
        .expect(409);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'DUPLICATE_SKU'
        }
      });
    });
  });

  describe('PUT /api/products/:id', () => {
    let productId: string;

    beforeEach(async () => {
      const createResponse = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(sampleProductData);

      productId = createResponse.body.data._id;
    });

    it('should allow admin to update product', async () => {
      const updates = {
        name: 'Updated iPhone 15 Case',
        pricing: {
          retailPrice: 59.99,
          wholesalePrice: 39.99,
          costPrice: 20.00,
          currency: 'USD'
        }
      };

      const response = await request(app)
        .put(`/api/products/${productId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updates)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          name: updates.name,
          pricing: updates.pricing
        }
      });
    });

    it('should allow employee to update product', async () => {
      const updates = { name: 'Updated by Employee' };

      const response = await request(app)
        .put(`/api/products/${productId}`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .send(updates)
        .expect(200);

      expect(response.body.data.name).toBe(updates.name);
    });

    it('should deny customer from updating product', async () => {
      const response = await request(app)
        .put(`/api/products/${productId}`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ name: 'Unauthorized Update' })
        .expect(403);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS'
        }
      });
    });
  });

  describe('DELETE /api/products/:id', () => {
    let productId: string;

    beforeEach(async () => {
      const createResponse = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(sampleProductData);

      productId = createResponse.body.data._id;
    });

    it('should allow admin to delete product', async () => {
      const response = await request(app)
        .delete(`/api/products/${productId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          message: 'Product deleted successfully'
        }
      });

      // Verify product is soft deleted
      const product = await Product.findById(productId);
      expect(product!.isActive).toBe(false);
    });

    it('should deny employee from deleting product', async () => {
      const response = await request(app)
        .delete(`/api/products/${productId}`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(403);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS'
        }
      });
    });

    it('should deny customer from deleting product', async () => {
      const response = await request(app)
        .delete(`/api/products/${productId}`)
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(403);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS'
        }
      });
    });
  });

  describe('PUT /api/products/:id/inventory', () => {
    let productId: string;

    beforeEach(async () => {
      const createResponse = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(sampleProductData);

      productId = createResponse.body.data._id;
    });

    it('should allow admin to update inventory', async () => {
      const response = await request(app)
        .put(`/api/products/${productId}/inventory`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ quantity: 50, type: 'set' })
        .expect(200);

      expect(response.body.data.inventory.quantity).toBe(50);
    });

    it('should allow employee to update inventory', async () => {
      const response = await request(app)
        .put(`/api/products/${productId}/inventory`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({ quantity: 25, type: 'add' })
        .expect(200);

      expect(response.body.data.inventory.quantity).toBe(125); // 100 + 25
    });

    it('should deny customer from updating inventory', async () => {
      const response = await request(app)
        .put(`/api/products/${productId}/inventory`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ quantity: 50 })
        .expect(403);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS'
        }
      });
    });
  });
});