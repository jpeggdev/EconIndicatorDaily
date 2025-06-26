import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { IndicatorService } from '../services/indicatorService';
import { env } from '../utils/env';
import { DataSyncer } from '../cli/syncData';
import { adminAuthMiddleware, requireAdminLevel } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// Admin authentication middleware - SECURITY: Always use real authentication
const requireAdmin = adminAuthMiddleware;

// Get admin dashboard stats
router.get('/stats', requireAdmin, async (req, res) => {
  try {
    // Get user statistics
    const totalUsers = await prisma.user.count();
    const proUsers = await prisma.user.count({
      where: { subscriptionTier: 'pro' }
    });

    // Get indicator statistics
    const totalIndicators = await prisma.economicIndicator.count();
    const activeIndicators = await prisma.economicIndicator.count({
      where: { 
        isActive: true 
      }
    });

    // Get last sync time
    const lastSync = await prisma.economicIndicator.findFirst({
      orderBy: { updatedAt: 'desc' },
      select: { updatedAt: true }
    });

    // Check API health (mock for now)
    const apiHealth = {
      fred: true,
      alphaVantage: true,
      sec: false, // Mock as down
      rapidapi: true,
      treasury: true,
    };

    res.json({
      success: true,
      data: {
        totalUsers,
        proUsers,
        totalIndicators,
        activeIndicators,
        lastSync: lastSync?.updatedAt || new Date(),
        apiHealth
      }
    });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch admin statistics'
    });
  }
});

// Get all users with pagination
router.get('/users', requireAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;

    const users = await prisma.user.findMany({
      where: {
        // Exclude soft-deleted users
        email: {
          not: {
            startsWith: 'deleted_'
          }
        }
      },
      skip: offset,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
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
      }
    });

    const totalUsers = await prisma.user.count({
      where: {
        email: {
          not: {
            startsWith: 'deleted_'
          }
        }
      }
    });

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          page,
          limit,
          total: totalUsers,
          totalPages: Math.ceil(totalUsers / limit)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch users'
    });
  }
});

// Update user subscription
router.patch('/users/:userId/subscription', requireAdmin, async (req: any, res: any) => {
  try {
    const { userId } = req.params;
    const { subscriptionTier } = req.body;

    if (!['free', 'pro'].includes(subscriptionTier)) {
      res.status(400).json({
        success: false,
        error: 'Invalid subscription tier'
      });
      return;
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { subscriptionTier },
      select: {
        id: true,
        email: true,
        subscriptionTier: true,
      }
    });

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Error updating user subscription:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update user subscription'
    });
  }
});

// Get detailed user information
router.get('/users/:userId', requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
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
      }
    });

    if (!user) {
      res.status(404).json({
        success: false,
        error: 'User not found'
      });
      return;
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Error fetching user details:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user details'
    });
  }
});

// Update user details
router.patch('/users/:userId', requireAdmin, async (req: any, res: any) => {
  try {
    const { userId } = req.params;
    const { name, email, subscriptionTier, subscriptionStatus } = req.body;

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (subscriptionTier !== undefined) {
      if (!['free', 'pro'].includes(subscriptionTier)) {
        res.status(400).json({
          success: false,
          error: 'Invalid subscription tier'
        });
        return;
      }
      updateData.subscriptionTier = subscriptionTier;
    }
    if (subscriptionStatus !== undefined) {
      if (!['active', 'canceled', 'past_due', 'incomplete'].includes(subscriptionStatus)) {
        res.status(400).json({
          success: false,
          error: 'Invalid subscription status'
        });
        return;
      }
      updateData.subscriptionStatus = subscriptionStatus;
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        subscriptionTier: true,
        subscriptionStatus: true,
        updatedAt: true
      }
    });

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update user'
    });
  }
});

// Delete user (soft delete by setting email to deleted state)
router.delete('/users/:userId', requireAdmin, async (req: any, res: any) => {
  try {
    const { userId } = req.params;

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true }
    });

    if (!existingUser) {
      res.status(404).json({
        success: false,
        error: 'User not found'
      });
      return;
    }

    // Soft delete by updating email and marking as deleted
    const timestamp = Date.now();
    await prisma.user.update({
      where: { id: userId },
      data: {
        email: `deleted_${timestamp}_${existingUser.email}`,
        name: 'Deleted User',
        subscriptionTier: 'free',
        subscriptionStatus: 'canceled'
      }
    });

    // Also delete user favorites
    await prisma.userPreference.deleteMany({
      where: { userId }
    });

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete user'
    });
  }
});

// Search users
router.get('/users/search/:query', requireAdmin, async (req, res) => {
  try {
    const { query } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;

    const users = await prisma.user.findMany({
      where: {
        OR: [
          {
            email: {
              contains: query
            }
          },
          {
            name: {
              contains: query
            }
          }
        ],
        // Exclude soft-deleted users
        email: {
          not: {
            startsWith: 'deleted_'
          }
        }
      },
      skip: offset,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        name: true,
        subscriptionTier: true,
        subscriptionStatus: true,
        createdAt: true,
        lastLoginAt: true,
      }
    });

    const totalUsers = await prisma.user.count({
      where: {
        OR: [
          {
            email: {
              contains: query
            }
          },
          {
            name: {
              contains: query
            }
          }
        ],
        email: {
          not: {
            startsWith: 'deleted_'
          }
        }
      }
    });

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          page,
          limit,
          total: totalUsers,
          totalPages: Math.ceil(totalUsers / limit)
        }
      }
    });
  } catch (error) {
    console.error('Error searching users:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search users'
    });
  }
});

// Get user activity/favorites
router.get('/users/:userId/favorites', requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;

    const favorites = await prisma.userPreference.findMany({
      where: { 
        userId,
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

    res.json({
      success: true,
      data: favorites
    });
  } catch (error) {
    console.error('Error fetching user favorites:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user favorites'
    });
  }
});

// Get all indicators with management info
router.get('/indicators', requireAdmin, async (req, res) => {
  try {
    const indicators = await prisma.economicIndicator.findMany({
      orderBy: [
        { isActive: 'desc' },
        { name: 'asc' }
      ],
      select: {
        id: true,
        name: true,
        source: true,
        frequency: true,
        category: true,
        isActive: true,
        updatedAt: true,
        description: true,
      }
    });

    // Group by source
    const bySource = indicators.reduce((acc: any, indicator) => {
      const source = indicator.source || 'unknown';
      if (!acc[source]) {
        acc[source] = [];
      }
      acc[source].push(indicator);
      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        indicators,
        bySource,
        summary: {
          total: indicators.length,
          active: indicators.filter((i: any) => i.isActive).length,
          withData: indicators.length, // Mock for now since we don't have latestValue
        }
      }
    });
  } catch (error) {
    console.error('Error fetching indicators:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch indicators'
    });
  }
});

// Toggle indicator active status
router.patch('/indicators/:indicatorId/toggle', requireAdmin, async (req: any, res: any) => {
  try {
    const { indicatorId } = req.params;

    const indicator = await prisma.economicIndicator.findUnique({
      where: { id: indicatorId },
      select: { isActive: true }
    });

    if (!indicator) {
      res.status(404).json({
        success: false,
        error: 'Indicator not found'
      });
      return;
    }

    const updated = await prisma.economicIndicator.update({
      where: { id: indicatorId },
      data: { isActive: !indicator.isActive },
      select: {
        id: true,
        name: true,
        isActive: true,
      }
    });

    res.json({
      success: true,
      data: updated
    });
  } catch (error) {
    console.error('Error toggling indicator:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to toggle indicator status'
    });
  }
});

// Force sync specific indicator
router.post('/indicators/:indicatorId/sync', requireAdmin, async (req: any, res: any) => {
  try {
    const { indicatorId } = req.params;

    const indicator = await prisma.economicIndicator.findUnique({
      where: { id: indicatorId }
    });

    if (!indicator) {
      res.status(404).json({
        success: false,
        error: 'Indicator not found'
      });
      return;
    }

    // Initialize DataSyncer and sync specific indicator
    const syncer = new DataSyncer();
    const results = await syncer.sync({
      indicators: [indicator.name],
      force: true,
      verbose: false
    });

    const result = results[0];
    if (result?.success) {
      res.json({
        success: true,
        message: `Successfully synced ${indicator.name}`,
        data: {
          dataPoints: result.dataPoints,
          duration: result.duration
        }
      });
    } else {
      res.status(500).json({
        success: false,
        error: result?.error || 'Sync failed for unknown reason'
      });
    }
  } catch (error) {
    console.error('Error syncing indicator:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to sync indicator'
    });
  }
});

// Force sync all indicators
router.post('/sync-all', requireAdmin, async (req, res) => {
  try {
    const { source, force } = req.body;
    
    // Initialize DataSyncer and run full sync
    const syncer = new DataSyncer();
    
    // Start sync in background (don't await to avoid timeout)
    syncer.sync({
      source: source || 'all',
      force: force || false,
      verbose: true
    }).catch(error => {
      console.error('Background sync failed:', error);
    });
    
    res.json({
      success: true,
      message: 'Full sync initiated - check sync status for progress'
    });
  } catch (error) {
    console.error('Error initiating full sync:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to initiate full sync'
    });
  }
});

// Get sync status for all indicators
router.get('/sync-status', requireAdmin, async (req, res) => {
  try {
    const syncer = new DataSyncer();
    const status = await syncer.getLastSyncStatus();

    // Calculate summary statistics
    const now = new Date();
    const recentlyUpdated = status.filter((s: any) => {
      if (!s.lastUpdate) return false;
      const hoursSince = (now.getTime() - new Date(s.lastUpdate).getTime()) / (1000 * 60 * 60);
      return hoursSince < 24;
    });

    const bySource = status.reduce((acc: any, item: any) => {
      const source = item.source || 'unknown';
      if (!acc[source]) {
        acc[source] = { total: 0, withData: 0, recentlyUpdated: 0 };
      }
      acc[source].total++;
      if (item.totalDataPoints > 0) acc[source].withData++;
      if (recentlyUpdated.includes(item)) acc[source].recentlyUpdated++;
      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        indicators: status,
        summary: {
          total: status.length,
          withData: status.filter((s: any) => s.totalDataPoints > 0).length,
          recentlyUpdated: recentlyUpdated.length,
          needingUpdate: status.length - recentlyUpdated.length
        },
        bySource
      }
    });
  } catch (error) {
    console.error('Error fetching sync status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch sync status'
    });
  }
});

// Sync by source
router.post('/sync-source', requireAdmin, async (req, res) => {
  try {
    const { source, force } = req.body;

    if (!source) {
      res.status(400).json({
        success: false,
        error: 'Source parameter is required'
      });
      return;
    }

    const validSources = ['fred', 'alpha_vantage', 'bls', 'world_bank', 'finnhub', 'fmp', 'ecb', 'imf', 'polygon', 'treasury'];
    if (!validSources.includes(source)) {
      res.status(400).json({
        success: false,
        error: `Invalid source. Valid sources: ${validSources.join(', ')}`
      });
      return;
    }

    const syncer = new DataSyncer();
    
    // Start sync in background
    syncer.sync({
      source,
      force: force || false,
      verbose: true
    }).catch(error => {
      console.error(`Background sync failed for ${source}:`, error);
    });

    res.json({
      success: true,
      message: `Sync initiated for ${source} - check sync status for progress`
    });
  } catch (error) {
    console.error('Error initiating source sync:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to initiate source sync'
    });
  }
});

// Get system settings
router.get('/settings', requireAdmin, async (req, res) => {
  try {
    // Mock system settings - in production, store in database
    const settings = {
      syncInterval: '24h',
      maxFreeIndicators: 5,
      enableNewRegistrations: true,
      maintenanceMode: false,
      apiRateLimits: {
        fred: 120, // requests per hour
        alphaVantage: 500,
        sec: 36000, // 10 per second
      }
    };

    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch settings'
    });
  }
});

// Update system settings
router.patch('/settings', requireAdmin, async (req, res) => {
  try {
    const { settings } = req.body;
    
    // TODO: Validate and save settings to database
    // For now, just return success
    
    res.json({
      success: true,
      message: 'Settings updated successfully'
    });
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update settings'
    });
  }
});

export default router;