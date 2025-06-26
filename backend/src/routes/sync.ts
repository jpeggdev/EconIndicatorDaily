// @ts-nocheck
import { Router, Request, Response, NextFunction } from 'express';
import { backgroundWorker } from '../services/backgroundWorker';
import { adminAuthMiddleware, requireAdminLevel } from '../middleware/auth';

const router = Router();

// Simple admin middleware wrapper for TypeScript compatibility
const adminMiddleware = (req: Request, res: Response, next: NextFunction) => {
  return adminAuthMiddleware(req, res, next);
};

const writeAdminMiddleware = (req: Request, res: Response, next: NextFunction) => {
  return requireAdminLevel('write')(req, res, next);
};

// Get sync status - PROTECTED: Admin authentication required
router.get('/status', adminMiddleware, writeAdminMiddleware, async (req, res) => {
  try {
    const status = backgroundWorker.getStatus();
    res.json(status);
  } catch (error) {
    console.error('Failed to get sync status:', error);
    res.status(500).json({ error: 'Failed to get sync status' });
  }
});

// Trigger manual sync - PROTECTED: Admin authentication required
router.post('/trigger', adminMiddleware, writeAdminMiddleware, async (req, res) => {
  try {
    const { source } = req.body;
    const result = await backgroundWorker.triggerSync(source);
    res.json(result);
  } catch (error) {
    console.error('Failed to trigger sync:', error);
    res.status(500).json({ error: 'Failed to trigger sync' });
  }
});

// Start background worker - PROTECTED: Admin authentication required
router.post('/start', adminMiddleware, writeAdminMiddleware, async (req, res) => {
  try {
    backgroundWorker.start();
    res.json({ message: 'Background worker started' });
  } catch (error) {
    console.error('Failed to start background worker:', error);
    res.status(500).json({ error: 'Failed to start background worker' });
  }
});

// Stop background worker - PROTECTED: Admin authentication required
router.post('/stop', adminMiddleware, writeAdminMiddleware, async (req, res) => {
  try {
    backgroundWorker.stop();
    res.json({ message: 'Background worker stopped' });
  } catch (error) {
    console.error('Failed to stop background worker:', error);
    res.status(500).json({ error: 'Failed to stop background worker' });
  }
});

export default router;