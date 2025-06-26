import { Request, Response, NextFunction } from 'express';
import { JWTUtils, JWTPayload, AdminJWTPayload } from '../utils/jwt';

// Extend Express Request to include user data
declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
      admin?: AdminJWTPayload;
    }
  }
}

/**
 * Basic authentication middleware for user endpoints
 */
export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = JWTUtils.extractTokenFromHeader(req.headers.authorization);
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'NO_TOKEN'
      });
    }

    const user = JWTUtils.verifyToken(token);
    req.user = user;
    
    next();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Authentication failed';
    
    return res.status(401).json({
      success: false,
      error: message,
      code: 'INVALID_TOKEN'
    });
  }
};

/**
 * Optional authentication middleware - sets user if token is valid, but doesn't require it
 */
export const optionalAuthMiddleware = (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = JWTUtils.extractTokenFromHeader(req.headers.authorization);
    
    if (token) {
      const user = JWTUtils.verifyToken(token);
      req.user = user;
    }
    
    next();
  } catch (error) {
    // For optional auth, we don't fail - just continue without user
    next();
  }
};

/**
 * Admin authentication middleware - requires valid admin token
 */
export const adminAuthMiddleware = (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = JWTUtils.extractTokenFromHeader(req.headers.authorization);
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Admin authentication required',
        code: 'NO_ADMIN_TOKEN'
      });
    }

    const admin = JWTUtils.verifyAdminToken(token);
    req.admin = admin;
    req.user = admin; // Also set user for compatibility
    
    next();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Admin authentication failed';
    
    return res.status(403).json({
      success: false,
      error: message,
      code: 'INVALID_ADMIN_TOKEN'
    });
  }
};

/**
 * Role-based middleware factory
 */
export const requireRole = (role: 'user' | 'admin') => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'NO_AUTH'
      });
    }

    if (req.user.role !== role) {
      return res.status(403).json({
        success: false,
        error: `${role} role required`,
        code: 'INSUFFICIENT_ROLE'
      });
    }

    next();
  };
};

/**
 * Admin level middleware factory
 */
export const requireAdminLevel = (minLevel: 'read' | 'write' | 'super') => {
  const levelHierarchy = { read: 1, write: 2, super: 3 };
  
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.admin) {
      return res.status(403).json({
        success: false,
        error: 'Admin authentication required',
        code: 'NO_ADMIN_AUTH'
      });
    }

    const userLevel = levelHierarchy[req.admin.adminLevel];
    const requiredLevel = levelHierarchy[minLevel];

    if (userLevel < requiredLevel) {
      return res.status(403).json({
        success: false,
        error: `Admin level '${minLevel}' or higher required`,
        code: 'INSUFFICIENT_ADMIN_LEVEL'
      });
    }

    next();
  };
};

