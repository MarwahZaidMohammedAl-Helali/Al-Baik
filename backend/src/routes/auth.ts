import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { sign, verify } from 'hono/jwt';
import { schema } from '../db';

const authRouter = new Hono();

// Validation schemas
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().optional(),
});

// Hash password (simple implementation - use bcrypt in production)
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// Verify password
async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const hashedInput = await hashPassword(password);
  return hashedInput === hash;
}

// Generate JWT token
async function generateToken(userId: string, role: string, secret: string) {
  const payload = {
    userId,
    role,
    exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 7), // 7 days
  };
  return await sign(payload, secret);
}

// Login
authRouter.post('/login', zValidator('json', loginSchema), async (c) => {
  const { email, password } = c.req.valid('json');
  const db = c.get('db');

  try {
    // Find user
    const user = await db.select()
      .from(schema.users)
      .where(eq(schema.users.email, email))
      .limit(1);

    if (user.length === 0) {
      return c.json({ error: 'Invalid credentials' }, 401);
    }

    const userData = user[0];

    // Verify password
    const isValidPassword = await verifyPassword(password, userData.password);
    if (!isValidPassword) {
      return c.json({ error: 'Invalid credentials' }, 401);
    }

    // Check if user is active
    if (!userData.isActive) {
      return c.json({ error: 'Account is disabled' }, 401);
    }

    // Generate token
    const token = await generateToken(userData.id, userData.role, c.env.JWT_SECRET);

    // Update last login
    await db.update(schema.users)
      .set({ lastLogin: new Date() })
      .where(eq(schema.users.id, userData.id));

    // Return user data (without password)
    const { password: _, ...userWithoutPassword } = userData;

    return c.json({
      user: userWithoutPassword,
      token,
      message: 'Login successful'
    });

  } catch (error) {
    console.error('Login error:', error);
    return c.json({ error: 'Login failed' }, 500);
  }
});

// Register
authRouter.post('/register', zValidator('json', registerSchema), async (c) => {
  const { email, password, firstName, lastName, phone } = c.req.valid('json');
  const db = c.get('db');

  try {
    // Check if user already exists
    const existingUser = await db.select()
      .from(schema.users)
      .where(eq(schema.users.email, email))
      .limit(1);

    if (existingUser.length > 0) {
      return c.json({ error: 'User already exists' }, 400);
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user
    const newUser = await db.insert(schema.users)
      .values({
        email,
        password: hashedPassword,
        firstName,
        lastName,
        phone,
        role: 'customer',
      })
      .returning();

    // Generate token
    const token = await generateToken(newUser[0].id, newUser[0].role, c.env.JWT_SECRET);

    // Return user data (without password)
    const { password: _, ...userWithoutPassword } = newUser[0];

    return c.json({
      user: userWithoutPassword,
      token,
      message: 'Registration successful'
    }, 201);

  } catch (error) {
    console.error('Registration error:', error);
    return c.json({ error: 'Registration failed' }, 500);
  }
});

// Verify token middleware
export async function authMiddleware(c: any, next: any) {
  const authHeader = c.req.header('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'No token provided' }, 401);
  }

  const token = authHeader.substring(7);

  try {
    const payload = await verify(token, c.env.JWT_SECRET);
    c.set('user', payload);
    await next();
  } catch (error) {
    return c.json({ error: 'Invalid token' }, 401);
  }
}

// Get current user
authRouter.get('/me', authMiddleware, async (c) => {
  const user = c.get('user');
  const db = c.get('db');

  try {
    const userData = await db.select()
      .from(schema.users)
      .where(eq(schema.users.id, user.userId))
      .limit(1);

    if (userData.length === 0) {
      return c.json({ error: 'User not found' }, 404);
    }

    const { password: _, ...userWithoutPassword } = userData[0];
    return c.json({ user: userWithoutPassword });

  } catch (error) {
    console.error('Get user error:', error);
    return c.json({ error: 'Failed to get user' }, 500);
  }
});

export { authRouter };