import request from 'supertest';
import { app } from '../server';
import { User } from '../models/User';
import { AuthService } from '../services/authService';

describe('User Routes', () => {
  let adminToken: string;
  let employeeToken: string;
  let customerToken: string;
  let adminUser: any;
  let employeeUser: any;
  let customerUser: any;

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
    adminUser = adminResult.user!;

    const employeeResult = await AuthService.register({
      email: 'employee@example.com',
      password: 'password123',
      firstName: 'Employee',
      lastName: 'User',
      role: 'employee'
    });
    employeeToken = employeeResult.token!;
    employeeUser = employeeResult.user!;

    const customerResult = await AuthService.register({
      email: 'customer@example.com',
      password: 'password123',
      firstName: 'Customer',
      lastName: 'User',
      role: 'customer'
    });
    customerToken = customerResult.token!;
    customerUser = customerResult.user!;
  });

  afterEach(async () => {
    await User.deleteMany({});
  });

  describe('GET /api/users', () => {
    it('should allow admin to get all users', async () => {
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: expect.any(Array),
        pagination: {
          page: 1,
          limit: 10,
          total: 3,
          totalPages: 1
        }
      });

      expect(response.body.data).toHaveLength(3);
    });

    it('should deny employee access to get all users', async () => {
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(403);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'Access denied. Required roles: admin'
        }
      });
    });

    it('should deny customer access to get all users', async () => {
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(403);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'Access denied. Required roles: admin'
        }
      });
    });

    it('should deny access without authentication', async () => {
      const response = await request(app)
        .get('/api/users')
        .expect(401);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'MISSING_TOKEN',
          message: 'Access token is required'
        }
      });
    });

    it('should support pagination and filtering', async () => {
      const response = await request(app)
        .get('/api/users?page=1&limit=2&role=customer')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: expect.any(Array),
        pagination: {
          page: 1,
          limit: 2,
          total: 1,
          totalPages: 1
        }
      });

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].role).toBe('customer');
    });
  });

  describe('GET /api/users/:id', () => {
    it('should allow admin to get any user', async () => {
      const response = await request(app)
        .get(`/api/users/${customerUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          _id: customerUser.id,
          email: 'customer@example.com',
          role: 'customer'
        }
      });
    });

    it('should allow employee to get any user', async () => {
      const response = await request(app)
        .get(`/api/users/${customerUser.id}`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          _id: customerUser.id,
          email: 'customer@example.com',
          role: 'customer'
        }
      });
    });

    it('should allow user to get their own profile', async () => {
      const response = await request(app)
        .get(`/api/users/${customerUser.id}`)
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          _id: customerUser.id,
          email: 'customer@example.com',
          role: 'customer'
        }
      });
    });

    it('should deny customer access to other users', async () => {
      const response = await request(app)
        .get(`/api/users/${adminUser.id}`)
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(403);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'ACCESS_DENIED',
          message: 'You can only access your own profile'
        }
      });
    });
  });

  describe('PUT /api/users/:id', () => {
    it('should allow admin to update any user', async () => {
      const updates = {
        firstName: 'Updated',
        lastName: 'Name',
        role: 'employee'
      };

      const response = await request(app)
        .put(`/api/users/${customerUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updates)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          firstName: 'Updated',
          lastName: 'Name',
          role: 'employee'
        }
      });
    });

    it('should allow employee to update user basic info but not roles', async () => {
      const updates = {
        firstName: 'Updated',
        lastName: 'Name'
      };

      const response = await request(app)
        .put(`/api/users/${customerUser.id}`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .send(updates)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          firstName: 'Updated',
          lastName: 'Name'
        }
      });
    });

    it('should deny employee from changing roles', async () => {
      const updates = {
        role: 'admin'
      };

      const response = await request(app)
        .put(`/api/users/${customerUser.id}`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .send(updates)
        .expect(403);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'Employees cannot modify roles or user status'
        }
      });
    });

    it('should allow user to update their own basic info', async () => {
      const updates = {
        firstName: 'Updated',
        phone: '+1234567890'
      };

      const response = await request(app)
        .put(`/api/users/${customerUser.id}`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send(updates)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          firstName: 'Updated',
          phone: '+1234567890'
        }
      });
    });

    it('should deny user from updating restricted fields', async () => {
      const updates = {
        role: 'admin',
        isActive: false
      };

      const response = await request(app)
        .put(`/api/users/${customerUser.id}`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send(updates)
        .expect(403);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'RESTRICTED_FIELDS',
          message: 'You cannot update these fields: role, isActive'
        }
      });
    });
  });

  describe('DELETE /api/users/:id', () => {
    it('should allow admin to deactivate users', async () => {
      const response = await request(app)
        .delete(`/api/users/${customerUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          message: 'User deactivated successfully'
        }
      });

      // Verify user is deactivated
      const user = await User.findById(customerUser.id);
      expect(user?.isActive).toBe(false);
    });

    it('should deny employee from deactivating users', async () => {
      const response = await request(app)
        .delete(`/api/users/${customerUser.id}`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(403);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'Access denied. Required roles: admin'
        }
      });
    });

    it('should deny customer from deactivating users', async () => {
      const response = await request(app)
        .delete(`/api/users/${adminUser.id}`)
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(403);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'Access denied. Required roles: admin'
        }
      });
    });

    it('should prevent admin from deactivating themselves', async () => {
      const response = await request(app)
        .delete(`/api/users/${adminUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'SELF_DEACTIVATION_DENIED',
          message: 'You cannot deactivate your own account'
        }
      });
    });
  });

  describe('POST /api/users/:id/role', () => {
    it('should allow admin to change user roles', async () => {
      const response = await request(app)
        .post(`/api/users/${customerUser.id}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'employee' })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          message: 'User role changed from customer to employee',
          user: {
            role: 'employee'
          }
        }
      });
    });

    it('should deny employee from changing roles', async () => {
      const response = await request(app)
        .post(`/api/users/${customerUser.id}/role`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({ role: 'admin' })
        .expect(403);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'Access denied. Required roles: admin'
        }
      });
    });

    it('should deny customer from changing roles', async () => {
      const response = await request(app)
        .post(`/api/users/${adminUser.id}/role`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ role: 'customer' })
        .expect(403);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'Access denied. Required roles: admin'
        }
      });
    });
  });
});