// @ts-nocheck
import { Router, Request, Response, RequestHandler } from 'express';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { JWTUtils } from '../utils/jwt';
import { UserService } from '../services/userService';
import { authMiddleware, optionalAuthMiddleware } from '../middleware/auth';
import { env } from '../utils/env';

const router = Router();
const prisma = new PrismaClient();
const userService = new UserService(prisma);

/**
 * Admin login endpoint
 * Validates admin email and generates JWT token
 */
const adminLoginHandler = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required',
        code: 'MISSING_CREDENTIALS'
      });
    }

    // Check if email is in admin list
    if (!JWTUtils.isAdminEmail(email)) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized for admin access',
        code: 'NOT_ADMIN'
      });
    }

    // For development, allow simple password
    // Validate admin password using secure database lookup
    const validPassword = await validateAdminPassword(email, password);

    if (!validPassword) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // Find or create user record
    let user = await userService.getUserByEmail(email);
    if (!user) {
      user = await userService.createUser({
        email,
        name: email.split('@')[0], // Use email prefix as name
      });
    }

    if (!user) {
      return res.status(500).json({
        success: false,
        error: 'Failed to create user',
        code: 'USER_CREATION_FAILED'
      });
    }

    // Generate admin token
    const adminLevel = JWTUtils.getAdminLevel(email);
    if (!adminLevel) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized for admin access',
        code: 'NOT_ADMIN'
      });
    }

    const token = JWTUtils.generateAdminToken({
      userId: user.id,
      email: user.email,
      role: 'admin',
      adminLevel: adminLevel
    });

    // Generate refresh token
    const refreshToken = JWTUtils.generateRefreshToken({
      userId: user.id,
      email: user.email,
      role: 'admin'
    });

    res.json({
      success: true,
      data: {
        token,
        refreshToken,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: 'admin',
          adminLevel: JWTUtils.getAdminLevel(email)
        },
        expiresIn: '1h'
      }
    });

  } catch (error) {
    console.error('Admin login error:', error);
    return res.status(500).json({
      success: false,
      error: 'Login failed',
      code: 'LOGIN_ERROR'
    });
  }
};

router.post('/admin/login', adminLoginHandler);

/**
 * Regular user login/register endpoint
 */
const loginHandler = async (req: Request, res: Response) => {
  try {
    const { email, name, image } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required',
        code: 'MISSING_EMAIL'
      });
    }

    // Find or create user
    const user = await userService.findOrCreateUser({
      email,
      name,
      image
    });

    // SECURITY: This endpoint should NEVER grant admin privileges
    // Admin access must only be granted through the dedicated /admin/login endpoint
    const role = 'user';

    // Generate user token only
    const token = JWTUtils.generateToken({
      userId: user.id,
      email: user.email,
      role: 'user'
    });

    const refreshToken = JWTUtils.generateRefreshToken({
      userId: user.id,
      email: user.email,
      role: 'user'
    });

    res.json({
      success: true,
      data: {
        token,
        refreshToken,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: 'user',
          subscriptionTier: user.subscriptionTier,
          subscriptionStatus: user.subscriptionStatus
        },
        expiresIn: '1h'
      }
    });

  } catch (error) {
    console.error('User login error:', error);
    return res.status(500).json({
      success: false,
      error: 'Login failed',
      code: 'LOGIN_ERROR'
    });
  }
};

router.post('/login', loginHandler);

/**
 * Token refresh endpoint
 */
const refreshHandler = async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: 'Refresh token is required',
        code: 'MISSING_REFRESH_TOKEN'
      });
    }

    // Verify refresh token
    const decoded = JWTUtils.verifyToken(refreshToken, 'econindicatordaily-refresh');

    // Get updated user data
    const user = await userService.getUserById(decoded.userId);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    // Generate new tokens
    const isAdmin = JWTUtils.isAdminEmail(user.email);
    const adminLevel = isAdmin ? JWTUtils.getAdminLevel(user.email) : null;
    
    const newToken = isAdmin && adminLevel
      ? JWTUtils.generateAdminToken({
          userId: user.id,
          email: user.email,
          role: 'admin',
          adminLevel: adminLevel
        })
      : JWTUtils.generateToken({
          userId: user.id,
          email: user.email,
          role: 'user'
        });

    const newRefreshToken = JWTUtils.generateRefreshToken({
      userId: user.id,
      email: user.email,
      role: isAdmin && adminLevel ? 'admin' : 'user'
    });

    res.json({
      success: true,
      data: {
        token: newToken,
        refreshToken: newRefreshToken,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: isAdmin && adminLevel ? 'admin' : 'user',
          subscriptionTier: user.subscriptionTier,
          subscriptionStatus: user.subscriptionStatus
        },
        expiresIn: '1h'
      }
    });

  } catch (error) {
    console.error('Token refresh error:', error);
    return res.status(401).json({
      success: false,
      error: 'Invalid refresh token',
      code: 'INVALID_REFRESH_TOKEN'
    });
  }
};

router.post('/refresh', refreshHandler);

/**
 * Logout endpoint (invalidate tokens)
 */
const logoutHandler = async (req: Request, res: Response) => {
  try {
    // In a real implementation, you'd add the token to a blacklist
    // For now, we just return success and rely on client-side token removal
    
    res.json({
      success: true,
      message: 'Logged out successfully'
    });

  } catch (error) {
    console.error('Logout error:', error);
    return res.status(500).json({
      success: false,
      error: 'Logout failed',
      code: 'LOGOUT_ERROR'
    });
  }
};

router.post('/logout', authMiddleware, logoutHandler);

/**
 * Get current user info
 */
const meHandler = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated',
        code: 'NOT_AUTHENTICATED'
      });
    }

    const user = await userService.getUserById(req.user.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    const isAdmin = JWTUtils.isAdminEmail(user.email);

    res.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: isAdmin ? 'admin' : 'user',
        subscriptionTier: user.subscriptionTier,
        subscriptionStatus: user.subscriptionStatus,
        adminLevel: isAdmin ? JWTUtils.getAdminLevel(user.email) : undefined
      }
    });

  } catch (error) {
    console.error('Get user info error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get user info',
      code: 'GET_USER_ERROR'
    });
  }
};

router.get('/me', authMiddleware, meHandler);

/**
 * Validate admin password using secure database lookup
 * SECURITY: No hardcoded credentials - all passwords stored in database with bcrypt hashing
 */
async function validateAdminPassword(email: string, password: string): Promise<boolean> {
  try {
    // Look up admin user from database
    const adminUser = await prisma.user.findFirst({
      where: {
        email: email,
        // Only check users with admin role
        OR: [
          { role: 'admin' },
          { email: { in: JWTUtils.getAdminEmails() } }
        ]
      },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        role: true
      }
    });

    // Admin user not found
    if (!adminUser || !adminUser.passwordHash) {
      // SECURITY: Do not create admin user from public endpoint
      // This should be a separate, secured setup script
      console.error(`Admin user not found or has no password hash: ${email}`);
      return false;
    }

    // Verify password using bcrypt.compare (secure)
    return await bcrypt.compare(password, adminUser.passwordHash);
  } catch (error) {
    console.error('Admin validation error:', error);
    return false;
  }
}

// SECURITY NOTE: 
// Admin user creation has been removed from the public API for security.
// Admin users should be created through a separate, secured CLI script or database initialization.
// This prevents account takeover during database resets or initial deployments.

export default router;