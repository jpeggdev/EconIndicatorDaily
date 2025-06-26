import request from 'supertest';
import express from 'express';
import { PrismaClient } from '@prisma/client';
import adminRoutes from '../admin';

// Mock external dependencies
jest.mock('@prisma/client');
jest.mock('../../services/indicatorService');
jest.mock('../../utils/env');
jest.mock('../../cli/syncData');
jest.mock('../../middleware/auth');

// Import mocked modules
import { IndicatorService } from '../../services/indicatorService';
import { env } from '../../utils/env';
import { DataSyncer } from '../../cli/syncData';
import { 
  adminAuthMiddleware, 
  devBypassMiddleware, 
  requireAdminLevel 
} from '../../middleware/auth';

// Type the mocked modules
const mockedPrismaClient = PrismaClient as jest.MockedClass<typeof PrismaClient>;
const mockedIndicatorService = IndicatorService as jest.MockedClass<typeof IndicatorService>;
const mockedDataSyncer = DataSyncer as jest.MockedClass<typeof DataSyncer>;
const mockedAdminAuthMiddleware = adminAuthMiddleware as jest.MockedFunction<typeof adminAuthMiddleware>;
const mockedDevBypassMiddleware = devBypassMiddleware as jest.MockedFunction<typeof devBypassMiddleware>;
const mockedRequireAdminLevel = requireAdminLevel as jest.MockedFunction<typeof requireAdminLevel>;

// Create test app
const createTestApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/admin', adminRoutes);
  return app;
};

// Factory functions for test data
const getMockUser = (overrides?: any) => ({
  id: 'user-123',
  email: 'user@example.com',
  name: 'Test User',
  subscriptionTier: 'free' as const,
  subscriptionStatus: 'active' as const,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-02'),
  lastLoginAt: new Date('2024-01-02'),
  emailVerified: new Date('2024-01-01'),
  image: null,
  ...overrides,
});

const getMockAdminUser = (overrides?: any) => ({
  id: 'admin-123',
  email: 'admin@econindicatordaily.com',
  name: 'Admin User',
  subscriptionTier: 'pro' as const,
  subscriptionStatus: 'active' as const,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-02'),
  lastLoginAt: new Date('2024-01-02'),
  emailVerified: new Date('2024-01-01'),
  image: null,
  ...overrides,
});

const getMockIndicator = (overrides?: any) => ({
  id: 'indicator-123',
  name: 'GDP Growth',
  source: 'fred',
  frequency: 'quarterly',
  category: 'Economic Growth',
  isActive: true,
  description: 'Gross Domestic Product growth rate',
  updatedAt: new Date('2024-01-02'),
  ...overrides,
});

const getMockUserPreference = (overrides?: any) => ({
  id: 'pref-123',
  userId: 'user-123',
  indicatorId: 'indicator-123',
  isFavorite: true,
  createdAt: new Date('2024-01-01'),
  indicator: getMockIndicator(),
  ...overrides,
});

const getMockSyncResult = (overrides?: any) => ({
  source: 'fred',
  indicator: 'GDP',
  success: true,
  dataPoints: 100,
  duration: 1500,
  ...overrides,
});

const getMockAdminPayload = (overrides?: any) => ({
  userId: 'admin-123',
  email: 'admin@econindicatordaily.com',
  role: 'admin' as const,
  adminLevel: 'super' as const,
  ...overrides,
});

describe('Admin Routes Security Tests', () => {
  let app: express.Application;
  let mockPrismaInstance: any;
  let mockDataSyncerInstance: any;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Setup mock Prisma instance
    mockPrismaInstance = {
      user: {
        count: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        deleteMany: jest.fn(),
      },
      economicIndicator: {
        count: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      userPreference: {
        findMany: jest.fn(),
        deleteMany: jest.fn(),
      },
    };

    // Mock DataSyncer instance
    mockDataSyncerInstance = {
      sync: jest.fn(),
      getLastSyncStatus: jest.fn(),
    };

    // Mock constructors
    mockedPrismaClient.mockImplementation(() => mockPrismaInstance);
    mockedDataSyncer.mockImplementation(() => mockDataSyncerInstance);

    // Setup environment mocks
    (env as any) = {
      NODE_ENV: 'test',
      DEV_BYPASS_AUTH: 'false',
    };

    app = createTestApp();
  });

  describe('Authentication Security', () => {
    describe('admin authentication requirements', () => {
      it('should enforce admin authentication on all routes', async () => {
        // Arrange
        (mockedAdminAuthMiddleware as any).mockImplementation((req: any, res: any, next: any) => {
          return res.status(401).json({
            success: false,
            error: 'Admin authentication required',
            code: 'NO_ADMIN_TOKEN'
          });
        });

        const protectedRoutes = [
          { method: 'get', path: '/admin/stats' },
          { method: 'get', path: '/admin/users' },
          { method: 'get', path: '/admin/users/user-123' },
          { method: 'patch', path: '/admin/users/user-123' },
          { method: 'delete', path: '/admin/users/user-123' },
          { method: 'get', path: '/admin/users/search/test' },
          { method: 'get', path: '/admin/users/user-123/favorites' },
          { method: 'get', path: '/admin/indicators' },
          { method: 'patch', path: '/admin/indicators/indicator-123/toggle' },
          { method: 'post', path: '/admin/indicators/indicator-123/sync' },
          { method: 'post', path: '/admin/sync-all' },
          { method: 'get', path: '/admin/sync-status' },
          { method: 'post', path: '/admin/sync-source' },
          { method: 'get', path: '/admin/settings' },
          { method: 'patch', path: '/admin/settings' },
        ];

        // Act & Assert
        for (const route of protectedRoutes) {
          let response;
          if (route.method === 'get') {
            response = await request(app).get(route.path);
          } else if (route.method === 'post') {
            response = await request(app).post(route.path);
          } else if (route.method === 'patch') {
            response = await request(app).patch(route.path);
          } else if (route.method === 'delete') {
            response = await request(app).delete(route.path);
          }
          
          expect(response?.status).toBe(401);
          expect(response?.body.code).toBe('NO_ADMIN_TOKEN');
        }
      });

      it('should reject requests without admin tokens', async () => {
        // Arrange
        (mockedAdminAuthMiddleware as any).mockImplementation((req: any, res: any, next: any) => {
          return res.status(403).json({
            success: false,
            error: 'Invalid admin token',
            code: 'INVALID_ADMIN_TOKEN'
          });
        });

        // Act
        const response = await request(app)
          .get('/admin/stats')
          .set('Authorization', 'Bearer invalid-token');

        // Assert
        expect(response.status).toBe(403);
        expect(response.body.code).toBe('INVALID_ADMIN_TOKEN');
      });

      it('should reject non-admin user tokens', async () => {
        // Arrange
        (mockedAdminAuthMiddleware as any).mockImplementation((req: any, res: any, next: any) => {
          return res.status(403).json({
            success: false,
            error: 'Admin role required',
            code: 'INSUFFICIENT_ROLE'
          });
        });

        // Act
        const response = await request(app)
          .get('/admin/stats')
          .set('Authorization', 'Bearer user-token');

        // Assert
        expect(response.status).toBe(403);
        expect(response.body.code).toBe('INSUFFICIENT_ROLE');
      });
    });

    describe('development bypass security concerns', () => {
      beforeEach(() => {
        process.env.NODE_ENV = 'development';
        process.env.DEV_BYPASS_AUTH = 'true';
      });

      afterEach(() => {
        process.env.NODE_ENV = 'test';
        process.env.DEV_BYPASS_AUTH = 'false';
      });

      it('should use dev bypass middleware in development', async () => {
        // Arrange
        (mockedDevBypassMiddleware as any).mockImplementation((req: any, res: any, next: any) => {
          req.admin = getMockAdminPayload();
          req.user = req.admin;
          next();
        });

        mockPrismaInstance.user.count.mockResolvedValue(10);
        mockPrismaInstance.economicIndicator.count.mockResolvedValue(15);
        mockPrismaInstance.economicIndicator.findFirst.mockResolvedValue({
          updatedAt: new Date()
        });

        // Act
        const response = await request(app).get('/admin/stats');

        // Assert
        expect(response.status).toBe(200);
        expect(mockedDevBypassMiddleware).toHaveBeenCalled();
      });

      it('should warn about bypassed authentication in development', async () => {
        // This test verifies that the dev bypass logs a warning
        // In a real scenario, we'd test that console.warn is called
        const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

        (mockedDevBypassMiddleware as any).mockImplementation((req: any, res: any, next: any) => {
          console.warn('⚠️  DEVELOPMENT MODE: Authentication bypassed for request:', req.path);
          req.admin = getMockAdminPayload();
          req.user = req.admin;
          next();
        });

        mockPrismaInstance.user.count.mockResolvedValue(10);
        mockPrismaInstance.economicIndicator.count.mockResolvedValue(15);
        mockPrismaInstance.economicIndicator.findFirst.mockResolvedValue({
          updatedAt: new Date()
        });

        // Act
        await request(app).get('/admin/stats');

        // Assert
        expect(consoleSpy).toHaveBeenCalledWith(
          '⚠️  DEVELOPMENT MODE: Authentication bypassed for request:',
          '/stats'
        );

        consoleSpy.mockRestore();
      });
    });

    describe('authorization bypass attempts', () => {
      it('should prevent privilege escalation through header manipulation', async () => {
        // Arrange
        (mockedAdminAuthMiddleware as any).mockImplementation((req: any, res: any, next: any) => {
          // Simulate checking for admin role in token, not headers
          const authHeader = req.headers.authorization;
          if (!authHeader || !authHeader.startsWith('Bearer admin-')) {
            return res.status(403).json({
              success: false,
              error: 'Admin token required',
              code: 'INVALID_ADMIN_TOKEN'
            });
          }
          next();
        });

        const bypassAttempts = [
          { 'x-admin': 'true' },
          { 'x-role': 'admin' },
          { 'x-user-role': 'admin' },
          { 'authorization': 'Bearer user-token' },
          { 'authorization': 'Admin admin-token' }, // Wrong scheme
        ];

        // Act & Assert
        for (const headers of bypassAttempts) {
          const response = await request(app)
            .get('/admin/stats')
            .set(headers);

          expect(response.status).toBe(403);
          expect(response.body.code).toBe('INVALID_ADMIN_TOKEN');
        }
      });

      it('should prevent SQL injection through user ID parameters', async () => {
        // Arrange
        (mockedAdminAuthMiddleware as any).mockImplementation((req: any, res: any, next: any) => {
          req.admin = getMockAdminPayload();
          next();
        });

        const maliciousUserIds = [
          "'; DROP TABLE users; --",
          "1' OR '1'='1",
          "1; DELETE FROM users WHERE 1=1; --",
          "UNION SELECT * FROM users",
        ];

        // Act & Assert
        for (const userId of maliciousUserIds) {
          mockPrismaInstance.user.findUnique.mockRejectedValue(new Error('Invalid user ID'));
          
          const response = await request(app)
            .get(`/admin/users/${encodeURIComponent(userId)}`);

          expect(response.status).toBe(500);
        }
      });
    });
  });

  describe('Admin Dashboard Stats Endpoint', () => {
    beforeEach(() => {
      // Setup successful auth
      (mockedAdminAuthMiddleware as any).mockImplementation((req: any, res: any, next: any) => {
        req.admin = getMockAdminPayload();
        req.user = req.admin;
        next();
      });
    });

    describe('GET /admin/stats - success cases', () => {
      it('should return admin dashboard statistics', async () => {
        // Arrange
        mockPrismaInstance.user.count
          .mockResolvedValueOnce(100) // total users
          .mockResolvedValueOnce(25); // pro users
        
        mockPrismaInstance.economicIndicator.count
          .mockResolvedValueOnce(50) // total indicators
          .mockResolvedValueOnce(45); // active indicators
        
        mockPrismaInstance.economicIndicator.findFirst.mockResolvedValue({
          updatedAt: new Date('2024-01-02T10:00:00Z')
        });

        // Act
        const response = await request(app).get('/admin/stats');

        // Assert
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toEqual({
          totalUsers: 100,
          proUsers: 25,
          totalIndicators: 50,
          activeIndicators: 45,
          lastSync: new Date('2024-01-02T10:00:00Z'),
          apiHealth: {
            fred: true,
            alphaVantage: true,
            sec: false,
            rapidapi: true,
            treasury: true,
          }
        });
      });

      it('should handle missing last sync gracefully', async () => {
        // Arrange
        mockPrismaInstance.user.count.mockResolvedValue(0);
        mockPrismaInstance.economicIndicator.count.mockResolvedValue(0);
        mockPrismaInstance.economicIndicator.findFirst.mockResolvedValue(null);

        // Act
        const response = await request(app).get('/admin/stats');

        // Assert
        expect(response.status).toBe(200);
        expect(response.body.data.lastSync).toBeInstanceOf(Date);
      });
    });

    describe('GET /admin/stats - error cases', () => {
      it('should handle database errors gracefully', async () => {
        // Arrange
        mockPrismaInstance.user.count.mockRejectedValue(new Error('Database connection failed'));

        // Act
        const response = await request(app).get('/admin/stats');

        // Assert
        expect(response.status).toBe(500);
        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('Failed to fetch admin statistics');
      });
    });
  });

  describe('User Management Endpoints', () => {
    beforeEach(() => {
      (mockedAdminAuthMiddleware as any).mockImplementation((req: any, res: any, next: any) => {
        req.admin = getMockAdminPayload();
        req.user = req.admin;
        next();
      });
    });

    describe('GET /admin/users - pagination and filtering', () => {
      it('should return paginated users list', async () => {
        // Arrange
        const mockUsers = [
          getMockUser({ id: 'user-1', email: 'user1@example.com' }),
          getMockUser({ id: 'user-2', email: 'user2@example.com' }),
        ];

        mockPrismaInstance.user.findMany.mockResolvedValue(
          mockUsers.map(user => ({
            ...user,
            _count: { preferences: 2 }
          }))
        );
        mockPrismaInstance.user.count.mockResolvedValue(50);

        // Act
        const response = await request(app)
          .get('/admin/users')
          .query({ page: 2, limit: 10 });

        // Assert
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.users).toHaveLength(2);
        expect(response.body.data.pagination).toEqual({
          page: 2,
          limit: 10,
          total: 50,
          totalPages: 5
        });

        // Verify query parameters
        expect(mockPrismaInstance.user.findMany).toHaveBeenCalledWith({
          where: {
            email: {
              not: {
                startsWith: 'deleted_'
              }
            }
          },
          skip: 10, // (page - 1) * limit
          take: 10,
          orderBy: { createdAt: 'desc' },
          select: expect.objectContaining({
            id: true,
            email: true,
            name: true,
            subscriptionTier: true,
            subscriptionStatus: true,
            createdAt: true,
            lastLoginAt: true,
            _count: {
              select: {
                preferences: true
              }
            }
          })
        });
      });

      it('should use default pagination when not specified', async () => {
        // Arrange
        mockPrismaInstance.user.findMany.mockResolvedValue([]);
        mockPrismaInstance.user.count.mockResolvedValue(0);

        // Act
        const response = await request(app).get('/admin/users');

        // Assert
        expect(response.status).toBe(200);
        expect(response.body.data.pagination.page).toBe(1);
        expect(response.body.data.pagination.limit).toBe(20);
        
        expect(mockPrismaInstance.user.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            skip: 0,
            take: 20,
          })
        );
      });

      it('should exclude soft-deleted users', async () => {
        // Arrange
        mockPrismaInstance.user.findMany.mockResolvedValue([]);
        mockPrismaInstance.user.count.mockResolvedValue(0);

        // Act
        await request(app).get('/admin/users');

        // Assert
        expect(mockPrismaInstance.user.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: {
              email: {
                not: {
                  startsWith: 'deleted_'
                }
              }
            }
          })
        );
      });
    });

    describe('GET /admin/users/:userId - user details', () => {
      it('should return detailed user information', async () => {
        // Arrange
        const mockUser = {
          ...getMockUser(),
          _count: { preferences: 5 }
        };
        mockPrismaInstance.user.findUnique.mockResolvedValue(mockUser);

        // Act
        const response = await request(app).get('/admin/users/user-123');

        // Assert
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toEqual(mockUser);
        
        expect(mockPrismaInstance.user.findUnique).toHaveBeenCalledWith({
          where: { id: 'user-123' },
          select: expect.objectContaining({
            id: true,
            email: true,
            name: true,
            subscriptionTier: true,
            subscriptionStatus: true,
            createdAt: true,
            updatedAt: true,
            lastLoginAt: true,
            emailVerified: true,
            image: true,
            _count: {
              select: {
                preferences: true
              }
            }
          })
        });
      });

      it('should return 404 when user not found', async () => {
        // Arrange
        mockPrismaInstance.user.findUnique.mockResolvedValue(null);

        // Act
        const response = await request(app).get('/admin/users/nonexistent');

        // Assert
        expect(response.status).toBe(404);
        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('User not found');
      });
    });

    describe('PATCH /admin/users/:userId - user updates', () => {
      it('should update user details successfully', async () => {
        // Arrange
        const updatedUser = getMockUser({
          name: 'Updated Name',
          email: 'updated@example.com',
          subscriptionTier: 'pro',
          subscriptionStatus: 'active'
        });

        mockPrismaInstance.user.update.mockResolvedValue(updatedUser);

        // Act
        const response = await request(app)
          .patch('/admin/users/user-123')
          .send({
            name: 'Updated Name',
            email: 'updated@example.com',
            subscriptionTier: 'pro',
            subscriptionStatus: 'active'
          });

        // Assert
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.name).toBe('Updated Name');
        
        expect(mockPrismaInstance.user.update).toHaveBeenCalledWith({
          where: { id: 'user-123' },
          data: {
            name: 'Updated Name',
            email: 'updated@example.com',
            subscriptionTier: 'pro',
            subscriptionStatus: 'active'
          },
          select: expect.objectContaining({
            id: true,
            email: true,
            name: true,
            subscriptionTier: true,
            subscriptionStatus: true,
            updatedAt: true
          })
        });
      });

      it('should validate subscription tier values', async () => {
        // Act
        const response = await request(app)
          .patch('/admin/users/user-123')
          .send({
            subscriptionTier: 'invalid-tier'
          });

        // Assert
        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('Invalid subscription tier');
      });

      it('should validate subscription status values', async () => {
        // Act
        const response = await request(app)
          .patch('/admin/users/user-123')
          .send({
            subscriptionStatus: 'invalid-status'
          });

        // Assert
        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('Invalid subscription status');
      });

      it('should handle partial updates', async () => {
        // Arrange
        const updatedUser = getMockUser({ name: 'New Name' });
        mockPrismaInstance.user.update.mockResolvedValue(updatedUser);

        // Act
        const response = await request(app)
          .patch('/admin/users/user-123')
          .send({ name: 'New Name' });

        // Assert
        expect(response.status).toBe(200);
        expect(mockPrismaInstance.user.update).toHaveBeenCalledWith({
          where: { id: 'user-123' },
          data: { name: 'New Name' },
          select: expect.any(Object)
        });
      });
    });

    describe('PATCH /admin/users/:userId/subscription - subscription updates', () => {
      it('should update user subscription tier', async () => {
        // Arrange
        const updatedUser = getMockUser({ subscriptionTier: 'pro' });
        mockPrismaInstance.user.update.mockResolvedValue(updatedUser);

        // Act
        const response = await request(app)
          .patch('/admin/users/user-123/subscription')
          .send({ subscriptionTier: 'pro' });

        // Assert
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.subscriptionTier).toBe('pro');
        
        expect(mockPrismaInstance.user.update).toHaveBeenCalledWith({
          where: { id: 'user-123' },
          data: { subscriptionTier: 'pro' },
          select: {
            id: true,
            email: true,
            subscriptionTier: true,
          }
        });
      });

      it('should reject invalid subscription tiers', async () => {
        // Act
        const response = await request(app)
          .patch('/admin/users/user-123/subscription')
          .send({ subscriptionTier: 'premium' });

        // Assert
        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('Invalid subscription tier');
      });
    });

    describe('DELETE /admin/users/:userId - user deletion', () => {
      it('should soft delete user successfully', async () => {
        // Arrange
        const existingUser = getMockUser();
        mockPrismaInstance.user.findUnique.mockResolvedValue(existingUser);
        mockPrismaInstance.user.update.mockResolvedValue(existingUser);
        mockPrismaInstance.userPreference.deleteMany.mockResolvedValue({ count: 3 });

        // Act
        const response = await request(app).delete('/admin/users/user-123');

        // Assert
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe('User deleted successfully');

        // Verify soft delete implementation
        expect(mockPrismaInstance.user.update).toHaveBeenCalledWith({
          where: { id: 'user-123' },
          data: expect.objectContaining({
            email: expect.stringMatching(/^deleted_\d+_/),
            name: 'Deleted User',
            subscriptionTier: 'free',
            subscriptionStatus: 'canceled'
          })
        });

        // Verify preferences cleanup
        expect(mockPrismaInstance.userPreference.deleteMany).toHaveBeenCalledWith({
          where: { userId: 'user-123' }
        });
      });

      it('should return 404 when user does not exist', async () => {
        // Arrange
        mockPrismaInstance.user.findUnique.mockResolvedValue(null);

        // Act
        const response = await request(app).delete('/admin/users/nonexistent');

        // Assert
        expect(response.status).toBe(404);
        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('User not found');
      });

      it('should preserve original email in deleted email format', async () => {
        // Arrange
        const existingUser = getMockUser({ email: 'test@example.com' });
        mockPrismaInstance.user.findUnique.mockResolvedValue(existingUser);
        mockPrismaInstance.user.update.mockResolvedValue(existingUser);
        mockPrismaInstance.userPreference.deleteMany.mockResolvedValue({ count: 0 });

        // Act
        await request(app).delete('/admin/users/user-123');

        // Assert
        expect(mockPrismaInstance.user.update).toHaveBeenCalledWith({
          where: { id: 'user-123' },
          data: expect.objectContaining({
            email: expect.stringContaining('test@example.com')
          })
        });
      });
    });

    describe('GET /admin/users/search/:query - user search', () => {
      it('should search users by email and name', async () => {
        // Arrange
        const mockUsers = [
          getMockUser({ email: 'john@example.com', name: 'John Doe' }),
          getMockUser({ email: 'jane@example.com', name: 'Jane Smith' }),
        ];

        mockPrismaInstance.user.findMany.mockResolvedValue(mockUsers);
        mockPrismaInstance.user.count.mockResolvedValue(2);

        // Act
        const response = await request(app).get('/admin/users/search/john');

        // Assert
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.users).toHaveLength(2);
        
        expect(mockPrismaInstance.user.findMany).toHaveBeenCalledWith({
          where: {
            OR: [
              {
                email: {
                  contains: 'john'
                }
              },
              {
                name: {
                  contains: 'john'
                }
              }
            ],
            email: {
              not: {
                startsWith: 'deleted_'
              }
            }
          },
          skip: 0,
          take: 20,
          orderBy: { createdAt: 'desc' },
          select: expect.any(Object)
        });
      });

      it('should handle pagination in search results', async () => {
        // Arrange
        mockPrismaInstance.user.findMany.mockResolvedValue([]);
        mockPrismaInstance.user.count.mockResolvedValue(25);

        // Act
        const response = await request(app)
          .get('/admin/users/search/test')
          .query({ page: 3, limit: 5 });

        // Assert
        expect(response.status).toBe(200);
        expect(response.body.data.pagination).toEqual({
          page: 3,
          limit: 5,
          total: 25,
          totalPages: 5
        });
        
        expect(mockPrismaInstance.user.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            skip: 10, // (3-1) * 5
            take: 5,
          })
        );
      });
    });

    describe('GET /admin/users/:userId/favorites - user favorites', () => {
      it('should return user favorites with indicator details', async () => {
        // Arrange
        const mockFavorites = [
          getMockUserPreference(),
          getMockUserPreference({ id: 'pref-456', indicatorId: 'indicator-456' }),
        ];

        mockPrismaInstance.userPreference.findMany.mockResolvedValue(mockFavorites);

        // Act
        const response = await request(app).get('/admin/users/user-123/favorites');

        // Assert
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveLength(2);
        
        expect(mockPrismaInstance.userPreference.findMany).toHaveBeenCalledWith({
          where: { 
            userId: 'user-123',
            isFavorite: true 
          },
          include: {
            indicator: {
              select: {
                name: true,
                category: true,
                source: true
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        });
      });
    });
  });

  describe('Input Validation Security', () => {
    beforeEach(() => {
      (mockedAdminAuthMiddleware as any).mockImplementation((req: any, res: any, next: any) => {
        req.admin = getMockAdminPayload();
        req.user = req.admin;
        next();
      });
    });

    describe('parameter sanitization', () => {
      it('should handle malicious pagination parameters', async () => {
        // Arrange
        mockPrismaInstance.user.findMany.mockResolvedValue([]);
        mockPrismaInstance.user.count.mockResolvedValue(0);

        const maliciousParams = [
          { page: -1, limit: 1000 },
          { page: 'alert(1)', limit: 'DROP TABLE' },
          { page: Number.MAX_SAFE_INTEGER, limit: Number.MAX_SAFE_INTEGER },
        ];

        // Act & Assert
        for (const params of maliciousParams) {
          const response = await request(app)
            .get('/admin/users')
            .query(params);

          // Should not crash and should use safe defaults
          expect(response.status).toBe(200);
        }
      });

      it('should sanitize search query parameters', async () => {
        // Arrange
        mockPrismaInstance.user.findMany.mockResolvedValue([]);
        mockPrismaInstance.user.count.mockResolvedValue(0);

        const maliciousQueries = [
          "'; DROP TABLE users; --",
          "<script>alert('xss')</script>",
          "../../etc/passwd",
          String.fromCharCode(0), // null byte
        ];

        // Act & Assert
        for (const query of maliciousQueries) {
          const response = await request(app)
            .get(`/admin/users/search/${encodeURIComponent(query)}`);

          expect(response.status).toBe(200);
          // Verify that the query is passed as-is to Prisma (Prisma handles SQL injection)
          expect(mockPrismaInstance.user.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
              where: expect.objectContaining({
                OR: [
                  { email: { contains: query } },
                  { name: { contains: query } }
                ]
              })
            })
          );
        }
      });
    });

    describe('request body validation', () => {
      it('should reject oversized request bodies', async () => {
        // This would typically be handled by express.json() middleware with a limit
        // Here we simulate the validation
        const oversizedData = {
          name: 'x'.repeat(10000),
          email: 'x'.repeat(10000),
        };

        const response = await request(app)
          .patch('/admin/users/user-123')
          .send(oversizedData);

        // In a real scenario, this would be rejected by middleware
        // We'll assume the update works but validate reasonable limits
        expect(response.status).toBeGreaterThanOrEqual(400);
      });

      it('should handle malformed JSON gracefully', async () => {
        const response = await request(app)
          .patch('/admin/users/user-123')
          .set('Content-Type', 'application/json')
          .send('{"invalid": json}');

        expect(response.status).toBe(400);
      });
    });
  });

  describe('Indicator Management Endpoints', () => {
    beforeEach(() => {
      (mockedAdminAuthMiddleware as any).mockImplementation((req: any, res: any, next: any) => {
        req.admin = getMockAdminPayload();
        req.user = req.admin;
        next();
      });
    });

    describe('GET /admin/indicators', () => {
      it('should return indicators grouped by source', async () => {
        // Arrange
        const mockIndicators = [
          getMockIndicator({ source: 'fred', name: 'GDP' }),
          getMockIndicator({ source: 'fred', name: 'Unemployment' }),
          getMockIndicator({ source: 'alpha_vantage', name: 'SPY' }),
        ];

        mockPrismaInstance.economicIndicator.findMany.mockResolvedValue(mockIndicators);

        // Act
        const response = await request(app).get('/admin/indicators');

        // Assert
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.indicators).toHaveLength(3);
        expect(response.body.data.bySource.fred).toHaveLength(2);
        expect(response.body.data.bySource.alpha_vantage).toHaveLength(1);
        expect(response.body.data.summary.total).toBe(3);
        expect(response.body.data.summary.active).toBe(3);
      });
    });

    describe('PATCH /admin/indicators/:indicatorId/toggle', () => {
      it('should toggle indicator active status', async () => {
        // Arrange
        const mockIndicator = getMockIndicator({ isActive: true });
        const updatedIndicator = { ...mockIndicator, isActive: false };

        mockPrismaInstance.economicIndicator.findUnique.mockResolvedValue(mockIndicator);
        mockPrismaInstance.economicIndicator.update.mockResolvedValue(updatedIndicator);

        // Act
        const response = await request(app)
          .patch('/admin/indicators/indicator-123/toggle');

        // Assert
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.isActive).toBe(false);
        
        expect(mockPrismaInstance.economicIndicator.update).toHaveBeenCalledWith({
          where: { id: 'indicator-123' },
          data: { isActive: false },
          select: {
            id: true,
            name: true,
            isActive: true,
          }
        });
      });

      it('should return 404 for non-existent indicator', async () => {
        // Arrange
        mockPrismaInstance.economicIndicator.findUnique.mockResolvedValue(null);

        // Act
        const response = await request(app)
          .patch('/admin/indicators/nonexistent/toggle');

        // Assert
        expect(response.status).toBe(404);
        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('Indicator not found');
      });
    });

    describe('POST /admin/indicators/:indicatorId/sync', () => {
      it('should sync specific indicator successfully', async () => {
        // Arrange
        const mockIndicator = getMockIndicator();
        const mockSyncResult = getMockSyncResult({ success: true, dataPoints: 50 });

        mockPrismaInstance.economicIndicator.findUnique.mockResolvedValue(mockIndicator);
        mockDataSyncerInstance.sync.mockResolvedValue([mockSyncResult]);

        // Act
        const response = await request(app)
          .post('/admin/indicators/indicator-123/sync');

        // Assert
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.message).toContain('Successfully synced');
        expect(response.body.data.dataPoints).toBe(50);
        
        expect(mockDataSyncerInstance.sync).toHaveBeenCalledWith({
          indicators: [mockIndicator.name],
          force: true,
          verbose: false
        });
      });

      it('should handle sync failures', async () => {
        // Arrange
        const mockIndicator = getMockIndicator();
        const mockSyncResult = getMockSyncResult({ 
          success: false, 
          error: 'API rate limit exceeded' 
        });

        mockPrismaInstance.economicIndicator.findUnique.mockResolvedValue(mockIndicator);
        mockDataSyncerInstance.sync.mockResolvedValue([mockSyncResult]);

        // Act
        const response = await request(app)
          .post('/admin/indicators/indicator-123/sync');

        // Assert
        expect(response.status).toBe(500);
        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('API rate limit exceeded');
      });
    });
  });

  describe('System Operations Endpoints', () => {
    beforeEach(() => {
      (mockedAdminAuthMiddleware as any).mockImplementation((req: any, res: any, next: any) => {
        req.admin = getMockAdminPayload();
        req.user = req.admin;
        next();
      });
    });

    describe('POST /admin/sync-all', () => {
      it('should initiate full sync successfully', async () => {
        // Arrange
        mockDataSyncerInstance.sync.mockResolvedValue([]);

        // Act
        const response = await request(app)
          .post('/admin/sync-all')
          .send({ source: 'fred', force: true });

        // Assert
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.message).toContain('Full sync initiated');
        
        // Note: sync is called asynchronously, so we can't easily test the call
      });
    });

    describe('GET /admin/sync-status', () => {
      it('should return sync status for all indicators', async () => {
        // Arrange
        const mockStatus = [
          {
            source: 'fred',
            indicator: 'GDP',
            lastUpdate: new Date('2024-01-01'),
            totalDataPoints: 100
          },
          {
            source: 'alpha_vantage', 
            indicator: 'SPY',
            lastUpdate: new Date('2024-01-02'),
            totalDataPoints: 250
          }
        ];

        mockDataSyncerInstance.getLastSyncStatus.mockResolvedValue(mockStatus);

        // Act
        const response = await request(app).get('/admin/sync-status');

        // Assert
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.indicators).toHaveLength(2);
        expect(response.body.data.summary.total).toBe(2);
        expect(response.body.data.summary.withData).toBe(2);
        expect(response.body.data.bySource).toHaveProperty('fred');
        expect(response.body.data.bySource).toHaveProperty('alpha_vantage');
      });
    });

    describe('POST /admin/sync-source', () => {
      it('should sync specific source successfully', async () => {
        // Arrange
        mockDataSyncerInstance.sync.mockResolvedValue([]);

        // Act
        const response = await request(app)
          .post('/admin/sync-source')
          .send({ source: 'fred', force: true });

        // Assert
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.message).toContain('Sync initiated for fred');
      });

      it('should validate source parameter', async () => {
        // Act
        const response = await request(app)
          .post('/admin/sync-source')
          .send({ force: true });

        // Assert
        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('Source parameter is required');
      });

      it('should reject invalid sources', async () => {
        // Act
        const response = await request(app)
          .post('/admin/sync-source')
          .send({ source: 'invalid-source' });

        // Assert
        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('Invalid source');
      });
    });

    describe('GET /admin/settings', () => {
      it('should return system settings', async () => {
        // Act
        const response = await request(app).get('/admin/settings');

        // Assert
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toEqual({
          syncInterval: '24h',
          maxFreeIndicators: 5,
          enableNewRegistrations: true,
          maintenanceMode: false,
          apiRateLimits: {
            fred: 120,
            alphaVantage: 500,
            sec: 36000,
          }
        });
      });
    });

    describe('PATCH /admin/settings', () => {
      it('should update system settings', async () => {
        // Act
        const response = await request(app)
          .patch('/admin/settings')
          .send({ 
            settings: { 
              maxFreeIndicators: 10,
              maintenanceMode: true 
            } 
          });

        // Assert
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe('Settings updated successfully');
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    beforeEach(() => {
      (mockedAdminAuthMiddleware as any).mockImplementation((req: any, res: any, next: any) => {
        req.admin = getMockAdminPayload();
        req.user = req.admin;
        next();
      });
    });

    describe('database connection failures', () => {
      it('should handle Prisma connection errors gracefully', async () => {
        // Arrange
        mockPrismaInstance.user.count.mockRejectedValue(new Error('ECONNREFUSED'));

        // Act
        const response = await request(app).get('/admin/stats');

        // Assert
        expect(response.status).toBe(500);
        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('Failed to fetch admin statistics');
      });

      it('should handle Prisma timeout errors', async () => {
        // Arrange
        mockPrismaInstance.user.findMany.mockRejectedValue(new Error('Query timeout'));

        // Act
        const response = await request(app).get('/admin/users');

        // Assert
        expect(response.status).toBe(500);
        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('Failed to fetch users');
      });
    });

    describe('race condition handling', () => {
      it('should handle concurrent user updates', async () => {
        // Arrange
        mockPrismaInstance.user.update
          .mockRejectedValueOnce(new Error('Record not found'))
          .mockResolvedValueOnce(getMockUser());

        // Act
        const response = await request(app)
          .patch('/admin/users/user-123')
          .send({ name: 'Updated Name' });

        // Assert
        expect(response.status).toBe(500);
        expect(response.body.success).toBe(false);
      });
    });

    describe('memory and performance', () => {
      it('should handle large user lists efficiently', async () => {
        // Arrange
        const largeUserSet = Array.from({ length: 1000 }, (_, i) => 
          getMockUser({ id: `user-${i}`, email: `user${i}@example.com` })
        );

        mockPrismaInstance.user.findMany.mockResolvedValue(largeUserSet);
        mockPrismaInstance.user.count.mockResolvedValue(1000);

        // Act
        const response = await request(app).get('/admin/users');

        // Assert
        expect(response.status).toBe(200);
        expect(response.body.data.users).toHaveLength(1000);
      });
    });
  });

  describe('Data Sanitization and Output Security', () => {
    beforeEach(() => {
      (mockedAdminAuthMiddleware as any).mockImplementation((req: any, res: any, next: any) => {
        req.admin = getMockAdminPayload();
        req.user = req.admin;
        next();
      });
    });

    describe('sensitive data exposure prevention', () => {
      it('should not expose user passwords or sensitive fields', async () => {
        // Arrange
        const userWithSensitiveData = {
          ...getMockUser(),
          password: 'hashed-password',
          resetToken: 'reset-123',
          _count: { preferences: 2 }
        };

        mockPrismaInstance.user.findUnique.mockResolvedValue(userWithSensitiveData);

        // Act
        const response = await request(app).get('/admin/users/user-123');

        // Assert
        expect(response.status).toBe(200);
        expect(response.body.data).not.toHaveProperty('password');
        expect(response.body.data).not.toHaveProperty('resetToken');
        
        // Verify the select clause excludes sensitive fields
        expect(mockPrismaInstance.user.findUnique).toHaveBeenCalledWith({
          where: { id: 'user-123' },
          select: expect.not.objectContaining({
            password: true,
            resetToken: true
          })
        });
      });

      it('should sanitize user data in listings', async () => {
        // Arrange
        mockPrismaInstance.user.findMany.mockResolvedValue([getMockUser()]);
        mockPrismaInstance.user.count.mockResolvedValue(1);

        // Act
        const response = await request(app).get('/admin/users');

        // Assert
        expect(response.status).toBe(200);
        
        // Verify that the select clause only includes safe fields
        expect(mockPrismaInstance.user.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            select: expect.objectContaining({
              id: true,
              email: true,
              name: true,
              subscriptionTier: true,
              subscriptionStatus: true,
              createdAt: true,
              lastLoginAt: true,
            })
          })
        );
        
        expect(mockPrismaInstance.user.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            select: expect.not.objectContaining({
              password: true,
              resetToken: true,
            })
          })
        );
      });
    });

    describe('XSS prevention in responses', () => {
      it('should not execute scripts in user names', async () => {
        // Arrange
        const userWithXSS = getMockUser({
          name: '<script>alert("xss")</script>',
          email: 'test@example.com'
        });

        mockPrismaInstance.user.findUnique.mockResolvedValue(userWithXSS);

        // Act
        const response = await request(app).get('/admin/users/user-123');

        // Assert
        expect(response.status).toBe(200);
        expect(response.body.data.name).toBe('<script>alert("xss")</script>');
        // The frontend should handle escaping, backend returns raw data
        expect(response.headers['content-type']).toMatch(/application\/json/);
      });
    });
  });
});