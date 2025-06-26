import * as jwt from 'jsonwebtoken';
import { env } from './env';

export interface JWTPayload {
  userId: string;
  email: string;
  role: 'user' | 'admin';
  iat?: number;
  exp?: number;
}

export interface AdminJWTPayload extends JWTPayload {
  role: 'admin';
  adminLevel: 'read' | 'write' | 'super';
}

export class JWTUtils {
  private static readonly ACCESS_TOKEN_EXPIRY = '1h';
  private static readonly REFRESH_TOKEN_EXPIRY = '7d';

  /**
   * Generate a JWT token for a user
   */
  static generateToken(payload: Omit<JWTPayload, 'iat' | 'exp'>, expiresIn: string = this.ACCESS_TOKEN_EXPIRY): string {
    return (jwt as any).sign(payload, env.JWT_SECRET || 'test-secret', {
      expiresIn: expiresIn,
      issuer: 'econindicatordaily',
      audience: 'econindicatordaily-users'
    });
  }

  /**
   * Generate an admin JWT token with elevated privileges
   */
  static generateAdminToken(
    payload: Omit<AdminJWTPayload, 'iat' | 'exp'>, 
    expiresIn: string = this.ACCESS_TOKEN_EXPIRY
  ): string {
    return (jwt as any).sign(payload, env.JWT_SECRET || 'test-secret', {
      expiresIn: expiresIn,
      issuer: 'econindicatordaily',
      audience: 'econindicatordaily-admin'
    });
  }

  /**
   * Generate a refresh token
   */
  static generateRefreshToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
    return (jwt as any).sign(payload, env.JWT_SECRET || 'test-secret', {
      expiresIn: this.REFRESH_TOKEN_EXPIRY,
      issuer: 'econindicatordaily',
      audience: 'econindicatordaily-refresh'
    });
  }

  /**
   * Verify and decode a JWT token
   */
  static verifyToken(token: string, audience: string = 'econindicatordaily-users'): JWTPayload {
    try {
      const decoded = jwt.verify(token, env.JWT_SECRET || 'test-secret', {
        issuer: 'econindicatordaily',
        audience
      }) as JWTPayload;

      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Token has expired');
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid token');
      }
      throw new Error('Token verification failed');
    }
  }

  /**
   * Verify an admin token specifically
   */
  static verifyAdminToken(token: string): AdminJWTPayload {
    try {
      const decoded = jwt.verify(token, env.JWT_SECRET || 'test-secret', {
        issuer: 'econindicatordaily',
        audience: 'econindicatordaily-admin'
      }) as AdminJWTPayload;

      if (decoded.role !== 'admin') {
        throw new Error('Token is not an admin token');
      }

      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Admin token has expired');
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid admin token');
      }
      throw new Error('Admin token verification failed');
    }
  }

  /**
   * Extract token from Authorization header
   */
  static extractTokenFromHeader(authHeader?: string): string | null {
    if (!authHeader) return null;
    
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return null;
    }
    
    return parts[1];
  }

  /**
   * Check if user is admin based on email
   */
  static isAdminEmail(email: string): boolean {
    return env.ADMIN_EMAILS.includes(email.toLowerCase());
  }

  /**
   * Get list of admin emails
   */
  static getAdminEmails(): string[] {
    return env.ADMIN_EMAILS;
  }

  /**
   * Determine admin level based on email
   */
  static getAdminLevel(email: string): 'read' | 'write' | 'super' | null {
    if (!this.isAdminEmail(email)) {
      return null;
    }
    // For now, all admin emails get 'super' access
    // In the future, this could be configurable per email
    return 'super';
  }

  /**
   * Check if token is expired without throwing
   */
  static isTokenExpired(token: string): boolean {
    try {
      jwt.verify(token, env.JWT_SECRET || 'test-secret');
      return false;
    } catch (error) {
      return error instanceof jwt.TokenExpiredError;
    }
  }

  /**
   * Decode token without verification (for debugging)
   */
  static decodeToken(token: string): any {
    return jwt.decode(token);
  }

  /**
   * Generate a temporary admin session token (short-lived)
   */
  static generateTempAdminToken(email: string, userId: string): string {
    if (!this.isAdminEmail(email)) {
      throw new Error('Email is not authorized for admin access');
    }

    return this.generateAdminToken({
      userId,
      email,
      role: 'admin',
      adminLevel: this.getAdminLevel(email)
    }, '15m'); // Short-lived for initial login
  }
}