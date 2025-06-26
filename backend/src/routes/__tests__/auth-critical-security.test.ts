import request from 'supertest';
import express from 'express';

// Create manual mocks before importing modules
const mockBcryptHash = jest.fn();
const mockBcryptCompare = jest.fn();
const mockJWTUtilsIsAdminEmail = jest.fn();
const mockJWTUtilsGetAdminLevel = jest.fn();
const mockJWTUtilsGenerateAdminToken = jest.fn();
const mockJWTUtilsGenerateRefreshToken = jest.fn();
const mockJWTUtilsGenerateToken = jest.fn();
const mockUserServiceInstance = {
  getUserByEmail: jest.fn(),
  createUser: jest.fn(),
  findOrCreateUser: jest.fn(),
  getUserById: jest.fn(),
};

// Mock all dependencies before importing
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({})),
}));

jest.mock('bcryptjs', () => ({
  hash: mockBcryptHash,
  compare: mockBcryptCompare,
}));

jest.mock('../../utils/jwt', () => ({
  JWTUtils: {
    isAdminEmail: mockJWTUtilsIsAdminEmail,
    getAdminLevel: mockJWTUtilsGetAdminLevel,
    generateAdminToken: mockJWTUtilsGenerateAdminToken,
    generateRefreshToken: mockJWTUtilsGenerateRefreshToken,
    generateToken: mockJWTUtilsGenerateToken,
  },
}));

jest.mock('../../utils/env', () => ({
  env: {
    JWT_SECRET: 'test-secret',
    NODE_ENV: 'test',
    ADMIN_EMAILS: ['admin@econindicatordaily.com', 'dev@econindicatordaily.com'],
  },
}));

jest.mock('../../services/userService', () => ({
  UserService: jest.fn().mockImplementation(() => mockUserServiceInstance),
}));

jest.mock('../../middleware/auth', () => ({
  authMiddleware: jest.fn((req: any, res: any, next: any) => next()),
}));

// Now import the routes
import authRoutes from '../auth';

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

// Create test app
const createTestApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/auth', authRoutes);
  return app;
};

describe('Auth Routes - CRITICAL SECURITY VULNERABILITIES', () => {
  let app: express.Application;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Setup default mock implementations
    mockJWTUtilsIsAdminEmail.mockReturnValue(false);
    mockJWTUtilsGetAdminLevel.mockReturnValue('super');
    mockJWTUtilsGenerateAdminToken.mockReturnValue('admin-token');
    mockJWTUtilsGenerateRefreshToken.mockReturnValue('refresh-token');
    mockJWTUtilsGenerateToken.mockReturnValue('user-token');
    
    mockBcryptHash.mockResolvedValue('hashed-password');
    mockBcryptCompare.mockResolvedValue(false);
    
    mockUserServiceInstance.getUserByEmail.mockResolvedValue(null);
    mockUserServiceInstance.createUser.mockResolvedValue(getMockUser());

    app = createTestApp();
  });

  describe('🚨 VULNERABILITY 1: Hardcoded Admin Credentials (CRITICAL)', () => {
    describe('Development Mode Hardcoded Password', () => {
      beforeEach(() => {
        process.env.NODE_ENV = 'development';
      });

      afterEach(() => {
        process.env.NODE_ENV = 'test';
      });

      test('should expose hardcoded development password "admin123"', async () => {
        // Arrange
        const adminEmail = 'admin@econindicatordaily.com';
        const hardcodedPassword = 'admin123'; // VULNERABILITY: Hardcoded password in source code
        
        mockJWTUtilsIsAdminEmail.mockReturnValue(true);
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
        
        console.log('🚨 CRITICAL VULNERABILITY: Hardcoded password "admin123" works in development mode');
        
        // Verify this was accepted without any secure authentication
        expect(mockBcryptCompare).not.toHaveBeenCalled();
      });

      test('should reject any password other than hardcoded "admin123"', async () => {
        // Arrange
        const adminEmail = 'admin@econindicatordaily.com';
        const securePassword = 'SecurePassword123!@#';
        
        mockJWTUtilsIsAdminEmail.mockReturnValue(true);

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
        
        console.log('🚨 VULNERABILITY: Only hardcoded "admin123" works, secure passwords are rejected');
      });

      test('should demonstrate password enumeration through environment check', async () => {
        const adminEmail = 'admin@econindicatordaily.com';
        mockJWTUtilsIsAdminEmail.mockReturnValue(true);
        const mockUser = getMockAdminUser({ email: adminEmail });
        mockUserServiceInstance.getUserByEmail.mockResolvedValue(mockUser);
        
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

      afterEach(() => {
        process.env.NODE_ENV = 'test';
      });

      test('should expose hardcoded production passwords in source code', async () => {
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
        
        mockJWTUtilsIsAdminEmail.mockReturnValue(true);

        for (const testCase of testCases) {
          // VULNERABILITY: The validateAdminPassword function has these passwords hardcoded
          mockBcryptHash.mockImplementation(async (password: string) => {
            if (password === testCase.expectedPassword) {
              return 'hashed-expected-password';
            }
            return 'other-hash';
          });
          
          mockBcryptCompare.mockImplementation(async (password: string, hash: string) => {
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
          expect(mockBcryptHash).toHaveBeenCalledWith(testCase.expectedPassword, 10);
          console.log(`🚨 CRITICAL VULNERABILITY: Password "${testCase.expectedPassword}" hardcoded for ${testCase.email}`);
        }
      });
    });
  });

  describe('🚨 VULNERABILITY 2: Runtime Password Hashing DoS Attack (CRITICAL)', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production';
    });

    afterEach(() => {
      process.env.NODE_ENV = 'test';
    });

    test('should demonstrate denial of service through expensive bcrypt operations', async () => {
      // Arrange
      const adminEmail = 'admin@econindicatordaily.com';
      
      mockJWTUtilsIsAdminEmail.mockReturnValue(true);
      
      let totalHashOperations = 0;
      let totalHashTime = 0;
      
      // VULNERABILITY: bcrypt.hash is called with cost factor 10 on EVERY request
      mockBcryptHash.mockImplementation(async (password: string, rounds: number) => {
        totalHashOperations++;
        
        // Simulate the actual bcrypt timing (this would be MUCH slower in reality)
        const start = Date.now();
        await new Promise(resolve => setTimeout(resolve, 5)); // 5ms per hash (real bcrypt ~100ms)
        totalHashTime += Date.now() - start;
        
        expect(rounds).toBe(10); // High cost factor causing performance issues
        return `hashed-${password}`;
      });

      // Act - Simulate concurrent attack requests
      const attackRequests = [];
      const numberOfAttackRequests = 5;
      
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
      
      console.log(`🚨 CRITICAL VULNERABILITY: ${numberOfAttackRequests} requests caused ${totalHashOperations} hash operations`);
      console.log(`🚨 CRITICAL VULNERABILITY: Total simulated time: ${totalHashTime}ms (would be ~${totalHashOperations * 100}ms in reality)`);
      
      // In reality, this would be: numberOfAttackRequests * 2 * ~100ms = devastating performance impact
      expect(totalHashOperations).toBeGreaterThan(numberOfAttackRequests);
    });

    test('should demonstrate event loop blocking through synchronous-style hashing', async () => {
      // Arrange
      const adminEmail = 'admin@econindicatordaily.com';
      
      mockJWTUtilsIsAdminEmail.mockReturnValue(true);
      
      let hashCallOrder: number[] = [];
      let callIndex = 0;
      
      mockBcryptHash.mockImplementation(async (password: string, rounds: number) => {
        const currentCall = ++callIndex;
        hashCallOrder.push(currentCall);
        
        // Simulate blocking behavior
        await new Promise(resolve => setTimeout(resolve, 10));
        return `hash-${currentCall}`;
      });

      // Act - Multiple rapid requests to trigger concurrent hashing
      const rapidRequests = [
        request(app).post('/auth/admin/login').send({ email: adminEmail, password: 'test1' }),
        request(app).post('/auth/admin/login').send({ email: adminEmail, password: 'test2' }),
        request(app).post('/auth/admin/login').send({ email: adminEmail, password: 'test3' }),
      ];

      await Promise.all(rapidRequests);

      // Assert - Verify that hash operations are being called repeatedly
      expect(hashCallOrder.length).toBe(6); // 3 requests * 2 hardcoded passwords each
      expect(mockBcryptHash).toHaveBeenCalledTimes(6);
      
      console.log(`🚨 CRITICAL VULNERABILITY: Each request triggers multiple expensive hash operations`);
      console.log(`🚨 CRITICAL VULNERABILITY: Hash operations called: ${hashCallOrder.length}`);
    });
  });

  describe('🚨 VULNERABILITY 3: Password Enumeration Through Timing (CRITICAL)', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production';
    });

    afterEach(() => {
      process.env.NODE_ENV = 'test';
    });

    test('should demonstrate timing attack vulnerability', async () => {
      // Arrange
      const knownAdminEmail = 'admin@econindicatordaily.com';
      const unknownEmail = 'notanadmin@example.com';
      
      mockBcryptHash.mockImplementation(async (password: string, rounds: number) => {
        // Simulate real bcrypt timing
        await new Promise(resolve => setTimeout(resolve, 5));
        return `hashed-${password}`;
      });

      // Act - Test with known admin email (should trigger hashing)
      mockJWTUtilsIsAdminEmail.mockReturnValue(true);
      
      const adminStart = Date.now();
      await request(app)
        .post('/auth/admin/login')
        .send({
          email: knownAdminEmail,
          password: 'testpassword'
        });
      const adminEmailRequestTime = Date.now() - adminStart;
      
      // Reset hash call counter
      mockBcryptHash.mockClear();
      
      // Act - Test with unknown email (should fail fast)
      mockJWTUtilsIsAdminEmail.mockReturnValue(false);
      
      const unknownStart = Date.now();
      await request(app)
        .post('/auth/admin/login')
        .send({
          email: unknownEmail,
          password: 'testpassword'
        });
      const unknownEmailRequestTime = Date.now() - unknownStart;

      // Assert - Timing difference reveals admin emails
      expect(adminEmailRequestTime).toBeGreaterThan(unknownEmailRequestTime);
      
      console.log(`🚨 CRITICAL VULNERABILITY: Admin email request time: ${adminEmailRequestTime}ms`);
      console.log(`🚨 CRITICAL VULNERABILITY: Unknown email request time: ${unknownEmailRequestTime}ms`);
      console.log(`🚨 CRITICAL VULNERABILITY: Timing difference reveals valid admin emails`);
      
      // Verify that admin emails trigger expensive operations but unknown emails don't
      expect(mockBcryptHash).not.toHaveBeenCalled(); // Should not be called for unknown email
    });

    test('should demonstrate admin email enumeration through response patterns', async () => {
      // Arrange
      const emailTests = [
        { email: 'admin@econindicatordaily.com', isAdmin: true, expectedOperations: 2 },
        { email: 'dev@econindicatordaily.com', isAdmin: true, expectedOperations: 2 },
        { email: 'user@example.com', isAdmin: false, expectedOperations: 0 },
        { email: 'random@test.com', isAdmin: false, expectedOperations: 0 },
      ];

      for (const test of emailTests) {
        // Reset
        mockBcryptHash.mockClear();
        mockJWTUtilsIsAdminEmail.mockReturnValue(test.isAdmin);
        
        mockBcryptHash.mockImplementation(async (password: string) => `hashed-${password}`);

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
          expect(mockBcryptHash).toHaveBeenCalledTimes(test.expectedOperations);
        } else {
          expect(response.status).toBe(403); // Fast rejection
          expect(mockBcryptHash).not.toHaveBeenCalled();
        }
        
        console.log(`Email: ${test.email}, Admin: ${test.isAdmin}, Hash calls: ${mockBcryptHash.mock.calls.length}`);
      }
    });
  });

  describe('🚨 VULNERABILITY 4: JWT Token Security Issues', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development';
    });

    afterEach(() => {
      process.env.NODE_ENV = 'test';
    });

    test('should generate admin tokens with elevated privileges without proper validation', async () => {
      // Arrange
      const adminEmail = 'admin@econindicatordaily.com';
      const hardcodedPassword = 'admin123';
      
      mockJWTUtilsIsAdminEmail.mockReturnValue(true);
      
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
      expect(mockJWTUtilsGenerateAdminToken).toHaveBeenCalledWith({
        userId: mockUser.id,
        email: mockUser.email,
        role: 'admin',
        adminLevel: 'super'
      });
      
      console.log('🚨 CRITICAL VULNERABILITY: Admin token with "super" privileges generated using hardcoded password');
      expect(response.body.data.user.role).toBe('admin');
    });

    test('should expose admin level assignment without proper authorization', async () => {
      // Arrange
      const testEmails = [
        'admin@econindicatordaily.com',
        'dev@econindicatordaily.com',
      ];

      for (const email of testEmails) {
        mockJWTUtilsIsAdminEmail.mockReturnValue(true);
        
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
        expect(mockJWTUtilsGetAdminLevel).toHaveBeenCalledWith(email);
        
        console.log(`🚨 CRITICAL VULNERABILITY: Email ${email} gets 'super' admin level without granular authorization`);
      }
    });
  });

  describe('🚨 VULNERABILITY 5: Environment Security Bypass', () => {
    test('should demonstrate environment-based authentication bypass', async () => {
      // This test shows how NODE_ENV manipulation could bypass security
      
      const adminEmail = 'admin@econindicatordaily.com';
      mockJWTUtilsIsAdminEmail.mockReturnValue(true);
      
      // Test production mode (secure)
      process.env.NODE_ENV = 'production';
      mockBcryptHash.mockResolvedValue('hashed-password');
      
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
      
      response = await request(app)
        .post('/auth/admin/login')
        .send({
          email: adminEmail,
          password: 'admin123'
        });
      
      expect(response.status).toBe(200); // Insecure - accepts hardcoded password
      
      console.log('🚨 CRITICAL VULNERABILITY: NODE_ENV=development bypasses all password security');
      console.log('🚨 CRITICAL VULNERABILITY: Environment variable manipulation could compromise security');
      
      // Cleanup
      process.env.NODE_ENV = 'test';
    });
  });

  describe('🚨 INTEGRATION SECURITY TEST - Full Attack Simulation', () => {
    test('should demonstrate complete security compromise scenario', async () => {
      // This test simulates a real attack scenario combining multiple vulnerabilities
      
      console.log('\n🚨 SIMULATING COMPLETE SECURITY COMPROMISE 🚨');
      
      // Step 1: Environment detection (attacker determines they're in development)
      process.env.NODE_ENV = 'development';
      
      // Step 2: Admin email enumeration (attacker finds valid admin emails)
      const potentialAdminEmails = [
        'admin@econindicatordaily.com',
        'administrator@econindicatordaily.com',
        'dev@econindicatordaily.com',
        'support@econindicatordaily.com'
      ];
      
      const validAdminEmails: string[] = [];
      
      for (const email of potentialAdminEmails) {
        mockJWTUtilsIsAdminEmail.mockReturnValue(email.includes('admin') || email.includes('dev'));
        
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
        mockJWTUtilsIsAdminEmail.mockReturnValue(true);
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
          expect(response.body.data.token).toBe('admin-token');
          
          // Attack successful - full admin access obtained
          process.env.NODE_ENV = 'test'; // Cleanup
          return;
        }
      }
      
      process.env.NODE_ENV = 'test'; // Cleanup
      fail('Attack simulation should have succeeded with hardcoded credentials');
    });
  });

  describe('🚨 VULNERABILITY SUMMARY REPORT', () => {
    test('should generate comprehensive vulnerability report', async () => {
      console.log('\n==========================================');
      console.log('🚨 CRITICAL SECURITY VULNERABILITIES FOUND 🚨');
      console.log('==========================================\n');
      
      console.log('1. HARDCODED ADMIN CREDENTIALS (CRITICAL)');
      console.log('   • Development password "admin123" in source code');
      console.log('   • Production passwords "secureAdminPassword123!" and "devPassword123!" in source code');
      console.log('   • Location: backend/src/routes/auth.ts:44, 344-345');
      console.log('   • Risk: Complete compromise of administrative access\n');
      
      console.log('2. RUNTIME PASSWORD HASHING DoS (CRITICAL)');
      console.log('   • bcrypt.hash() called on every login request');
      console.log('   • Blocks Node.js event loop with expensive operations');
      console.log('   • Location: backend/src/routes/auth.ts:344-345');
      console.log('   • Risk: Severe performance issues and DoS attacks\n');
      
      console.log('3. PASSWORD ENUMERATION (CRITICAL)');
      console.log('   • Timing differences reveal valid admin emails');
      console.log('   • Admin emails trigger expensive hash operations');
      console.log('   • Risk: Unauthorized admin email discovery\n');
      
      console.log('4. JWT TOKEN SECURITY (HIGH)');
      console.log('   • Admin tokens generated with hardcoded passwords');
      console.log('   • All admin emails get "super" privileges automatically');
      console.log('   • Risk: Privilege escalation\n');
      
      console.log('5. ENVIRONMENT SECURITY BYPASS (HIGH)');
      console.log('   • NODE_ENV=development bypasses all authentication');
      console.log('   • Risk: Environment misconfiguration compromise\n');
      
      console.log('==========================================');
      console.log('IMMEDIATE ACTIONS REQUIRED:');
      console.log('1. Remove hardcoded passwords from source code');
      console.log('2. Implement proper admin user database');
      console.log('3. Fix runtime password hashing performance');
      console.log('4. Add consistent timing for all authentication paths');
      console.log('5. Remove development authentication bypasses');
      console.log('==========================================\n');
      
      // This test always passes - it's just for reporting
      expect(true).toBe(true);
    });
  });
});