import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { adminAuthMiddleware } from '../../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// Admin authentication middleware
const requireAdmin = adminAuthMiddleware;

// Get all users with pagination
router.get('/', requireAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;

    const users = await prisma.user.findMany({
      where: {
        // Exclude soft-deleted users
        deletedAt: null
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
        deletedAt: null
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
router.patch('/:userId/subscription', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { subscriptionTier } = req.body;

    if (!['free', 'pro'].includes(subscriptionTier)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid subscription tier'
      });
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

    return res.json({
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
router.get('/:userId', requireAdmin, async (req, res) => {
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
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
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
router.patch('/:userId', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { name, email, subscriptionTier, subscriptionStatus } = req.body;

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (subscriptionTier !== undefined) {
      if (!['free', 'pro'].includes(subscriptionTier)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid subscription tier'
        });
      }
      updateData.subscriptionTier = subscriptionTier;
    }
    if (subscriptionStatus !== undefined) {
      if (!['active', 'canceled', 'past_due', 'incomplete'].includes(subscriptionStatus)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid subscription status'
        });
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
router.delete('/:userId', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true }
    });

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Soft delete by setting deletedAt timestamp
    await prisma.user.update({
      where: { id: userId },
      data: {
        deletedAt: new Date()
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
router.get('/search/:query', requireAdmin, async (req, res) => {
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
        deletedAt: null
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
        deletedAt: null
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
router.get('/:userId/favorites', requireAdmin, async (req, res) => {
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

export default router;