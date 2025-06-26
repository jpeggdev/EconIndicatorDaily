import { Request, Response, NextFunction } from 'express';
import {
  authMiddleware,
  optionalAuthMiddleware,
  adminAuthMiddleware,
  requireRole,
  requireAdminLevel
} from '../auth';

// Define types for testing
interface JWTPayload {
  userId: string;
  email: string;
  role: 'user' | 'admin';
  iat?: number;
  exp?: number;
}

interface AdminJWTPayload extends JWTPayload {
  role: 'admin';
  adminLevel: 'read' | 'write' | 'super';
}

// Mock the entire jwt utils module to avoid compilation issues
jest.mock('../../utils/jwt', () => ({
  JWTUtils: {
    extractTokenFromHeader: jest.fn(),
    verifyToken: jest.fn(),
    verifyAdminToken: jest.fn(),
  }
}));

// Mock the env module
jest.mock('../../utils/env', () => ({
  env: {
    JWT_SECRET: 'test-secret-key-for-testing',
    NODE_ENV: 'test',
    ADMIN_EMAILS: ['admin@econindicatordaily.com']
  }
}));

import { JWTUtils } from '../../utils/jwt';

const mockedJWTUtils = JWTUtils as jest.Mocked<typeof JWTUtils>;

describe('Authentication Middleware', () => {
  let mockRequest: Partial<Request> & { path?: string };
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;

  // Factory for creating mock user data
  const getMockUser = (overrides?: Partial<JWTPayload>): JWTPayload => ({
    userId: 'test-user-123',
    email: 'test@example.com',
    role: 'user',
    iat: Date.now(),
    exp: Date.now() + 3600000,
    ...overrides,
  });

  // Factory for creating mock admin data
  const getMockAdmin = (overrides?: Partial<AdminJWTPayload>): AdminJWTPayload => ({
    userId: 'admin-user-123',
    email: 'admin@econindicatordaily.com',
    role: 'admin',
    adminLevel: 'super',
    iat: Date.now(),
    exp: Date.now() + 3600000,
    ...overrides,
  });

  beforeEach(() => {
    mockJson = jest.fn().mockReturnValue({ json: jest.fn() });
    mockStatus = jest.fn().mockReturnValue({ json: mockJson });
    
    mockRequest = {
      headers: {},
      user: undefined,
      admin: undefined
    };
    
    mockResponse = {
      status: mockStatus,
      json: mockJson
    };
    
    mockNext = jest.fn();

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('authMiddleware', () => {
    describe('when token is valid', () => {
      it('should set user on request and call next', () => {
        // Arrange
        const mockUser = getMockUser();
        const token = 'valid-token';
        mockRequest.headers = { authorization: `Bearer ${token}` };
        
        mockedJWTUtils.extractTokenFromHeader.mockReturnValue(token);
        mockedJWTUtils.verifyToken.mockReturnValue(mockUser);

        // Act
        authMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

        // Assert
        expect(mockedJWTUtils.extractTokenFromHeader).toHaveBeenCalledWith(`Bearer ${token}`);
        expect(mockedJWTUtils.verifyToken).toHaveBeenCalledWith(token);
        expect(mockRequest.user).toEqual(mockUser);
        expect(mockNext).toHaveBeenCalled();
        expect(mockStatus).not.toHaveBeenCalled();
      });
    });

    describe('when no token is provided', () => {
      it('should return 401 with NO_TOKEN code', () => {
        // Arrange
        mockRequest.headers = {};
        mockedJWTUtils.extractTokenFromHeader.mockReturnValue(null);

        // Act
        authMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

        // Assert
        expect(mockStatus).toHaveBeenCalledWith(401);
        expect(mockJson).toHaveBeenCalledWith({
          success: false,
          error: 'Authentication required',
          code: 'NO_TOKEN'
        });
        expect(mockNext).not.toHaveBeenCalled();
      });

      it('should handle missing authorization header', () => {
        // Arrange
        mockRequest.headers = { authorization: undefined };
        mockedJWTUtils.extractTokenFromHeader.mockReturnValue(null);

        // Act
        authMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

        // Assert
        expect(mockStatus).toHaveBeenCalledWith(401);
        expect(mockJson).toHaveBeenCalledWith({
          success: false,
          error: 'Authentication required',
          code: 'NO_TOKEN'
        });
      });
    });

    describe('when token is invalid', () => {
      it('should return 401 with INVALID_TOKEN code for malformed token', () => {
        // Arrange
        const token = 'invalid-token';
        mockRequest.headers = { authorization: `Bearer ${token}` };
        
        mockedJWTUtils.extractTokenFromHeader.mockReturnValue(token);
        mockedJWTUtils.verifyToken.mockImplementation(() => {
          throw new Error('Invalid token');
        });

        // Act
        authMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

        // Assert
        expect(mockStatus).toHaveBeenCalledWith(401);
        expect(mockJson).toHaveBeenCalledWith({
          success: false,
          error: 'Invalid token',
          code: 'INVALID_TOKEN'
        });
        expect(mockNext).not.toHaveBeenCalled();
      });

      it('should return 401 with INVALID_TOKEN code for expired token', () => {
        // Arrange
        const token = 'expired-token';
        mockRequest.headers = { authorization: `Bearer ${token}` };
        
        mockedJWTUtils.extractTokenFromHeader.mockReturnValue(token);
        mockedJWTUtils.verifyToken.mockImplementation(() => {
          throw new Error('Token has expired');
        });

        // Act
        authMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

        // Assert
        expect(mockStatus).toHaveBeenCalledWith(401);
        expect(mockJson).toHaveBeenCalledWith({
          success: false,
          error: 'Token has expired',
          code: 'INVALID_TOKEN'
        });
      });

      it('should handle non-Error exceptions gracefully', () => {
        // Arrange
        const token = 'invalid-token';
        mockRequest.headers = { authorization: `Bearer ${token}` };
        
        mockedJWTUtils.extractTokenFromHeader.mockReturnValue(token);
        mockedJWTUtils.verifyToken.mockImplementation(() => {
          throw 'Non-error exception';
        });

        // Act
        authMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

        // Assert
        expect(mockStatus).toHaveBeenCalledWith(401);
        expect(mockJson).toHaveBeenCalledWith({
          success: false,
          error: 'Authentication failed',
          code: 'INVALID_TOKEN'
        });
      });
    });

    describe('edge cases', () => {
      it('should handle malformed authorization header', () => {
        // Arrange
        mockRequest.headers = { authorization: 'Invalid-Format' };
        mockedJWTUtils.extractTokenFromHeader.mockReturnValue(null);

        // Act
        authMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

        // Assert
        expect(mockStatus).toHaveBeenCalledWith(401);
        expect(mockJson).toHaveBeenCalledWith({
          success: false,
          error: 'Authentication required',
          code: 'NO_TOKEN'
        });
      });

      it('should handle empty token in authorization header', () => {
        // Arrange
        mockRequest.headers = { authorization: 'Bearer ' };
        mockedJWTUtils.extractTokenFromHeader.mockReturnValue(null);

        // Act
        authMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

        // Assert
        expect(mockStatus).toHaveBeenCalledWith(401);
        expect(mockJson).toHaveBeenCalledWith({
          success: false,
          error: 'Authentication required',
          code: 'NO_TOKEN'
        });
      });
    });
  });

  describe('optionalAuthMiddleware', () => {
    describe('when token is valid', () => {
      it('should set user on request and call next', () => {
        // Arrange
        const mockUser = getMockUser();
        const token = 'valid-token';
        mockRequest.headers = { authorization: `Bearer ${token}` };
        
        mockedJWTUtils.extractTokenFromHeader.mockReturnValue(token);
        mockedJWTUtils.verifyToken.mockReturnValue(mockUser);

        // Act
        optionalAuthMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

        // Assert
        expect(mockRequest.user).toEqual(mockUser);
        expect(mockNext).toHaveBeenCalled();
        expect(mockStatus).not.toHaveBeenCalled();
      });
    });

    describe('when no token is provided', () => {
      it('should call next without setting user', () => {
        // Arrange
        mockRequest.headers = {};
        mockedJWTUtils.extractTokenFromHeader.mockReturnValue(null);

        // Act
        optionalAuthMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

        // Assert
        expect(mockRequest.user).toBeUndefined();
        expect(mockNext).toHaveBeenCalled();
        expect(mockStatus).not.toHaveBeenCalled();
      });
    });

    describe('when token is invalid', () => {
      it('should call next without setting user (no error thrown)', () => {
        // Arrange
        const token = 'invalid-token';
        mockRequest.headers = { authorization: `Bearer ${token}` };
        
        mockedJWTUtils.extractTokenFromHeader.mockReturnValue(token);
        mockedJWTUtils.verifyToken.mockImplementation(() => {
          throw new Error('Invalid token');
        });

        // Act
        optionalAuthMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

        // Assert
        expect(mockRequest.user).toBeUndefined();
        expect(mockNext).toHaveBeenCalled();
        expect(mockStatus).not.toHaveBeenCalled();
      });
    });
  });

  describe('adminAuthMiddleware', () => {
    describe('when admin token is valid', () => {
      it('should set admin and user on request and call next', () => {
        // Arrange
        const mockAdmin = getMockAdmin();
        const token = 'valid-admin-token';
        mockRequest.headers = { authorization: `Bearer ${token}` };
        
        mockedJWTUtils.extractTokenFromHeader.mockReturnValue(token);
        mockedJWTUtils.verifyAdminToken.mockReturnValue(mockAdmin);

        // Act
        adminAuthMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

        // Assert
        expect(mockedJWTUtils.extractTokenFromHeader).toHaveBeenCalledWith(`Bearer ${token}`);
        expect(mockedJWTUtils.verifyAdminToken).toHaveBeenCalledWith(token);
        expect(mockRequest.admin).toEqual(mockAdmin);
        expect(mockRequest.user).toEqual(mockAdmin); // Should also set user for compatibility
        expect(mockNext).toHaveBeenCalled();
        expect(mockStatus).not.toHaveBeenCalled();
      });
    });

    describe('when no token is provided', () => {
      it('should return 401 with NO_ADMIN_TOKEN code', () => {
        // Arrange
        mockRequest.headers = {};
        mockedJWTUtils.extractTokenFromHeader.mockReturnValue(null);

        // Act
        adminAuthMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

        // Assert
        expect(mockStatus).toHaveBeenCalledWith(401);
        expect(mockJson).toHaveBeenCalledWith({
          success: false,
          error: 'Admin authentication required',
          code: 'NO_ADMIN_TOKEN'
        });
        expect(mockNext).not.toHaveBeenCalled();
      });
    });

    describe('when admin token is invalid', () => {
      it('should return 403 with INVALID_ADMIN_TOKEN code', () => {
        // Arrange
        const token = 'invalid-admin-token';
        mockRequest.headers = { authorization: `Bearer ${token}` };
        
        mockedJWTUtils.extractTokenFromHeader.mockReturnValue(token);
        mockedJWTUtils.verifyAdminToken.mockImplementation(() => {
          throw new Error('Invalid admin token');
        });

        // Act
        adminAuthMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

        // Assert
        expect(mockStatus).toHaveBeenCalledWith(403);
        expect(mockJson).toHaveBeenCalledWith({
          success: false,
          error: 'Invalid admin token',
          code: 'INVALID_ADMIN_TOKEN'
        });
        expect(mockNext).not.toHaveBeenCalled();
      });

      it('should handle non-Error exceptions gracefully', () => {
        // Arrange
        const token = 'invalid-admin-token';
        mockRequest.headers = { authorization: `Bearer ${token}` };
        
        mockedJWTUtils.extractTokenFromHeader.mockReturnValue(token);
        mockedJWTUtils.verifyAdminToken.mockImplementation(() => {
          throw 'Non-error exception';
        });

        // Act
        adminAuthMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

        // Assert
        expect(mockStatus).toHaveBeenCalledWith(403);
        expect(mockJson).toHaveBeenCalledWith({
          success: false,
          error: 'Admin authentication failed',
          code: 'INVALID_ADMIN_TOKEN'
        });
      });
    });
  });

  describe('requireRole', () => {
    describe('when requiring user role', () => {
      it('should call next when user has correct role', () => {
        // Arrange
        const middleware = requireRole('user');
        mockRequest.user = getMockUser({ role: 'user' });

        // Act
        middleware(mockRequest as Request, mockResponse as Response, mockNext);

        // Assert
        expect(mockNext).toHaveBeenCalled();
        expect(mockStatus).not.toHaveBeenCalled();
      });

      it('should return 403 when user has admin role but user required', () => {
        // Arrange
        const middleware = requireRole('user');
        mockRequest.user = getMockUser({ role: 'admin' });

        // Act
        middleware(mockRequest as Request, mockResponse as Response, mockNext);

        // Assert
        expect(mockStatus).toHaveBeenCalledWith(403);
        expect(mockJson).toHaveBeenCalledWith({
          success: false,
          error: 'user role required',
          code: 'INSUFFICIENT_ROLE'
        });
        expect(mockNext).not.toHaveBeenCalled();
      });
    });

    describe('when requiring admin role', () => {
      it('should call next when user has admin role', () => {
        // Arrange
        const middleware = requireRole('admin');
        mockRequest.user = getMockUser({ role: 'admin' });

        // Act
        middleware(mockRequest as Request, mockResponse as Response, mockNext);

        // Assert
        expect(mockNext).toHaveBeenCalled();
        expect(mockStatus).not.toHaveBeenCalled();
      });

      it('should return 403 when user has user role but admin required', () => {
        // Arrange
        const middleware = requireRole('admin');
        mockRequest.user = getMockUser({ role: 'user' });

        // Act
        middleware(mockRequest as Request, mockResponse as Response, mockNext);

        // Assert
        expect(mockStatus).toHaveBeenCalledWith(403);
        expect(mockJson).toHaveBeenCalledWith({
          success: false,
          error: 'admin role required',
          code: 'INSUFFICIENT_ROLE'
        });
        expect(mockNext).not.toHaveBeenCalled();
      });
    });

    describe('when no user is authenticated', () => {
      it('should return 401 when no user is set', () => {
        // Arrange
        const middleware = requireRole('user');
        mockRequest.user = undefined;

        // Act
        middleware(mockRequest as Request, mockResponse as Response, mockNext);

        // Assert
        expect(mockStatus).toHaveBeenCalledWith(401);
        expect(mockJson).toHaveBeenCalledWith({
          success: false,
          error: 'Authentication required',
          code: 'NO_AUTH'
        });
        expect(mockNext).not.toHaveBeenCalled();
      });
    });
  });

  describe('requireAdminLevel', () => {
    describe('admin level hierarchy', () => {
      it('should allow super admin for read level requirement', () => {
        // Arrange
        const middleware = requireAdminLevel('read');
        mockRequest.admin = getMockAdmin({ adminLevel: 'super' });

        // Act
        middleware(mockRequest as Request, mockResponse as Response, mockNext);

        // Assert
        expect(mockNext).toHaveBeenCalled();
        expect(mockStatus).not.toHaveBeenCalled();
      });

      it('should allow super admin for write level requirement', () => {
        // Arrange
        const middleware = requireAdminLevel('write');
        mockRequest.admin = getMockAdmin({ adminLevel: 'super' });

        // Act
        middleware(mockRequest as Request, mockResponse as Response, mockNext);

        // Assert
        expect(mockNext).toHaveBeenCalled();
        expect(mockStatus).not.toHaveBeenCalled();
      });

      it('should allow super admin for super level requirement', () => {
        // Arrange
        const middleware = requireAdminLevel('super');
        mockRequest.admin = getMockAdmin({ adminLevel: 'super' });

        // Act
        middleware(mockRequest as Request, mockResponse as Response, mockNext);

        // Assert
        expect(mockNext).toHaveBeenCalled();
        expect(mockStatus).not.toHaveBeenCalled();
      });

      it('should allow write admin for read level requirement', () => {
        // Arrange
        const middleware = requireAdminLevel('read');
        mockRequest.admin = getMockAdmin({ adminLevel: 'write' });

        // Act
        middleware(mockRequest as Request, mockResponse as Response, mockNext);

        // Assert
        expect(mockNext).toHaveBeenCalled();
        expect(mockStatus).not.toHaveBeenCalled();
      });

      it('should allow write admin for write level requirement', () => {
        // Arrange
        const middleware = requireAdminLevel('write');
        mockRequest.admin = getMockAdmin({ adminLevel: 'write' });

        // Act
        middleware(mockRequest as Request, mockResponse as Response, mockNext);

        // Assert
        expect(mockNext).toHaveBeenCalled();
        expect(mockStatus).not.toHaveBeenCalled();
      });

      it('should deny write admin for super level requirement', () => {
        // Arrange
        const middleware = requireAdminLevel('super');
        mockRequest.admin = getMockAdmin({ adminLevel: 'write' });

        // Act
        middleware(mockRequest as Request, mockResponse as Response, mockNext);

        // Assert
        expect(mockStatus).toHaveBeenCalledWith(403);
        expect(mockJson).toHaveBeenCalledWith({
          success: false,
          error: "Admin level 'super' or higher required",
          code: 'INSUFFICIENT_ADMIN_LEVEL'
        });
        expect(mockNext).not.toHaveBeenCalled();
      });

      it('should allow read admin for read level requirement', () => {
        // Arrange
        const middleware = requireAdminLevel('read');
        mockRequest.admin = getMockAdmin({ adminLevel: 'read' });

        // Act
        middleware(mockRequest as Request, mockResponse as Response, mockNext);

        // Assert
        expect(mockNext).toHaveBeenCalled();
        expect(mockStatus).not.toHaveBeenCalled();
      });

      it('should deny read admin for write level requirement', () => {
        // Arrange
        const middleware = requireAdminLevel('write');
        mockRequest.admin = getMockAdmin({ adminLevel: 'read' });

        // Act
        middleware(mockRequest as Request, mockResponse as Response, mockNext);

        // Assert
        expect(mockStatus).toHaveBeenCalledWith(403);
        expect(mockJson).toHaveBeenCalledWith({
          success: false,
          error: "Admin level 'write' or higher required",
          code: 'INSUFFICIENT_ADMIN_LEVEL'
        });
        expect(mockNext).not.toHaveBeenCalled();
      });

      it('should deny read admin for super level requirement', () => {
        // Arrange
        const middleware = requireAdminLevel('super');
        mockRequest.admin = getMockAdmin({ adminLevel: 'read' });

        // Act
        middleware(mockRequest as Request, mockResponse as Response, mockNext);

        // Assert
        expect(mockStatus).toHaveBeenCalledWith(403);
        expect(mockJson).toHaveBeenCalledWith({
          success: false,
          error: "Admin level 'super' or higher required",
          code: 'INSUFFICIENT_ADMIN_LEVEL'
        });
        expect(mockNext).not.toHaveBeenCalled();
      });
    });

    describe('when no admin is authenticated', () => {
      it('should return 403 when no admin is set', () => {
        // Arrange
        const middleware = requireAdminLevel('read');
        mockRequest.admin = undefined;

        // Act
        middleware(mockRequest as Request, mockResponse as Response, mockNext);

        // Assert
        expect(mockStatus).toHaveBeenCalledWith(403);
        expect(mockJson).toHaveBeenCalledWith({
          success: false,
          error: 'Admin authentication required',
          code: 'NO_ADMIN_AUTH'
        });
        expect(mockNext).not.toHaveBeenCalled();
      });
    });
  });


  describe('integration scenarios', () => {
    describe('middleware chain behavior', () => {
      it('should work correctly when authMiddleware is followed by requireRole', () => {
        // Arrange
        const mockUser = getMockUser({ role: 'admin' });
        const token = 'valid-token';
        mockRequest.headers = { authorization: `Bearer ${token}` };
        
        mockedJWTUtils.extractTokenFromHeader.mockReturnValue(token);
        mockedJWTUtils.verifyToken.mockReturnValue(mockUser);

        const roleMiddleware = requireRole('admin');

        // Act - First middleware
        authMiddleware(mockRequest as Request, mockResponse as Response, () => {
          // Act - Second middleware
          roleMiddleware(mockRequest as Request, mockResponse as Response, mockNext);
        });

        // Assert
        expect(mockRequest.user).toEqual(mockUser);
        expect(mockNext).toHaveBeenCalled();
        expect(mockStatus).not.toHaveBeenCalled();
      });

      it('should work correctly when adminAuthMiddleware is followed by requireAdminLevel', () => {
        // Arrange
        const mockAdmin = getMockAdmin({ adminLevel: 'super' });
        const token = 'valid-admin-token';
        mockRequest.headers = { authorization: `Bearer ${token}` };
        
        mockedJWTUtils.extractTokenFromHeader.mockReturnValue(token);
        mockedJWTUtils.verifyAdminToken.mockReturnValue(mockAdmin);

        const levelMiddleware = requireAdminLevel('write');

        // Act - First middleware
        adminAuthMiddleware(mockRequest as Request, mockResponse as Response, () => {
          // Act - Second middleware
          levelMiddleware(mockRequest as Request, mockResponse as Response, mockNext);
        });

        // Assert
        expect(mockRequest.admin).toEqual(mockAdmin);
        expect(mockRequest.user).toEqual(mockAdmin);
        expect(mockNext).toHaveBeenCalled();
        expect(mockStatus).not.toHaveBeenCalled();
      });
    });

    describe('error handling across middleware', () => {
      it('should stop middleware chain when authMiddleware fails', () => {
        // Arrange
        mockRequest.headers = {}; // No token
        mockedJWTUtils.extractTokenFromHeader.mockReturnValue(null);

        const roleMiddleware = requireRole('user');
        let roleMiddlewareCalled = false;

        // Act
        authMiddleware(mockRequest as Request, mockResponse as Response, () => {
          roleMiddlewareCalled = true;
          roleMiddleware(mockRequest as Request, mockResponse as Response, mockNext);
        });

        // Assert
        expect(roleMiddlewareCalled).toBe(false);
        expect(mockStatus).toHaveBeenCalledWith(401);
        expect(mockNext).not.toHaveBeenCalled();
      });
    });
  });
});