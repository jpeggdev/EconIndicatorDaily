import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { adminAuthMiddleware } from '../../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// Admin authentication middleware
const requireAdmin = adminAuthMiddleware;

// Get all indicators with management info
router.get('/', requireAdmin, async (req, res) => {
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
    const bySource = indicators.reduce((acc: Record<string, typeof indicators>, indicator) => {
      const source = indicator.source || 'unknown';
      if (!acc[source]) {
        acc[source] = [];
      }
      acc[source].push(indicator);
      return acc;
    }, {} as Record<string, typeof indicators>);

    res.json({
      success: true,
      data: {
        indicators,
        bySource,
        summary: {
          total: indicators.length,
          active: indicators.filter((i) => i.isActive).length,
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
router.patch('/:indicatorId/toggle', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { indicatorId } = req.params;

    const indicator = await prisma.economicIndicator.findUnique({
      where: { id: indicatorId },
      select: { isActive: true }
    });

    if (!indicator) {
      return res.status(404).json({
        success: false,
        error: 'Indicator not found'
      });
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

export default router;