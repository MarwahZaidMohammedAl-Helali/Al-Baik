import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { eq, like, and, desc, asc } from 'drizzle-orm';
import { schema } from '../db';
import { authMiddleware } from './auth';

const productsRouter = new Hono();

// Validation schemas
const createProductSchema = z.object({
  name: z.string().min(1),
  nameAr: z.string().min(1),
  description: z.string().optional(),
  descriptionAr: z.string().optional(),
  price: z.number().positive(),
  currency: z.string().default('JOD'),
  sku: z.string().optional(),
  categoryId: z.string(),
  mainImage: z.string().optional(),
  images: z.array(z.string()).optional(),
  videoUrl: z.string().optional(),
  specifications: z.record(z.any()).optional(),
  stockQuantity: z.number().int().min(0).default(0),
  weight: z.number().positive().optional(),
  dimensions: z.object({
    length: z.number().positive(),
    width: z.number().positive(),
    height: z.number().positive(),
  }).optional(),
  tags: z.array(z.string()).optional(),
});

const updateProductSchema = createProductSchema.partial();

const querySchema = z.object({
  page: z.string().transform(Number).default('1'),
  limit: z.string().transform(Number).default('20'),
  search: z.string().optional(),
  categoryId: z.string().optional(),
  sortBy: z.enum(['name', 'price', 'createdAt', 'rating', 'salesCount']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  inStock: z.string().transform(val => val === 'true').optional(),
});

// Get all products (public)
productsRouter.get('/', zValidator('query', querySchema), async (c) => {
  const { page, limit, search, categoryId, sortBy, sortOrder, inStock } = c.req.valid('query');
  const db = c.get('db');

  try {
    const offset = (page - 1) * limit;
    
    // Build where conditions
    const conditions = [eq(schema.products.isActive, true)];
    
    if (search) {
      conditions.push(
        like(schema.products.nameAr, `%${search}%`)
      );
    }
    
    if (categoryId) {
      conditions.push(eq(schema.products.categoryId, categoryId));
    }
    
    if (inStock !== undefined) {
      conditions.push(eq(schema.products.inStock, inStock));
    }

    // Build order by
    const orderBy = sortOrder === 'asc' 
      ? asc(schema.products[sortBy as keyof typeof schema.products])
      : desc(schema.products[sortBy as keyof typeof schema.products]);

    // Get products
    const products = await db.select({
      id: schema.products.id,
      name: schema.products.name,
      nameAr: schema.products.nameAr,
      description: schema.products.description,
      descriptionAr: schema.products.descriptionAr,
      price: schema.products.price,
      currency: schema.products.currency,
      sku: schema.products.sku,
      categoryId: schema.products.categoryId,
      mainImage: schema.products.mainImage,
      images: schema.products.images,
      videoUrl: schema.products.videoUrl,
      specifications: schema.products.specifications,
      inStock: schema.products.inStock,
      stockQuantity: schema.products.stockQuantity,
      weight: schema.products.weight,
      dimensions: schema.products.dimensions,
      tags: schema.products.tags,
      rating: schema.products.rating,
      reviewCount: schema.products.reviewCount,
      salesCount: schema.products.salesCount,
      createdAt: schema.products.createdAt,
      updatedAt: schema.products.updatedAt,
    })
    .from(schema.products)
    .where(and(...conditions))
    .orderBy(orderBy)
    .limit(limit)
    .offset(offset);

    // Parse JSON fields
    const parsedProducts = products.map(product => ({
      ...product,
      images: product.images ? JSON.parse(product.images) : [],
      specifications: product.specifications ? JSON.parse(product.specifications) : {},
      dimensions: product.dimensions ? JSON.parse(product.dimensions) : null,
      tags: product.tags ? JSON.parse(product.tags) : [],
    }));

    // Get total count for pagination
    const totalResult = await db.select({ count: schema.products.id })
      .from(schema.products)
      .where(and(...conditions));
    
    const total = totalResult.length;
    const totalPages = Math.ceil(total / limit);

    return c.json({
      products: parsedProducts,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      }
    });

  } catch (error) {
    console.error('Get products error:', error);
    return c.json({ error: 'Failed to get products' }, 500);
  }
});

// Get single product (public)
productsRouter.get('/:id', async (c) => {
  const id = c.req.param('id');
  const db = c.get('db');

  try {
    const product = await db.select()
      .from(schema.products)
      .where(and(
        eq(schema.products.id, id),
        eq(schema.products.isActive, true)
      ))
      .limit(1);

    if (product.length === 0) {
      return c.json({ error: 'Product not found' }, 404);
    }

    // Parse JSON fields
    const parsedProduct = {
      ...product[0],
      images: product[0].images ? JSON.parse(product[0].images) : [],
      specifications: product[0].specifications ? JSON.parse(product[0].specifications) : {},
      dimensions: product[0].dimensions ? JSON.parse(product[0].dimensions) : null,
      tags: product[0].tags ? JSON.parse(product[0].tags) : [],
    };

    return c.json({ product: parsedProduct });

  } catch (error) {
    console.error('Get product error:', error);
    return c.json({ error: 'Failed to get product' }, 500);
  }
});

// Create product (admin only)
productsRouter.post('/', authMiddleware, zValidator('json', createProductSchema), async (c) => {
  const user = c.get('user');
  
  if (user.role !== 'admin') {
    return c.json({ error: 'Unauthorized' }, 403);
  }

  const productData = c.req.valid('json');
  const db = c.get('db');

  try {
    // Convert arrays/objects to JSON strings
    const newProduct = await db.insert(schema.products)
      .values({
        ...productData,
        images: productData.images ? JSON.stringify(productData.images) : null,
        specifications: productData.specifications ? JSON.stringify(productData.specifications) : null,
        dimensions: productData.dimensions ? JSON.stringify(productData.dimensions) : null,
        tags: productData.tags ? JSON.stringify(productData.tags) : null,
      })
      .returning();

    // Parse JSON fields for response
    const parsedProduct = {
      ...newProduct[0],
      images: newProduct[0].images ? JSON.parse(newProduct[0].images) : [],
      specifications: newProduct[0].specifications ? JSON.parse(newProduct[0].specifications) : {},
      dimensions: newProduct[0].dimensions ? JSON.parse(newProduct[0].dimensions) : null,
      tags: newProduct[0].tags ? JSON.parse(newProduct[0].tags) : [],
    };

    return c.json({ product: parsedProduct, message: 'Product created successfully' }, 201);

  } catch (error) {
    console.error('Create product error:', error);
    return c.json({ error: 'Failed to create product' }, 500);
  }
});

// Update product (admin only)
productsRouter.put('/:id', authMiddleware, zValidator('json', updateProductSchema), async (c) => {
  const user = c.get('user');
  
  if (user.role !== 'admin') {
    return c.json({ error: 'Unauthorized' }, 403);
  }

  const id = c.req.param('id');
  const productData = c.req.valid('json');
  const db = c.get('db');

  try {
    // Convert arrays/objects to JSON strings
    const updateData: any = {
      ...productData,
      updatedAt: new Date(),
    };

    if (productData.images) {
      updateData.images = JSON.stringify(productData.images);
    }
    if (productData.specifications) {
      updateData.specifications = JSON.stringify(productData.specifications);
    }
    if (productData.dimensions) {
      updateData.dimensions = JSON.stringify(productData.dimensions);
    }
    if (productData.tags) {
      updateData.tags = JSON.stringify(productData.tags);
    }

    const updatedProduct = await db.update(schema.products)
      .set(updateData)
      .where(eq(schema.products.id, id))
      .returning();

    if (updatedProduct.length === 0) {
      return c.json({ error: 'Product not found' }, 404);
    }

    // Parse JSON fields for response
    const parsedProduct = {
      ...updatedProduct[0],
      images: updatedProduct[0].images ? JSON.parse(updatedProduct[0].images) : [],
      specifications: updatedProduct[0].specifications ? JSON.parse(updatedProduct[0].specifications) : {},
      dimensions: updatedProduct[0].dimensions ? JSON.parse(updatedProduct[0].dimensions) : null,
      tags: updatedProduct[0].tags ? JSON.parse(updatedProduct[0].tags) : [],
    };

    return c.json({ product: parsedProduct, message: 'Product updated successfully' });

  } catch (error) {
    console.error('Update product error:', error);
    return c.json({ error: 'Failed to update product' }, 500);
  }
});

// Delete product (admin only)
productsRouter.delete('/:id', authMiddleware, async (c) => {
  const user = c.get('user');
  
  if (user.role !== 'admin') {
    return c.json({ error: 'Unauthorized' }, 403);
  }

  const id = c.req.param('id');
  const db = c.get('db');

  try {
    // Soft delete by setting isActive to false
    const deletedProduct = await db.update(schema.products)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(schema.products.id, id))
      .returning();

    if (deletedProduct.length === 0) {
      return c.json({ error: 'Product not found' }, 404);
    }

    return c.json({ message: 'Product deleted successfully' });

  } catch (error) {
    console.error('Delete product error:', error);
    return c.json({ error: 'Failed to delete product' }, 500);
  }
});

export { productsRouter };