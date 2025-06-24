import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { UserService } from '../services/userService';

const router = Router();
const prisma = new PrismaClient();
const userService = new UserService(prisma);

// Find or create user (for authentication)
router.post('/findOrCreate', async (req: any, res: any) => {
  try {
    const { email, name, image } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }
    
    const user = await userService.findOrCreateUser({
      email,
      name,
      image,
    });
    
    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Error finding/creating user:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to find or create user'
    });
  }
});

// Get current user profile
router.get('/profile/:id', async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const user = await userService.getUserById(id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Remove sensitive fields
    const { stripeCustomerId, stripeSubscriptionId, ...safeUser } = user as any;
    
    res.json({
      success: true,
      data: safeUser
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user profile'
    });
  }
});

// Get subscription status and limits
router.get('/subscription/:id', async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const limits = await userService.getSubscriptionLimits(id);
    const isActive = await userService.isSubscriptionActive(id);
    
    res.json({
      success: true,
      data: {
        ...limits,
        isActive,
      }
    });
  } catch (error) {
    console.error('Error fetching subscription info:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch subscription info'
    });
  }
});

// Update email preferences
router.patch('/preferences/:id', async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { emailNotificationsEnabled, weeklyEmailEnabled, dailyEmailEnabled } = req.body;
    
    const updatedUser = await userService.updateEmailPreferences(id, {
      emailNotificationsEnabled,
      weeklyEmailEnabled,
      dailyEmailEnabled,
    });
    
    res.json({ 
      success: true,
      message: 'Preferences updated successfully', 
      data: updatedUser 
    });
  } catch (error) {
    console.error('Error updating preferences:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update preferences'
    });
  }
});

// Check indicator access
router.get('/access/:id/:indicatorCount', async (req: any, res: any) => {
  try {
    const { id, indicatorCount } = req.params;
    const canAccess = await userService.canAccessIndicator(id, parseInt(indicatorCount));
    
    res.json({ 
      success: true,
      data: { canAccess }
    });
  } catch (error) {
    console.error('Error checking indicator access:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check access'
    });
  }
});

// Upgrade to Pro
router.post('/upgrade/:id', async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { stripeData } = req.body;
    
    const updatedUser = await userService.upgradeToPro(id, stripeData);
    
    res.json({ 
      success: true,
      message: 'Successfully upgraded to Pro', 
      data: {
        user: updatedUser,
        subscription: await userService.getSubscriptionLimits(id)
      }
    });
  } catch (error) {
    console.error('Error upgrading user:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upgrade subscription'
    });
  }
});

// Downgrade to Free
router.post('/downgrade/:id', async (req: any, res: any) => {
  try {
    const { id } = req.params;
    
    const updatedUser = await userService.downgradeToFree(id);
    
    res.json({ 
      success: true,
      message: 'Successfully downgraded to Free', 
      data: {
        user: updatedUser,
        subscription: await userService.getSubscriptionLimits(id)
      }
    });
  } catch (error) {
    console.error('Error downgrading user:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to downgrade subscription'
    });
  }
});

router.post('/preferences/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { indicatorId, alertEnabled, alertThreshold } = req.body;

    const preference = await prisma.userPreference.upsert({
      where: {
        userId_indicatorId: {
          userId,
          indicatorId
        }
      },
      update: {
        alertEnabled,
        alertThreshold
      },
      create: {
        userId,
        indicatorId,
        alertEnabled,
        alertThreshold
      }
    });

    res.json({
      success: true,
      data: preference
    });
  } catch (error) {
    console.error('Error saving user preference:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save preference'
    });
  }
});

export default router;