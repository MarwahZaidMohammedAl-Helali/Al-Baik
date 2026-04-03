import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { eq, asc } from 'drizzle-orm';
import { schema } from '../db';
import { authMiddleware } from './auth';

const categoriesRouter = new Hono();

// Validation schemas
const createCategorySchema = z.object({
  name: z.string().min(1),
  nameAr: z.string().min(1),
  description: z.string().optional(),
  descriptionAr: z.string().optional(),
  icon: z.string().optional(),
  color: z.string().default('#D32F2F'),
  sortOrder: z.number().int().default(0),
});

const updateCategorySchema = createCategorySchema.partial();

// Get all categories (public)
categoriesRouter.get('/', async (c) => {
  const db = c.get('db');

  try {
    const categories = await db.select()
      .from(schema.categories)
      .where(eq(schema.categories.isActive, true))
      .orderBy(asc(schema.categories.sortOrder), asc(schema.categories.nameAr));

    return c.json({ categories });

  } catch (error) {
    console.error('Get categories error:', error);
    return c.json({ error: 'Failed to get categories' }, 500);
  }
});

// Get single category (public)
categoriesRouter.get('/:id', async (c) => {
  const id = c.req.param('id');
  const db = c.get('db');

  try {
    const category = await db.select()
      .from(schema.categories)
      .where(eq(schema.categories.id, id))
      .limit(1);

    if (category.length === 0) {
      return c.json({ error: 'Category not found' }, 404);
    }

    return c.json({ category: category[0] });

  } catch (error) {
    console.error('Get category error:', error);
    return c.json({ error: 'Failed to get category' }, 500);
  }
});

// Get products by category (public)
categoriesRouter.get('/:id/products', async (c) => {
  const id = c.req.param('id');
  const db = c.get('db');

  try {
    const products = await db.select({
      id: schema.products.id,
      name: schema.products.name,
      nameAr: schema.products.nameAr,
      description: schema.products.description,
      descriptionAr: schema.products.descriptionAr,
      price: schema.products.price,
      currency: schema.products.currency,
      mainImage: schema.products.mainImage,
      images: schema.products.images,
      videoUrl: schema.products.videoUrl,
      inStock: schema.products.inStock,
      rating: schema.products.rating,
      reviewCount: schema.products.reviewCount,
      salesCount: schema.products.salesCount,
    })
    .from(schema.products)
    .where(eq(schema.products.categoryId, id))
    .orderBy(asc(schema.products.nameAr));

    // Parse JSON fields
    const parsedProducts = products.map(product => ({
      ...product,
      images: product.images ? JSON.parse(product.images) : [],
    }));

    return c.json({ products: parsedProducts });

  } catch (error) {
    console.error('Get category products error:', error);
    return c.json({ error: 'Failed to get category products' }, 500);
  }
});

// Create category (admin only)
categoriesRouter.post('/', authMiddleware, zValidator('json', createCategorySchema), async (c) => {
  const user = c.get('user');
  
  if (user.role !== 'admin') {
    return c.json({ error: 'Unauthorized' }, 403);
  }

  const categoryData = c.req.valid('json');
  const db = c.get('db');

  try {
    const newCategory = await db.insert(schema.categories)
      .values(categoryData)
      .returning();

    return c.json({ category: newCategory[0], message: 'Category created successfully' }, 201);

  } catch (error) {
    console.error('Create category error:', error);
    return c.json({ error: 'Failed to create category' }, 500);
  }
});

// Update category (admin only)
categoriesRouter.put('/:id', authMiddleware, zValidator('json', updateCategorySchema), async (c) => {
  const user = c.get('user');
  
  if (user.role !== 'admin') {
    return c.json({ error: 'Unauthorized' }, 403);
  }

  const id = c.req.param('id');
  const categoryData = c.req.valid('json');
  const db = c.get('db');

  try {
    const updatedCategory = await db.update(schema.categories)
      .set({ ...categoryData, updatedAt: new Date() })
      .where(eq(schema.categories.id, id))
      .returning();

    if (updatedCategory.length === 0) {
      return c.json({ error: 'Category not found' }, 404);
    }

    return c.json({ category: updatedCategory[0], message: 'Category updated successfully' });

  } catch (error) {
    console.error('Update category error:', error);
    return c.json({ error: 'Failed to update category' }, 500);
  }
});

// Delete category (admin only)
categoriesRouter.delete('/:id', authMiddleware, async (c) => {
  const user = c.get('user');
  
  if (user.role !== 'admin') {
    return c.json({ error: 'Unauthorized' }, 403);
  }

  const id = c.req.param('id');
  const db = c.get('db');

  try {
    // Check if category has products
    const productsInCategory = await db.select({ count: schema.products.id })
      .from(schema.products)
      .where(eq(schema.products.categoryId, id));

    if (productsInCategory.length > 0) {
      return c.json({ error: 'Cannot delete category with products' }, 400);
    }

    // Soft delete by setting isActive to false
    const deletedCategory = await db.update(schema.categories)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(schema.categories.id, id))
      .returning();

    if (deletedCategory.length === 0) {
      return c.json({ error: 'Category not found' }, 404);
    }

    return c.json({ message: 'Category deleted successfully' });

  } catch (error) {
    console.error('Delete category error:', error);
    return c.json({ error: 'Failed to delete category' }, 500);
  }
});

export { categoriesRouter };