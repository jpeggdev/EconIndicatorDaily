import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { DataSyncer } from '../../cli/syncData';
import { adminAuthMiddleware } from '../../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// Admin authentication middleware
const requireAdmin = adminAuthMiddleware;

// Force sync specific indicator
router.post('/indicators/:indicatorId', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { indicatorId } = req.params;

    const indicator = await prisma.economicIndicator.findUnique({
      where: { id: indicatorId }
    });

    if (!indicator) {
      return res.status(404).json({
        success: false,
        error: 'Indicator not found'
      });
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
router.post('/all', requireAdmin, async (req, res) => {
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
router.get('/status', requireAdmin, async (req, res) => {
  try {
    const syncer = new DataSyncer();
    const status = await syncer.getLastSyncStatus();

    // Calculate summary statistics
    const now = new Date();
    const recentlyUpdated = status.filter((s) => {
      if (!s.lastUpdate) return false;
      const hoursSince = (now.getTime() - new Date(s.lastUpdate).getTime()) / (1000 * 60 * 60);
      return hoursSince < 24;
    });

    const bySource = status.reduce((acc: Record<string, { total: number; withData: number; recentlyUpdated: number }>, item) => {
      const source = item.source || 'unknown';
      if (!acc[source]) {
        acc[source] = { total: 0, withData: 0, recentlyUpdated: 0 };
      }
      acc[source].total++;
      if (item.totalDataPoints > 0) acc[source].withData++;
      if (recentlyUpdated.includes(item)) acc[source].recentlyUpdated++;
      return acc;
    }, {} as Record<string, { total: number; withData: number; recentlyUpdated: number }>);

    res.json({
      success: true,
      data: {
        indicators: status,
        summary: {
          total: status.length,
          withData: status.filter((s) => s.totalDataPoints > 0).length,
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
router.post('/source', requireAdmin, async (req, res) => {
  try {
    const { source, force } = req.body;

    if (!source) {
      return res.status(400).json({
        success: false,
        error: 'Source parameter is required'
      });
    }

    const validSources = ['fred', 'alpha_vantage', 'bls', 'world_bank', 'finnhub', 'fmp', 'ecb', 'imf', 'polygon', 'treasury'];
    if (!validSources.includes(source)) {
      return res.status(400).json({
        success: false,
        error: `Invalid source. Valid sources: ${validSources.join(', ')}`
      });
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

export default router;