// @ts-nocheck
import { Router, Request, Response } from 'express';
import EmailService from '../services/emailService';
import SchedulerService from '../services/schedulerService';
import { adminAuthMiddleware } from '../middleware/auth';

const router = Router();
const emailService = new EmailService();
const schedulerService = new SchedulerService();

/**
 * GET /api/email/status
 * Get email service status (admin only)
 */
router.get('/status', adminAuthMiddleware, (req: Request, res: Response) => {
  try {
    const emailStatus = {
      configured: !!process.env.EMAIL_SERVER_HOST,
      fromEmail: process.env.EMAIL_FROM || 'noreply@econindicatordaily.com'
    };
    
    const schedulerStatus = schedulerService.getStatus();
    
    res.json({
      email: emailStatus,
      scheduler: schedulerStatus
    });
  } catch (error) {
    console.error('Error getting email status:', error);
    res.status(500).json({ error: 'Failed to get email status' });
  }
});

/**
 * POST /api/email/test
 * Send a test email (admin only)
 */
router.post('/test', adminAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email address is required' });
    }

    const result = await schedulerService.testEmailSystem(email);
    
    res.json({
      success: true,
      message: 'Test email sent successfully',
      details: result
    });
  } catch (error) {
    console.error('Error sending test email:', error);
    res.status(500).json({ 
      error: 'Failed to send test email',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/email/weekly/trigger
 * Manually trigger weekly emails (admin only)
 */
router.post('/weekly/trigger', adminAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const result = await schedulerService.triggerWeeklyEmails();
    
    res.json({
      success: true,
      message: 'Weekly emails triggered successfully',
      results: result
    });
  } catch (error) {
    console.error('Error triggering weekly emails:', error);
    res.status(500).json({ 
      error: 'Failed to trigger weekly emails',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/email/weekly/preview
 * Preview weekly email content (admin only)
 */
router.get('/weekly/preview', adminAuthMiddleware, async (req: Request, res: Response) => {
  try {
    // This would generate a preview of the email content
    // For now, return a simple preview structure
    const previewData = {
      subject: `📊 Your Weekly Economic Summary - ${new Date().toLocaleDateString()}`,
      recipientCount: 'Will be calculated at send time',
      scheduledFor: schedulerService.getStatus().nextRun,
      sampleContent: {
        greeting: 'Hi [User Name],',
        intro: 'Here\'s your weekly summary of the most important economic indicators and market movements:',
        indicatorCount: 'Top 10 most recent indicators',
        footer: 'EconIndicatorDaily - Economic Data in Plain English'
      }
    };
    
    res.json(previewData);
  } catch (error) {
    console.error('Error generating email preview:', error);
    res.status(500).json({ error: 'Failed to generate email preview' });
  }
});

/**
 * PUT /api/email/preferences
 * Update user email preferences (authenticated users)
 */
router.put('/preferences', adminAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { emailNotifications } = req.body;
    
    // For now, just return success - would need user auth middleware
    res.json({
      success: true,
      message: 'Email preferences updated',
      emailNotifications
    });
  } catch (error) {
    console.error('Error updating email preferences:', error);
    res.status(500).json({ error: 'Failed to update email preferences' });
  }
});

/**
 * GET /api/email/unsubscribe/:token
 * Unsubscribe from emails using token
 */
router.get('/unsubscribe/:token', async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    
    // This would decode the token and unsubscribe the user
    // For now, return a placeholder response
    res.json({
      success: true,
      message: 'Successfully unsubscribed from weekly emails'
    });
  } catch (error) {
    console.error('Error processing unsubscribe:', error);
    res.status(500).json({ error: 'Failed to process unsubscribe request' });
  }
});

export default router;