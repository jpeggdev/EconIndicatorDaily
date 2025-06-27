import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { adminAuthMiddleware } from '../../middleware/auth';

// Import sub-routers
import usersRouter from './users';
import indicatorsRouter from './indicators';
import syncRouter from './sync';
import emailRouter from './email';
import apiStatusRouter from './api-status';

const router = Router();
const prisma = new PrismaClient();

// Admin authentication middleware
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

// Mount sub-routers
router.use('/users', usersRouter);
router.use('/indicators', indicatorsRouter);
router.use('/sync', syncRouter);
router.use('/email', emailRouter);
router.use('/api-status', apiStatusRouter);

export default router;