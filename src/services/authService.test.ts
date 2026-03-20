import { AuthService } from './authService';
import { User } from '../models/User';

describe('AuthService', () => {
  afterEach(async () => {
    await User.deleteMany({});
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
        phone: '+1234567890'
      };

      const result = await AuthService.register(userData);

      expect(result.success).toBe(true);
      expect(result.token).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.user).toMatchObject({
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: 'customer',
        isWholesaleCustomer: false
      });

      // Verify user was saved to database
      const savedUser = await User.findOne({ email: 'test@example.com' });
      expect(savedUser).toBeTruthy();
      expect(savedUser?.role).toBe('customer');
    });

    it('should not register user with existing email', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe'
      };

      // Register first user
      await AuthService.register(userData);

      // Try to register second user with same email
      const result = await AuthService.register(userData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('User with this email already exists');
    });

    it('should register user with admin role when specified', async () => {
      const userData = {
        email: 'admin@example.com',
        password: 'password123',
        firstName: 'Admin',
        lastName: 'User',
        role: 'admin' as const
      };

      const result = await AuthService.register(userData);

      expect(result.success).toBe(true);
      expect(result.user?.role).toBe('admin');
    });
  });

  describe('login', () => {
    beforeEach(async () => {
      // Create a test user
      await AuthService.register({
        email: 'test@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe'
      });
    });

    it('should login user with correct credentials', async () => {
      const credentials = {
        email: 'test@example.com',
        password: 'password123'
      };

      const result = await AuthService.login(credentials);

      expect(result.success).toBe(true);
      expect(result.token).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.user).toMatchObject({
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe'
      });
    });

    it('should not login user with incorrect password', async () => {
      const credentials = {
        email: 'test@example.com',
        password: 'wrongpassword'
      };

      const result = await AuthService.login(credentials);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid email or password');
    });

    it('should not login user with non-existent email', async () => {
      const credentials = {
        email: 'nonexistent@example.com',
        password: 'password123'
      };

      const result = await AuthService.login(credentials);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid email or password');
    });

    it('should not login inactive user', async () => {
      // Deactivate the user
      await User.findOneAndUpdate(
        { email: 'test@example.com' },
        { isActive: false }
      );

      const credentials = {
        email: 'test@example.com',
        password: 'password123'
      };

      const result = await AuthService.login(credentials);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid email or password');
    });
  });

  describe('validateToken', () => {
    let validToken: string;

    beforeEach(async () => {
      const result = await AuthService.register({
        email: 'test@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe'
      });
      validToken = result.token!;
    });

    it('should validate valid token', async () => {
      const payload = await AuthService.validateToken(validToken);

      expect(payload).toBeTruthy();
      expect(payload?.email).toBe('test@example.com');
      expect(payload?.role).toBe('customer');
    });

    it('should not validate invalid token', async () => {
      const payload = await AuthService.validateToken('invalid-token');

      expect(payload).toBeNull();
    });

    it('should not validate token for inactive user', async () => {
      // Deactivate the user
      await User.findOneAndUpdate(
        { email: 'test@example.com' },
        { isActive: false }
      );

      const payload = await AuthService.validateToken(validToken);

      expect(payload).toBeNull();
    });
  });

  describe('refreshToken', () => {
    let validRefreshToken: string;

    beforeEach(async () => {
      const result = await AuthService.register({
        email: 'test@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe'
      });
      validRefreshToken = result.refreshToken!;
    });

    it('should refresh token with valid refresh token', async () => {
      const result = await AuthService.refreshToken(validRefreshToken);

      expect(result.success).toBe(true);
      expect(result.token).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.user?.email).toBe('test@example.com');
    });

    it('should not refresh token with invalid refresh token', async () => {
      const result = await AuthService.refreshToken('invalid-refresh-token');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid refresh token');
    });
  });

  describe('createAdminUser', () => {
    it('should create admin user when no admin exists', async () => {
      const adminData = {
        email: 'admin@example.com',
        password: 'adminpassword',
        firstName: 'Admin',
        lastName: 'User'
      };

      const result = await AuthService.createAdminUser(adminData);

      expect(result.success).toBe(true);
      expect(result.user?.role).toBe('admin');
    });

    it('should not create admin user when admin already exists', async () => {
      // Create first admin
      await AuthService.register({
        email: 'admin1@example.com',
        password: 'password123',
        firstName: 'Admin',
        lastName: 'One',
        role: 'admin'
      });

      // Try to create second admin
      const adminData = {
        email: 'admin2@example.com',
        password: 'adminpassword',
        firstName: 'Admin',
        lastName: 'Two'
      };

      const result = await AuthService.createAdminUser(adminData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Admin user already exists');
    });
  });
});