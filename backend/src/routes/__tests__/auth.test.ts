import request from 'supertest';
import express from 'express';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import authRoutes from '../auth';

// Mock external dependencies
jest.mock('@prisma/client');
jest.mock('bcryptjs');
jest.mock('../../utils/jwt');
jest.mock('../../utils/env');
jest.mock('../../services/userService');
jest.mock('../../middleware/auth');

// Setup bcrypt mocks with proper types
const mockBcrypt = {
  hash: jest.fn(),
  compare: jest.fn(),
};

// Import mocked modules
import { JWTUtils } from '../../utils/jwt';
import { env } from '../../utils/env';
import { UserService } from '../../services/userService';

// Type the mocked modules
const mockedJWTUtils = JWTUtils as jest.Mocked<typeof JWTUtils>;
const mockedBcrypt = mockBcrypt;
const mockedPrismaClient = PrismaClient as jest.MockedClass<typeof PrismaClient>;
const mockedUserService = UserService as jest.MockedClass<typeof UserService>;

// Mock bcrypt module to return our mock
(bcrypt as any) = mockBcrypt;

// Create test app
const createTestApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/auth', authRoutes);
  return app;
};

// Factory functions for test data
const getMockUser = (overrides?: any) => ({
  id: 'user-123',
  email: 'test@example.com',
  name: 'Test User',
  subscriptionTier: 'free',
  subscriptionStatus: 'free',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

const getMockAdminUser = (overrides?: any) => ({
  id: 'admin-123',
  email: 'admin@econindicatordaily.com',
  name: 'Admin User',
  subscriptionTier: 'pro',
  subscriptionStatus: 'pro',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

const getMockJWTPayload = (overrides?: any) => ({
  userId: 'user-123',
  email: 'test@example.com',
  role: 'user' as const,
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + 3600,
  ...overrides,
});

const getMockAdminJWTPayload = (overrides?: any) => ({
  userId: 'admin-123',
  email: 'admin@econindicatordaily.com',
  role: 'admin' as const,
  adminLevel: 'super' as const,
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + 3600,
  ...overrides,
});

describe('Auth Routes', () => {
  let app: express.Application;
  let mockUserServiceInstance: jest.Mocked<UserService>;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Setup mock UserService instance
    mockUserServiceInstance = {
      createUser: jest.fn(),
      findOrCreateUser: jest.fn(),
      getUserById: jest.fn(),
      getUserByEmail: jest.fn(),
      updateSubscription: jest.fn(),
      upgradeToPro: jest.fn(),
      downgradeToFree: jest.fn(),
      updateEmailPreferences: jest.fn(),
      canAccessIndicator: jest.fn(),
      getSubscriptionLimits: jest.fn(),
      isSubscriptionActive: jest.fn(),
      getActiveUsers: jest.fn(),
      getSubscriptionStats: jest.fn(),
    } as any;

    // Mock UserService constructor
    mockedUserService.mockImplementation(() => mockUserServiceInstance);

    // Setup environment mocks
    (env as any) = {
      JWT_SECRET: 'test-secret',
      NODE_ENV: 'test',
      ADMIN_EMAILS: ['admin@econindicatordaily.com', 'dev@econindicatordaily.com'],
    };

    // Setup default JWT utils mocks
    mockedJWTUtils.isAdminEmail = jest.fn();
    mockedJWTUtils.getAdminLevel = jest.fn();
    mockedJWTUtils.generateToken = jest.fn();
    mockedJWTUtils.generateAdminToken = jest.fn();
    mockedJWTUtils.generateRefreshToken = jest.fn();
    mockedJWTUtils.verifyToken = jest.fn();

    app = createTestApp();
  });

  describe('POST /auth/admin/login - CRITICAL SECURITY VULNERABILITIES', () => {
    describe('when in development mode', () => {
      beforeEach(() => {
        process.env.NODE_ENV = 'development';
      });

      it('should expose hardcoded admin password in development', async () => {
        // Arrange
        const adminEmail = 'admin@econindicatordaily.com';
        const hardcodedPassword = 'admin123'; // VULNERABILITY: Hardcoded password
        
        mockedJWTUtils.isAdminEmail.mockReturnValue(true);
        mockedJWTUtils.getAdminLevel.mockReturnValue('super');
        mockedJWTUtils.generateAdminToken.mockReturnValue('admin-token');
        mockedJWTUtils.generateRefreshToken.mockReturnValue('refresh-token');
        
        const mockUser = getMockAdminUser({ email: adminEmail });
        mockUserServiceInstance.getUserByEmail.mockResolvedValue(mockUser);

        // Act
        const response = await request(app)
          .post('/auth/admin/login')
          .send({
            email: adminEmail,
            password: hardcodedPassword
          });

        // Assert
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.token).toBe('admin-token');
        expect(response.body.data.user.role).toBe('admin');
      });

      it('should reject non-hardcoded passwords in development', async () => {
        // Arrange
        const adminEmail = 'admin@econindicatordaily.com';
        const wrongPassword = 'strongPassword123!';
        
        mockedJWTUtils.isAdminEmail.mockReturnValue(true);

        // Act
        const response = await request(app)
          .post('/auth/admin/login')
          .send({
            email: adminEmail,
            password: wrongPassword
          });

        // Assert
        expect(response.status).toBe(401);
        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('Invalid credentials');
        expect(response.body.code).toBe('INVALID_CREDENTIALS');
      });

      it('should expose development environment check vulnerability', async () => {
        // Arrange
        const adminEmail = 'admin@econindicatordaily.com';
        
        mockedJWTUtils.isAdminEmail.mockReturnValue(true);

        // Test that the hardcoded password works regardless of actual security
        const testCases = [
          { password: 'admin123', shouldSucceed: true },
          { password: 'wrongpassword', shouldSucceed: false },
          { password: '', shouldSucceed: false },
          { password: null, shouldSucceed: false },
        ];

        for (const testCase of testCases) {
          const response = await request(app)
            .post('/auth/admin/login')
            .send({
              email: adminEmail,
              password: testCase.password
            });

          if (testCase.shouldSucceed) {
            expect(response.status).toBe(200);
          } else {
            expect(response.status).toBe(401);
          }
        }
      });
    });

    describe('when in production mode', () => {
      beforeEach(() => {
        process.env.NODE_ENV = 'production';
      });

      it('should trigger runtime password hashing performance issue', async () => {
        // Arrange
        const adminEmail = 'admin@econindicatordaily.com';
        const password = 'testPassword';
        
        mockedJWTUtils.isAdminEmail.mockReturnValue(true);
        
        // VULNERABILITY: Runtime hashing with high cost
        mockedBcrypt.hash.mockImplementation(async (password, rounds) => {
          // Simulate the performance issue - this would block in real scenario
          expect(rounds).toBe(10); // High cost factor
          return 'hashed-password';
        });
        
        mockedBcrypt.compare.mockResolvedValue(false);

        // Mock the performance timing
        const startTime = Date.now();

        // Act
        const response = await request(app)
          .post('/auth/admin/login')
          .send({
            email: adminEmail,
            password: password
          });

        const endTime = Date.now();

        // Assert
        expect(response.status).toBe(401);
        expect(mockedBcrypt.hash).toHaveBeenCalledWith('secureAdminPassword123!', 10);
        expect(mockedBcrypt.hash).toHaveBeenCalledWith('devPassword123!', 10);
        
        // Verify that hashing is called on EVERY request
        expect(mockedBcrypt.hash).toHaveBeenCalledTimes(2);
      });

      it('should expose hardcoded admin credentials in production code', async () => {
        // Arrange
        const testEmails = [
          'admin@econindicatordaily.com',
          'dev@econindicatordaily.com'
        ];
        
        const expectedPasswords = [
          'secureAdminPassword123!',
          'devPassword123!'
        ];

        for (let i = 0; i < testEmails.length; i++) {
          const email = testEmails[i];
          const expectedPassword = expectedPasswords[i];
          
          mockedJWTUtils.isAdminEmail.mockReturnValue(true);
          
          // VULNERABILITY: Hardcoded passwords in production
          mockedBcrypt.hash.mockImplementation(async (password, rounds) => {
            if (password === expectedPassword) {
              return 'hashed-expected-password';
            }
            return 'other-hash';
          });
          
          mockedBcrypt.compare.mockImplementation(async (password, hash) => {
            return hash === 'hashed-expected-password';
          });

          // Act - Test with correct hardcoded password
          let response = await request(app)
            .post('/auth/admin/login')
            .send({
              email: email,
              password: expectedPassword
            });

          // This would succeed with the hardcoded password if user exists
          if (response.status === 500) {
            // User doesn't exist, but password validation passed
            expect(response.body.code).toBe('USER_CREATION_FAILED');
          }
        }
      });
    });

    describe('admin email validation bypass', () => {
      it('should reject non-admin emails', async () => {
        // Arrange
        const nonAdminEmail = 'user@example.com';
        
        mockedJWTUtils.isAdminEmail.mockReturnValue(false);

        // Act
        const response = await request(app)
          .post('/auth/admin/login')
          .send({
            email: nonAdminEmail,
            password: 'anypassword'
          });

        // Assert
        expect(response.status).toBe(403);
        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('Not authorized for admin access');
        expect(response.body.code).toBe('NOT_ADMIN');
      });

      it('should validate admin email through JWTUtils', async () => {
        // Arrange
        const adminEmail = 'admin@econindicatordaily.com';
        
        mockedJWTUtils.isAdminEmail.mockReturnValue(true);
        
        process.env.NODE_ENV = 'development';

        // Act
        await request(app)
          .post('/auth/admin/login')
          .send({
            email: adminEmail,
            password: 'admin123'
          });

        // Assert
        expect(mockedJWTUtils.isAdminEmail).toHaveBeenCalledWith(adminEmail);
      });
    });

    describe('user creation and token generation flow', () => {
      beforeEach(() => {
        process.env.NODE_ENV = 'development';
      });

      it('should create user if not exists', async () => {
        // Arrange
        const adminEmail = 'admin@econindicatordaily.com';
        const password = 'admin123';
        
        mockedJWTUtils.isAdminEmail.mockReturnValue(true);
        mockedJWTUtils.getAdminLevel.mockReturnValue('super');
        mockedJWTUtils.generateAdminToken.mockReturnValue('admin-token');
        mockedJWTUtils.generateRefreshToken.mockReturnValue('refresh-token');
        
        mockUserServiceInstance.getUserByEmail.mockResolvedValue(null);
        const newUser = getMockAdminUser({ email: adminEmail });
        mockUserServiceInstance.createUser.mockResolvedValue(newUser);

        // Act
        const response = await request(app)
          .post('/auth/admin/login')
          .send({
            email: adminEmail,
            password: password
          });

        // Assert
        expect(response.status).toBe(200);
        expect(mockUserServiceInstance.getUserByEmail).toHaveBeenCalledWith(adminEmail);
        expect(mockUserServiceInstance.createUser).toHaveBeenCalledWith({
          email: adminEmail,
          name: 'admin', // Uses email prefix
        });
      });

      it('should use existing user if found', async () => {
        // Arrange
        const adminEmail = 'admin@econindicatordaily.com';
        const password = 'admin123';
        
        mockedJWTUtils.isAdminEmail.mockReturnValue(true);
        mockedJWTUtils.getAdminLevel.mockReturnValue('super');
        mockedJWTUtils.generateAdminToken.mockReturnValue('admin-token');
        mockedJWTUtils.generateRefreshToken.mockReturnValue('refresh-token');
        
        const existingUser = getMockAdminUser({ email: adminEmail });
        mockUserServiceInstance.getUserByEmail.mockResolvedValue(existingUser);

        // Act
        const response = await request(app)
          .post('/auth/admin/login')
          .send({
            email: adminEmail,
            password: password
          });

        // Assert
        expect(response.status).toBe(200);
        expect(mockUserServiceInstance.getUserByEmail).toHaveBeenCalledWith(adminEmail);
        expect(mockUserServiceInstance.createUser).not.toHaveBeenCalled();
        expect(response.body.data.user.id).toBe(existingUser.id);
      });

      it('should generate admin tokens with correct payload', async () => {
        // Arrange
        const adminEmail = 'admin@econindicatordaily.com';
        const password = 'admin123';
        
        mockedJWTUtils.isAdminEmail.mockReturnValue(true);
        mockedJWTUtils.getAdminLevel.mockReturnValue('super');
        mockedJWTUtils.generateAdminToken.mockReturnValue('admin-token');
        mockedJWTUtils.generateRefreshToken.mockReturnValue('refresh-token');
        
        const user = getMockAdminUser({ email: adminEmail });
        mockUserServiceInstance.getUserByEmail.mockResolvedValue(user);

        // Act
        const response = await request(app)
          .post('/auth/admin/login')
          .send({
            email: adminEmail,
            password: password
          });

        // Assert
        expect(mockedJWTUtils.generateAdminToken).toHaveBeenCalledWith({
          userId: user.id,
          email: user.email,
          role: 'admin',
          adminLevel: 'super'
        });
        
        expect(mockedJWTUtils.generateRefreshToken).toHaveBeenCalledWith({
          userId: user.id,
          email: user.email,
          role: 'admin'
        });
        
        expect(response.body.data.token).toBe('admin-token');
        expect(response.body.data.refreshToken).toBe('refresh-token');
      });
    });

    describe('error handling', () => {
      it('should return 400 for missing credentials', async () => {
        // Test missing email
        let response = await request(app)
          .post('/auth/admin/login')
          .send({ password: 'test' });

        expect(response.status).toBe(400);
        expect(response.body.code).toBe('MISSING_CREDENTIALS');

        // Test missing password
        response = await request(app)
          .post('/auth/admin/login')
          .send({ email: 'test@example.com' });

        expect(response.status).toBe(400);
        expect(response.body.code).toBe('MISSING_CREDENTIALS');
      });

      it('should return 500 when user creation fails', async () => {
        // Arrange
        process.env.NODE_ENV = 'development';
        const adminEmail = 'admin@econindicatordaily.com';
        
        mockedJWTUtils.isAdminEmail.mockReturnValue(true);
        mockUserServiceInstance.getUserByEmail.mockResolvedValue(null);
        mockUserServiceInstance.createUser.mockResolvedValue(null as any);

        // Act
        const response = await request(app)
          .post('/auth/admin/login')
          .send({
            email: adminEmail,
            password: 'admin123'
          });

        // Assert
        expect(response.status).toBe(500);
        expect(response.body.code).toBe('USER_CREATION_FAILED');
      });

      it('should handle service errors gracefully', async () => {
        // Arrange
        process.env.NODE_ENV = 'development';
        const adminEmail = 'admin@econindicatordaily.com';
        
        mockedJWTUtils.isAdminEmail.mockReturnValue(true);
        mockUserServiceInstance.getUserByEmail.mockRejectedValue(new Error('Database error'));

        // Act
        const response = await request(app)
          .post('/auth/admin/login')
          .send({
            email: adminEmail,
            password: 'admin123'
          });

        // Assert
        expect(response.status).toBe(500);
        expect(response.body.code).toBe('LOGIN_ERROR');
      });
    });
  });

  describe('POST /auth/login - Regular User Authentication', () => {
    describe('successful login flow', () => {
      it('should authenticate regular user and generate user token', async () => {
        // Arrange
        const userEmail = 'user@example.com';
        const userData = {
          email: userEmail,
          name: 'Test User',
          image: 'https://example.com/avatar.jpg'
        };
        
        mockedJWTUtils.isAdminEmail.mockReturnValue(false);
        mockedJWTUtils.generateToken.mockReturnValue('user-token');
        mockedJWTUtils.generateRefreshToken.mockReturnValue('refresh-token');
        
        const mockUser = getMockUser({ email: userEmail });
        mockUserServiceInstance.findOrCreateUser.mockResolvedValue(mockUser);

        // Act
        const response = await request(app)
          .post('/auth/login')
          .send(userData);

        // Assert
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.token).toBe('user-token');
        expect(response.body.data.user.role).toBe('user');
        expect(response.body.data.user.subscriptionTier).toBe('free');
      });

      it('should authenticate admin user through regular login', async () => {
        // Arrange
        const adminEmail = 'admin@econindicatordaily.com';
        const userData = {
          email: adminEmail,
          name: 'Admin User'
        };
        
        mockedJWTUtils.isAdminEmail.mockReturnValue(true);
        mockedJWTUtils.getAdminLevel.mockReturnValue('super');
        mockedJWTUtils.generateAdminToken.mockReturnValue('admin-token');
        mockedJWTUtils.generateRefreshToken.mockReturnValue('refresh-token');
        
        const mockUser = getMockAdminUser({ email: adminEmail });
        mockUserServiceInstance.findOrCreateUser.mockResolvedValue(mockUser);

        // Act
        const response = await request(app)
          .post('/auth/login')
          .send(userData);

        // Assert
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.token).toBe('admin-token');
        expect(response.body.data.user.role).toBe('admin');
        expect(mockedJWTUtils.generateAdminToken).toHaveBeenCalledWith({
          userId: mockUser.id,
          email: mockUser.email,
          role: 'admin',
          adminLevel: 'super'
        });
      });

      it('should call findOrCreateUser with correct data', async () => {
        // Arrange
        const userData = {
          email: 'test@example.com',
          name: 'Test User',
          image: 'https://example.com/avatar.jpg'
        };
        
        mockedJWTUtils.isAdminEmail.mockReturnValue(false);
        mockedJWTUtils.generateToken.mockReturnValue('user-token');
        mockedJWTUtils.generateRefreshToken.mockReturnValue('refresh-token');
        
        const mockUser = getMockUser();
        mockUserServiceInstance.findOrCreateUser.mockResolvedValue(mockUser);

        // Act
        await request(app)
          .post('/auth/login')
          .send(userData);

        // Assert
        expect(mockUserServiceInstance.findOrCreateUser).toHaveBeenCalledWith(userData);
      });
    });

    describe('error handling', () => {
      it('should return 400 for missing email', async () => {
        // Act
        const response = await request(app)
          .post('/auth/login')
          .send({ name: 'Test User' });

        // Assert
        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('Email is required');
        expect(response.body.code).toBe('MISSING_EMAIL');
      });

      it('should handle service errors', async () => {
        // Arrange
        const userData = { email: 'test@example.com', name: 'Test User' };
        
        mockedJWTUtils.isAdminEmail.mockReturnValue(false);
        mockUserServiceInstance.findOrCreateUser.mockRejectedValue(new Error('Database error'));

        // Act
        const response = await request(app)
          .post('/auth/login')
          .send(userData);

        // Assert
        expect(response.status).toBe(500);
        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('Login failed');
        expect(response.body.code).toBe('LOGIN_ERROR');
      });
    });
  });

  describe('POST /auth/refresh - Token Refresh', () => {
    describe('successful token refresh', () => {
      it('should refresh user token successfully', async () => {
        // Arrange
        const refreshToken = 'valid-refresh-token';
        const userPayload = getMockJWTPayload();
        const user = getMockUser({ id: userPayload.userId });
        
        mockedJWTUtils.verifyToken.mockReturnValue(userPayload);
        mockedJWTUtils.isAdminEmail.mockReturnValue(false);
        mockedJWTUtils.generateToken.mockReturnValue('new-user-token');
        mockedJWTUtils.generateRefreshToken.mockReturnValue('new-refresh-token');
        
        mockUserServiceInstance.getUserById.mockResolvedValue(user);

        // Act
        const response = await request(app)
          .post('/auth/refresh')
          .send({ refreshToken });

        // Assert
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.token).toBe('new-user-token');
        expect(response.body.data.refreshToken).toBe('new-refresh-token');
        expect(response.body.data.user.role).toBe('user');
        
        expect(mockedJWTUtils.verifyToken).toHaveBeenCalledWith(refreshToken, 'econindicatordaily-refresh');
      });

      it('should refresh admin token successfully', async () => {
        // Arrange
        const refreshToken = 'valid-admin-refresh-token';
        const adminPayload = getMockAdminJWTPayload();
        const admin = getMockAdminUser({ id: adminPayload.userId, email: adminPayload.email });
        
        mockedJWTUtils.verifyToken.mockReturnValue(adminPayload);
        mockedJWTUtils.isAdminEmail.mockReturnValue(true);
        mockedJWTUtils.getAdminLevel.mockReturnValue('super');
        mockedJWTUtils.generateAdminToken.mockReturnValue('new-admin-token');
        mockedJWTUtils.generateRefreshToken.mockReturnValue('new-refresh-token');
        
        mockUserServiceInstance.getUserById.mockResolvedValue(admin);

        // Act
        const response = await request(app)
          .post('/auth/refresh')
          .send({ refreshToken });

        // Assert
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.token).toBe('new-admin-token');
        expect(response.body.data.user.role).toBe('admin');
        
        expect(mockedJWTUtils.generateAdminToken).toHaveBeenCalledWith({
          userId: admin.id,
          email: admin.email,
          role: 'admin',
          adminLevel: 'super'
        });
      });
    });

    describe('error handling', () => {
      it('should return 400 for missing refresh token', async () => {
        // Act
        const response = await request(app)
          .post('/auth/refresh')
          .send({});

        // Assert
        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('Refresh token is required');
        expect(response.body.code).toBe('MISSING_REFRESH_TOKEN');
      });

      it('should return 401 for invalid refresh token', async () => {
        // Arrange
        const invalidToken = 'invalid-refresh-token';
        
        mockedJWTUtils.verifyToken.mockImplementation(() => {
          throw new Error('Invalid token');
        });

        // Act
        const response = await request(app)
          .post('/auth/refresh')
          .send({ refreshToken: invalidToken });

        // Assert
        expect(response.status).toBe(401);
        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('Invalid refresh token');
        expect(response.body.code).toBe('INVALID_REFRESH_TOKEN');
      });

      it('should return 401 when user not found', async () => {
        // Arrange
        const refreshToken = 'valid-refresh-token';
        const userPayload = getMockJWTPayload();
        
        mockedJWTUtils.verifyToken.mockReturnValue(userPayload);
        mockUserServiceInstance.getUserById.mockResolvedValue(null);

        // Act
        const response = await request(app)
          .post('/auth/refresh')
          .send({ refreshToken });

        // Assert
        expect(response.status).toBe(401);
        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('User not found');
        expect(response.body.code).toBe('USER_NOT_FOUND');
      });
    });
  });

  describe('POST /auth/logout - Logout', () => {
    describe('logout functionality', () => {
      it('should logout successfully with valid token', async () => {
        // Note: The actual auth middleware is mocked, but we test the route logic
        
        // Act
        const response = await request(app)
          .post('/auth/logout')
          .set('Authorization', 'Bearer valid-token');

        // Assert
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe('Logged out successfully');
      });

      // Note: In a real implementation, you would test that tokens are blacklisted
      // but this current implementation just returns success
    });
  });

  describe('GET /auth/me - Get Current User', () => {
    describe('successful user info retrieval', () => {
      it('should return user info for authenticated user', async () => {
        // Arrange
        const userPayload = getMockJWTPayload();
        const user = getMockUser({ id: userPayload.userId });
        
        mockedJWTUtils.isAdminEmail.mockReturnValue(false);
        mockUserServiceInstance.getUserById.mockResolvedValue(user);

        // Mock the auth middleware behavior
        const authMiddleware = require('../../middleware/auth').authMiddleware;
        authMiddleware.mockImplementation((req: any, res: any, next: any) => {
          req.user = userPayload;
          next();
        });

        // Act
        const response = await request(app)
          .get('/auth/me')
          .set('Authorization', 'Bearer valid-token');

        // Assert
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.id).toBe(user.id);
        expect(response.body.data.email).toBe(user.email);
        expect(response.body.data.role).toBe('user');
        expect(response.body.data.adminLevel).toBeUndefined();
      });

      it('should return admin info for authenticated admin', async () => {
        // Arrange
        const adminPayload = getMockAdminJWTPayload();
        const admin = getMockAdminUser({ id: adminPayload.userId, email: adminPayload.email });
        
        mockedJWTUtils.isAdminEmail.mockReturnValue(true);
        mockedJWTUtils.getAdminLevel.mockReturnValue('super');
        mockUserServiceInstance.getUserById.mockResolvedValue(admin);

        // Mock the auth middleware behavior
        const authMiddleware = require('../../middleware/auth').authMiddleware;
        authMiddleware.mockImplementation((req: any, res: any, next: any) => {
          req.user = adminPayload;
          next();
        });

        // Act
        const response = await request(app)
          .get('/auth/me')
          .set('Authorization', 'Bearer valid-admin-token');

        // Assert
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.id).toBe(admin.id);
        expect(response.body.data.email).toBe(admin.email);
        expect(response.body.data.role).toBe('admin');
        expect(response.body.data.adminLevel).toBe('super');
      });
    });

    describe('error handling', () => {
      it('should return 401 when user not authenticated', async () => {
        // Mock the auth middleware to not set user
        const authMiddleware = require('../../middleware/auth').authMiddleware;
        authMiddleware.mockImplementation((req: any, res: any, next: any) => {
          req.user = undefined;
          next();
        });

        // Act
        const response = await request(app)
          .get('/auth/me')
          .set('Authorization', 'Bearer invalid-token');

        // Assert
        expect(response.status).toBe(401);
        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('User not authenticated');
        expect(response.body.code).toBe('NOT_AUTHENTICATED');
      });

      it('should return 404 when user not found in database', async () => {
        // Arrange
        const userPayload = getMockJWTPayload();
        
        mockUserServiceInstance.getUserById.mockResolvedValue(null);

        // Mock the auth middleware
        const authMiddleware = require('../../middleware/auth').authMiddleware;
        authMiddleware.mockImplementation((req: any, res: any, next: any) => {
          req.user = userPayload;
          next();
        });

        // Act
        const response = await request(app)
          .get('/auth/me')
          .set('Authorization', 'Bearer valid-token');

        // Assert
        expect(response.status).toBe(404);
        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('User not found');
        expect(response.body.code).toBe('USER_NOT_FOUND');
      });

      it('should handle service errors', async () => {
        // Arrange
        const userPayload = getMockJWTPayload();
        
        mockUserServiceInstance.getUserById.mockRejectedValue(new Error('Database error'));

        // Mock the auth middleware
        const authMiddleware = require('../../middleware/auth').authMiddleware;
        authMiddleware.mockImplementation((req: any, res: any, next: any) => {
          req.user = userPayload;
          next();
        });

        // Act
        const response = await request(app)
          .get('/auth/me')
          .set('Authorization', 'Bearer valid-token');

        // Assert
        expect(response.status).toBe(500);
        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('Failed to get user info');
        expect(response.body.code).toBe('GET_USER_ERROR');
      });
    });
  });

  describe('Security vulnerability tests for validateAdminPassword function', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production';
    });

    it('should expose hardcoded admin passwords through timing attack', async () => {
      // Arrange
      const knownEmails = [
        'admin@econindicatordaily.com',
        'dev@econindicatordaily.com'
      ];
      
      const expectedPasswords = [
        'secureAdminPassword123!',
        'devPassword123!'
      ];

      // VULNERABILITY: The function hashes passwords on every call
      // This creates both a performance issue and exposes the hardcoded passwords
      
      mockedJWTUtils.isAdminEmail.mockReturnValue(true);
      
      let hashCallCount = 0;
      mockedBcrypt.hash.mockImplementation(async (password, rounds) => {
        hashCallCount++;
        return `hashed-${password}`;
      });
      
      mockedBcrypt.compare.mockImplementation(async (inputPassword, hashedPassword) => {
        // Check if the hashed password matches any of the expected ones
        return expectedPasswords.some(expected => hashedPassword === `hashed-${expected}`);
      });

      // Act & Assert
      for (let i = 0; i < knownEmails.length; i++) {
        const email = knownEmails[i];
        const expectedPassword = expectedPasswords[i];
        
        hashCallCount = 0;
        
        const response = await request(app)
          .post('/auth/admin/login')
          .send({
            email: email,
            password: 'wrong-password' // Use wrong password to trigger the validation
          });

        // Verify that bcrypt.hash was called for the hardcoded passwords
        expect(mockedBcrypt.hash).toHaveBeenCalledWith(expectedPassword, 10);
        
        // The function hashes BOTH admin passwords on every request
        expect(hashCallCount).toBeGreaterThanOrEqual(2);
      }
    });

    it('should demonstrate denial of service through repeated hashing', async () => {
      // Arrange
      const adminEmail = 'admin@econindicatordaily.com';
      
      mockedJWTUtils.isAdminEmail.mockReturnValue(true);
      
      let totalHashCalls = 0;
      mockedBcrypt.hash.mockImplementation(async (password, rounds) => {
        totalHashCalls++;
        // Simulate the actual bcrypt time (this would be much slower in reality)
        await new Promise(resolve => setTimeout(resolve, 1));
        return `hashed-${password}`;
      });
      
      mockedBcrypt.compare.mockResolvedValue(false);

      // Act - Simulate multiple concurrent requests
      const promises = [];
      const numberOfRequests = 5;
      
      for (let i = 0; i < numberOfRequests; i++) {
        promises.push(
          request(app)
            .post('/auth/admin/login')
            .send({
              email: adminEmail,
              password: `attack-${i}`
            })
        );
      }

      await Promise.all(promises);

      // Assert - Each request triggers 2 hash operations (for both hardcoded passwords)
      expect(totalHashCalls).toBe(numberOfRequests * 2);
      
      // This demonstrates the DoS vulnerability:
      // Each request causes expensive bcrypt operations to run
      console.log(`Total hash operations for ${numberOfRequests} requests: ${totalHashCalls}`);
    });

    it('should expose password enumeration through different response times', async () => {
      // Arrange
      const adminEmail = 'admin@econindicatordaily.com';
      const unknownEmail = 'unknown@econindicatordaily.com';
      
      let hashCallsForKnownEmail = 0;
      let hashCallsForUnknownEmail = 0;
      
      mockedBcrypt.hash.mockImplementation(async (password, rounds) => {
        await new Promise(resolve => setTimeout(resolve, 1));
        return `hashed-${password}`;
      });
      
      mockedBcrypt.compare.mockResolvedValue(false);

      // Act - Test known admin email
      mockedJWTUtils.isAdminEmail.mockReturnValue(true);
      
      const knownEmailStart = Date.now();
      await request(app)
        .post('/auth/admin/login')
        .send({
          email: adminEmail,
          password: 'test-password'
        });
      const knownEmailTime = Date.now() - knownEmailStart;
      
      // Act - Test unknown email  
      mockedJWTUtils.isAdminEmail.mockReturnValue(false);
      
      const unknownEmailStart = Date.now();
      await request(app)
        .post('/auth/admin/login')
        .send({
          email: unknownEmail,
          password: 'test-password'
        });
      const unknownEmailTime = Date.now() - unknownEmailStart;

      // Assert - Known admin emails take longer due to password hashing
      // This timing difference can be used to enumerate valid admin emails
      expect(knownEmailTime).toBeGreaterThan(unknownEmailTime);
    });
  });

  describe('Integration tests - Full authentication flow', () => {
    it('should complete full admin authentication flow', async () => {
      // Arrange
      process.env.NODE_ENV = 'development';
      const adminEmail = 'admin@econindicatordaily.com';
      const password = 'admin123';
      
      mockedJWTUtils.isAdminEmail.mockReturnValue(true);
      mockedJWTUtils.getAdminLevel.mockReturnValue('super');
      mockedJWTUtils.generateAdminToken.mockReturnValue('admin-token');
      mockedJWTUtils.generateRefreshToken.mockReturnValue('refresh-token');
      mockedJWTUtils.verifyToken.mockReturnValue(getMockAdminJWTPayload());
      
      const admin = getMockAdminUser({ email: adminEmail });
      mockUserServiceInstance.getUserByEmail.mockResolvedValue(admin);
      mockUserServiceInstance.getUserById.mockResolvedValue(admin);

      // Act & Assert - Login
      const loginResponse = await request(app)
        .post('/auth/admin/login')
        .send({ email: adminEmail, password: password });

      expect(loginResponse.status).toBe(200);
      expect(loginResponse.body.data.token).toBe('admin-token');
      
      // Act & Assert - Refresh token
      const refreshResponse = await request(app)
        .post('/auth/refresh')
        .send({ refreshToken: 'refresh-token' });

      expect(refreshResponse.status).toBe(200);
      expect(refreshResponse.body.data.token).toBeDefined();
      
      // Act & Assert - Get user info
      const authMiddleware = require('../../middleware/auth').authMiddleware;
      authMiddleware.mockImplementation((req: any, res: any, next: any) => {
        req.user = getMockAdminJWTPayload();
        next();
      });

      const meResponse = await request(app)
        .get('/auth/me')
        .set('Authorization', 'Bearer admin-token');

      expect(meResponse.status).toBe(200);
      expect(meResponse.body.data.role).toBe('admin');
      
      // Act & Assert - Logout
      const logoutResponse = await request(app)
        .post('/auth/logout')
        .set('Authorization', 'Bearer admin-token');

      expect(logoutResponse.status).toBe(200);
      expect(logoutResponse.body.success).toBe(true);
    });

    it('should complete full user authentication flow', async () => {
      // Arrange
      const userEmail = 'user@example.com';
      const userData = { email: userEmail, name: 'Test User' };
      
      mockedJWTUtils.isAdminEmail.mockReturnValue(false);
      mockedJWTUtils.generateToken.mockReturnValue('user-token');
      mockedJWTUtils.generateRefreshToken.mockReturnValue('refresh-token');
      mockedJWTUtils.verifyToken.mockReturnValue(getMockJWTPayload());
      
      const user = getMockUser({ email: userEmail });
      mockUserServiceInstance.findOrCreateUser.mockResolvedValue(user);
      mockUserServiceInstance.getUserById.mockResolvedValue(user);

      // Act & Assert - Login
      const loginResponse = await request(app)
        .post('/auth/login')
        .send(userData);

      expect(loginResponse.status).toBe(200);
      expect(loginResponse.body.data.token).toBe('user-token');
      expect(loginResponse.body.data.user.role).toBe('user');
      
      // Act & Assert - Token refresh
      const refreshResponse = await request(app)
        .post('/auth/refresh')
        .send({ refreshToken: 'refresh-token' });

      expect(refreshResponse.status).toBe(200);
      
      // Act & Assert - Get user info
      const authMiddleware = require('../../middleware/auth').authMiddleware;
      authMiddleware.mockImplementation((req: any, res: any, next: any) => {
        req.user = getMockJWTPayload();
        next();
      });

      const meResponse = await request(app)
        .get('/auth/me')
        .set('Authorization', 'Bearer user-token');

      expect(meResponse.status).toBe(200);
      expect(meResponse.body.data.role).toBe('user');
    });
  });
});