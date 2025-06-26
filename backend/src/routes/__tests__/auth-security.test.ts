import request from 'supertest';
import express from 'express';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import authRoutes from '../auth';

// Mock all external dependencies
jest.mock('@prisma/client');
jest.mock('bcryptjs');
jest.mock('../../utils/jwt');
jest.mock('../../utils/env');
jest.mock('../../services/userService');
jest.mock('../../middleware/auth');

// Setup mocked bcrypt functions with proper types
const mockBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

// Import and mock JWTUtils
import { JWTUtils } from '../../utils/jwt';
const mockJWTUtils = JWTUtils as jest.Mocked<typeof JWTUtils>;

// Import and mock UserService
import { UserService } from '../../services/userService';
const mockUserService = UserService as jest.MockedClass<typeof UserService>;

// Mock environment
import { env } from '../../utils/env';
(env as any) = {
  JWT_SECRET: 'test-secret',
  NODE_ENV: 'test',
  ADMIN_EMAILS: ['admin@econindicatordaily.com', 'dev@econindicatordaily.com'],
};

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

describe('Auth Routes - CRITICAL SECURITY VULNERABILITIES', () => {
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
    mockUserService.mockImplementation(() => mockUserServiceInstance);

    // Setup JWTUtils mocks
    mockJWTUtils.isAdminEmail = jest.fn();
    mockJWTUtils.getAdminLevel = jest.fn();
    mockJWTUtils.generateToken = jest.fn();
    mockJWTUtils.generateAdminToken = jest.fn();
    mockJWTUtils.generateRefreshToken = jest.fn();
    mockJWTUtils.verifyToken = jest.fn();

    // Setup bcrypt mocks
    (mockBcrypt.hash as jest.Mock) = jest.fn();
    (mockBcrypt.compare as jest.Mock) = jest.fn();

    app = createTestApp();
  });

  describe('VULNERABILITY 1: Hardcoded Admin Credentials (CRITICAL)', () => {
    describe('Development Mode Hardcoded Password', () => {
      beforeEach(() => {
        process.env.NODE_ENV = 'development';
      });

      it('should expose hardcoded development password "admin123"', async () => {
        // Arrange
        const adminEmail = 'admin@econindicatordaily.com';
        const hardcodedPassword = 'admin123'; // VULNERABILITY: Hardcoded password in source code
        
        mockJWTUtils.isAdminEmail.mockReturnValue(true);
        mockJWTUtils.getAdminLevel.mockReturnValue('super');
        mockJWTUtils.generateAdminToken.mockReturnValue('admin-token');
        mockJWTUtils.generateRefreshToken.mockReturnValue('refresh-token');
        
        const mockUser = getMockAdminUser({ email: adminEmail });
        mockUserServiceInstance.getUserByEmail.mockResolvedValue(mockUser);

        // Act
        const response = await request(app)
          .post('/auth/admin/login')
          .send({
            email: adminEmail,
            password: hardcodedPassword
          });

        // Assert - This vulnerability allows anyone with code access to login as admin
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.token).toBe('admin-token');
        expect(response.body.data.user.role).toBe('admin');
        
        // Verify this was accepted without any secure authentication
        expect(mockBcrypt.compare).not.toHaveBeenCalled();
      });

      it('should reject any password other than hardcoded "admin123"', async () => {
        // Arrange
        const adminEmail = 'admin@econindicatordaily.com';
        const securePassword = 'SecurePassword123!@#';
        
        mockJWTUtils.isAdminEmail.mockReturnValue(true);

        // Act
        const response = await request(app)
          .post('/auth/admin/login')
          .send({
            email: adminEmail,
            password: securePassword
          });

        // Assert
        expect(response.status).toBe(401);
        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('Invalid credentials');
        expect(response.body.code).toBe('INVALID_CREDENTIALS');
      });

      it('should demonstrate password enumeration through environment check', async () => {
        // This test shows that an attacker can determine if they're in development mode
        // by testing the hardcoded password against different environments
        
        const adminEmail = 'admin@econindicatordaily.com';
        mockJWTUtils.isAdminEmail.mockReturnValue(true);
        
        // Test passwords that should only work in development
        const testCases = [
          { password: 'admin123', shouldWork: true, description: 'hardcoded development password' },
          { password: 'Admin123', shouldWork: false, description: 'case-sensitive variation' },
          { password: 'admin1234', shouldWork: false, description: 'similar but wrong password' },
          { password: '', shouldWork: false, description: 'empty password' },
        ];

        for (const testCase of testCases) {
          const response = await request(app)
            .post('/auth/admin/login')
            .send({
              email: adminEmail,
              password: testCase.password
            });

          if (testCase.shouldWork) {
            expect(response.status).toBe(200);
            console.log(`🚨 VULNERABILITY: ${testCase.description} works in development mode`);
          } else {
            expect(response.status).toBe(401);
          }
        }
      });
    });

    describe('Production Mode Hardcoded Passwords', () => {
      beforeEach(() => {
        process.env.NODE_ENV = 'production';
      });

      it('should expose hardcoded production passwords in source code', async () => {
        // Arrange
        const testCases = [
          {
            email: 'admin@econindicatordaily.com',
            expectedPassword: 'secureAdminPassword123!', // VULNERABILITY: In source code
          },
          {
            email: 'dev@econindicatordaily.com',
            expectedPassword: 'devPassword123!', // VULNERABILITY: In source code
          },
        ];
        
        mockJWTUtils.isAdminEmail.mockReturnValue(true);

        for (const testCase of testCases) {
          // VULNERABILITY: The validateAdminPassword function has these passwords hardcoded
          mockBcrypt.hash.mockImplementation(async (password: string, saltOrRounds: string | number) => {
            if (password === testCase.expectedPassword) {
              return 'hashed-expected-password';
            }
            return 'other-hash';
          });
          
          mockBcrypt.compare.mockImplementation(async (password: string, hash: string) => {
            return hash === 'hashed-expected-password';
          });

          // Act
          const response = await request(app)
            .post('/auth/admin/login')
            .send({
              email: testCase.email,
              password: testCase.expectedPassword
            });

          // Assert - The hardcoded password is exposed in the source code
          expect(mockBcrypt.hash).toHaveBeenCalledWith(testCase.expectedPassword, 10);
          console.log(`🚨 VULNERABILITY: Password "${testCase.expectedPassword}" hardcoded for ${testCase.email}`);
        }
      });
    });
  });

  describe('VULNERABILITY 2: Runtime Password Hashing DoS Attack (CRITICAL)', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production';
    });

    it('should demonstrate denial of service through expensive bcrypt operations', async () => {
      // Arrange
      const adminEmail = 'admin@econindicatordaily.com';
      
      mockJWTUtils.isAdminEmail.mockReturnValue(true);
      
      let totalHashOperations = 0;
      let totalHashTime = 0;
      
      // VULNERABILITY: bcrypt.hash is called with cost factor 10 on EVERY request
      mockBcrypt.hash.mockImplementation(async (password: string, saltOrRounds: string | number) => {
        totalHashOperations++;
        
        // Simulate the actual bcrypt timing (this would be MUCH slower in reality)
        const start = Date.now();
        await new Promise(resolve => setTimeout(resolve, 10)); // 10ms per hash (real bcrypt ~100ms)
        totalHashTime += Date.now() - start;
        
        expect(saltOrRounds).toBe(10); // High cost factor causing performance issues
        return `hashed-${password}`;
      });
      
      (mockBcrypt.compare as jest.Mock).mockResolvedValue(false);

      // Act - Simulate concurrent attack requests
      const attackRequests = [];
      const numberOfAttackRequests = 10;
      
      for (let i = 0; i < numberOfAttackRequests; i++) {
        attackRequests.push(
          request(app)
            .post('/auth/admin/login')
            .send({
              email: adminEmail,
              password: `attack-${i}`
            })
        );
      }

      const startTime = Date.now();
      await Promise.all(attackRequests);
      const totalTime = Date.now() - startTime;

      // Assert - Demonstrate the DoS vulnerability
      expect(totalHashOperations).toBe(numberOfAttackRequests * 2); // 2 hardcoded passwords hashed per request
      
      console.log(`🚨 VULNERABILITY: ${numberOfAttackRequests} requests caused ${totalHashOperations} hash operations`);
      console.log(`🚨 VULNERABILITY: Total simulated time: ${totalHashTime}ms (would be ~${totalHashOperations * 100}ms in reality)`);
      
      // In reality, this would be: numberOfAttackRequests * 2 * ~100ms = devastating performance impact
      expect(totalHashOperations).toBeGreaterThan(numberOfAttackRequests);
    });

    it('should demonstrate event loop blocking through synchronous-style hashing', async () => {
      // Arrange
      const adminEmail = 'admin@econindicatordaily.com';
      
      mockJWTUtils.isAdminEmail.mockReturnValue(true);
      
      let hashCallOrder: number[] = [];
      let callIndex = 0;
      
      mockBcrypt.hash.mockImplementation(async (password: string, saltOrRounds: string | number) => {
        const currentCall = ++callIndex;
        hashCallOrder.push(currentCall);
        
        // Simulate blocking behavior
        await new Promise(resolve => setTimeout(resolve, 50));
        return `hash-${currentCall}`;
      });
      
      (mockBcrypt.compare as jest.Mock).mockResolvedValue(false);

      // Act - Multiple rapid requests to trigger concurrent hashing
      const rapidRequests = [
        request(app).post('/auth/admin/login').send({ email: adminEmail, password: 'test1' }),
        request(app).post('/auth/admin/login').send({ email: adminEmail, password: 'test2' }),
        request(app).post('/auth/admin/login').send({ email: adminEmail, password: 'test3' }),
      ];

      await Promise.all(rapidRequests);

      // Assert - Verify that hash operations are being called repeatedly
      expect(hashCallOrder.length).toBe(6); // 3 requests * 2 hardcoded passwords each
      expect(mockBcrypt.hash).toHaveBeenCalledTimes(6);
      
      console.log(`🚨 VULNERABILITY: Each request triggers multiple expensive hash operations`);
      console.log(`🚨 VULNERABILITY: Hash operations called: ${hashCallOrder.length}`);
    });
  });

  describe('VULNERABILITY 3: Password Enumeration Through Timing (CRITICAL)', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production';
    });

    it('should demonstrate timing attack vulnerability', async () => {
      // Arrange
      const knownAdminEmail = 'admin@econindicatordaily.com';
      const unknownEmail = 'notanadmin@example.com';
      
      let adminEmailRequestTime = 0;
      let unknownEmailRequestTime = 0;
      
      mockBcrypt.hash.mockImplementation(async (password: string, saltOrRounds: string | number) => {
        // Simulate real bcrypt timing
        await new Promise(resolve => setTimeout(resolve, 5));
        return `hashed-${password}`;
      });
      
      (mockBcrypt.compare as jest.Mock).mockResolvedValue(false);

      // Act - Test with known admin email (should trigger hashing)
      mockJWTUtils.isAdminEmail.mockReturnValue(true);
      
      const adminStart = Date.now();
      await request(app)
        .post('/auth/admin/login')
        .send({
          email: knownAdminEmail,
          password: 'testpassword'
        });
      adminEmailRequestTime = Date.now() - adminStart;
      
      // Reset mocks
      mockBcrypt.hash.mockClear();
      
      // Act - Test with unknown email (should fail fast)
      mockJWTUtils.isAdminEmail.mockReturnValue(false);
      
      const unknownStart = Date.now();
      await request(app)
        .post('/auth/admin/login')
        .send({
          email: unknownEmail,
          password: 'testpassword'
        });
      unknownEmailRequestTime = Date.now() - unknownStart;

      // Assert - Timing difference reveals admin emails
      expect(adminEmailRequestTime).toBeGreaterThan(unknownEmailRequestTime);
      
      console.log(`🚨 VULNERABILITY: Admin email request time: ${adminEmailRequestTime}ms`);
      console.log(`🚨 VULNERABILITY: Unknown email request time: ${unknownEmailRequestTime}ms`);
      console.log(`🚨 VULNERABILITY: Timing difference reveals valid admin emails`);
      
      // Verify that admin emails trigger expensive operations
      expect(mockBcrypt.hash).toHaveBeenCalledTimes(0); // Should not be called for unknown email
    });

    it('should demonstrate admin email enumeration through response patterns', async () => {
      // Arrange
      const emailTests = [
        { email: 'admin@econindicatordaily.com', isAdmin: true, expectedOperations: 2 },
        { email: 'dev@econindicatordaily.com', isAdmin: true, expectedOperations: 2 },
        { email: 'user@example.com', isAdmin: false, expectedOperations: 0 },
        { email: 'random@test.com', isAdmin: false, expectedOperations: 0 },
      ];

      for (const test of emailTests) {
        // Reset
        mockBcrypt.hash.mockClear();
        mockJWTUtils.isAdminEmail.mockReturnValue(test.isAdmin);
        
        (mockBcrypt.hash as jest.Mock).mockImplementation(async (password: string) => `hashed-${password}`);
        (mockBcrypt.compare as jest.Mock).mockResolvedValue(false);

        // Act
        const response = await request(app)
          .post('/auth/admin/login')
          .send({
            email: test.email,
            password: 'testpassword'
          });

        // Assert
        if (test.isAdmin) {
          expect(response.status).toBe(401); // Failed auth after expensive operations
          expect(mockBcrypt.hash).toHaveBeenCalledTimes(test.expectedOperations);
        } else {
          expect(response.status).toBe(403); // Fast rejection
          expect(mockBcrypt.hash).not.toHaveBeenCalled();
        }
        
        console.log(`Email: ${test.email}, Admin: ${test.isAdmin}, Hash calls: ${mockBcrypt.hash.mock.calls.length}`);
      }
    });
  });

  describe('VULNERABILITY 4: JWT Token Security Issues', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development';
    });

    it('should generate admin tokens with elevated privileges without proper validation', async () => {
      // Arrange
      const adminEmail = 'admin@econindicatordaily.com';
      const hardcodedPassword = 'admin123';
      
      mockJWTUtils.isAdminEmail.mockReturnValue(true);
      mockJWTUtils.getAdminLevel.mockReturnValue('super');
      mockJWTUtils.generateAdminToken.mockReturnValue('super-admin-token');
      mockJWTUtils.generateRefreshToken.mockReturnValue('refresh-token');
      
      const mockUser = getMockAdminUser({ email: adminEmail });
      mockUserServiceInstance.getUserByEmail.mockResolvedValue(mockUser);

      // Act
      const response = await request(app)
        .post('/auth/admin/login')
        .send({
          email: adminEmail,
          password: hardcodedPassword
        });

      // Assert - Admin token generated with just hardcoded password
      expect(response.status).toBe(200);
      expect(mockJWTUtils.generateAdminToken).toHaveBeenCalledWith({
        userId: mockUser.id,
        email: mockUser.email,
        role: 'admin',
        adminLevel: 'super'
      });
      
      console.log('🚨 VULNERABILITY: Admin token with "super" privileges generated using hardcoded password');
      expect(response.body.data.user.role).toBe('admin');
    });

    it('should expose admin level assignment without proper authorization', async () => {
      // Arrange
      const testEmails = [
        'admin@econindicatordaily.com',
        'dev@econindicatordaily.com',
        'anyadmin@econindicatordaily.com' // Any email in admin list gets super access
      ];

      for (const email of testEmails) {
        mockJWTUtils.isAdminEmail.mockReturnValue(true);
        mockJWTUtils.getAdminLevel.mockReturnValue('super'); // ALL admin emails get 'super' access
        mockJWTUtils.generateAdminToken.mockReturnValue('admin-token');
        mockJWTUtils.generateRefreshToken.mockReturnValue('refresh-token');
        
        const mockUser = getMockAdminUser({ email });
        mockUserServiceInstance.getUserByEmail.mockResolvedValue(mockUser);

        // Act
        const response = await request(app)
          .post('/auth/admin/login')
          .send({
            email,
            password: 'admin123'
          });

        // Assert
        expect(response.status).toBe(200);
        expect(mockJWTUtils.getAdminLevel).toHaveBeenCalledWith(email);
        
        console.log(`🚨 VULNERABILITY: Email ${email} gets 'super' admin level without granular authorization`);
      }
    });
  });

  describe('VULNERABILITY 5: Environment Security Bypass', () => {
    it('should demonstrate environment-based authentication bypass', async () => {
      // This test shows how NODE_ENV manipulation could bypass security
      
      const adminEmail = 'admin@econindicatordaily.com';
      mockJWTUtils.isAdminEmail.mockReturnValue(true);
      
      // Test production mode (secure)
      process.env.NODE_ENV = 'production';
      (mockBcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
      (mockBcrypt.compare as jest.Mock).mockResolvedValue(false);
      
      let response = await request(app)
        .post('/auth/admin/login')
        .send({
          email: adminEmail,
          password: 'admin123'
        });
      
      expect(response.status).toBe(401); // Secure - rejects hardcoded password
      
      // Test development mode (insecure)
      process.env.NODE_ENV = 'development';
      
      const mockUser = getMockAdminUser({ email: adminEmail });
      mockUserServiceInstance.getUserByEmail.mockResolvedValue(mockUser);
      mockJWTUtils.generateAdminToken.mockReturnValue('admin-token');
      mockJWTUtils.generateRefreshToken.mockReturnValue('refresh-token');
      
      response = await request(app)
        .post('/auth/admin/login')
        .send({
          email: adminEmail,
          password: 'admin123'
        });
      
      expect(response.status).toBe(200); // Insecure - accepts hardcoded password
      
      console.log('🚨 VULNERABILITY: NODE_ENV=development bypasses all password security');
      console.log('🚨 VULNERABILITY: Environment variable manipulation could compromise security');
    });
  });

  describe('Integration Security Test - Full Attack Simulation', () => {
    it('should demonstrate complete security compromise scenario', async () => {
      // This test simulates a real attack scenario combining multiple vulnerabilities
      
      console.log('\n🚨 SIMULATING COMPLETE SECURITY COMPROMISE 🚨');
      
      // Step 1: Environment detection (attacker determines they're in development)
      process.env.NODE_ENV = 'development';
      mockJWTUtils.isAdminEmail.mockReturnValue(true);
      mockJWTUtils.getAdminLevel.mockReturnValue('super');
      mockJWTUtils.generateAdminToken.mockReturnValue('compromised-admin-token');
      mockJWTUtils.generateRefreshToken.mockReturnValue('compromised-refresh-token');
      
      const mockUser = getMockAdminUser();
      mockUserServiceInstance.getUserByEmail.mockResolvedValue(mockUser);
      
      // Step 2: Admin email enumeration (attacker finds valid admin emails)
      const potentialAdminEmails = [
        'admin@econindicatordaily.com',
        'administrator@econindicatordaily.com',
        'dev@econindicatordaily.com',
        'support@econindicatordaily.com'
      ];
      
      const validAdminEmails: string[] = [];
      
      for (const email of potentialAdminEmails) {
        mockJWTUtils.isAdminEmail.mockReturnValue(email.includes('admin') || email.includes('dev'));
        
        const response = await request(app)
          .post('/auth/admin/login')
          .send({
            email,
            password: 'wrongpassword'
          });
        
        if (response.status === 401) { // Failed auth but went through admin flow
          validAdminEmails.push(email);
          console.log(`✓ Found valid admin email: ${email}`);
        }
      }
      
      // Step 3: Hardcoded password attack (attacker uses known development password)
      for (const adminEmail of validAdminEmails) {
        mockJWTUtils.isAdminEmail.mockReturnValue(true);
        mockUserServiceInstance.getUserByEmail.mockResolvedValue(getMockAdminUser({ email: adminEmail }));
        
        const response = await request(app)
          .post('/auth/admin/login')
          .send({
            email: adminEmail,
            password: 'admin123' // Hardcoded password from source code
          });
        
        if (response.status === 200) {
          console.log(`🔓 SUCCESSFULLY COMPROMISED ADMIN ACCOUNT: ${adminEmail}`);
          console.log(`🔓 Admin token obtained: ${response.body.data.token}`);
          console.log(`🔓 Admin level: ${response.body.data.user.adminLevel}`);
          
          // Step 4: Token privileges verification
          expect(response.body.data.user.role).toBe('admin');
          expect(response.body.data.user.adminLevel).toBe('super');
          expect(response.body.data.token).toBe('compromised-admin-token');
          
          // Attack successful - full admin access obtained
          return;
        }
      }
      
      fail('Attack simulation should have succeeded with hardcoded credentials');
    });
  });
});