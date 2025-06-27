import { Router, Request, Response } from 'express';
import { adminAuthMiddleware } from '../../middleware/auth';

const router = Router();

// Admin authentication middleware
const requireAdmin = adminAuthMiddleware;

// Get email marketing metrics
router.get('/metrics', requireAdmin, async (req, res) => {
  try {
    const { campaign } = req.query;
    
    // Mock data for now - in production, query email marketing database
    const metrics = {
      totalSends: 2847,
      sendsChange: 12.5,
      opens: 1423,
      opensChange: 8.2,
      clicks: 285,
      clicksChange: -2.1,
      bounces: 34,
      bouncesChange: -15.3,
      unsubscribes: 8,
      unsubscribesChange: 0
    };

    // If specific campaign requested, adjust metrics
    if (campaign && campaign !== 'all') {
      // Scale metrics based on campaign type
      const campaignMultipliers: Record<string, number> = {
        'weekly-digest': 0.8,
        'market-alerts': 0.3,
        'pro-updates': 0.4
      };
      
      const multiplier = campaignMultipliers[campaign as string] || 1;
      Object.keys(metrics).forEach(key => {
        if (key.endsWith('Change')) return; // Skip change percentages
        (metrics as any)[key] = Math.round((metrics as any)[key] * multiplier);
      });
    }

    res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    console.error('Error fetching email metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch email metrics'
    });
  }
});

// Get email campaigns
router.get('/campaigns', requireAdmin, async (req, res) => {
  try {
    // Mock campaigns - in production, query database
    const campaigns = [
      { id: 'weekly-digest', name: 'Weekly Economic Digest' },
      { id: 'market-alerts', name: 'Market Alerts' },
      { id: 'pro-updates', name: 'Pro User Updates' },
      { id: 'onboarding', name: 'New User Onboarding' }
    ];

    res.json({
      success: true,
      data: campaigns
    });
  } catch (error) {
    console.error('Error fetching campaigns:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch campaigns'
    });
  }
});

// Get email contacts with pagination
router.get('/contacts', requireAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const campaign = req.query.campaign as string;
    
    // Mock contact data - in production, query email marketing database
    const mockContacts = [
      { id: 1, email: 'john.doe@example.com', status: 'clicked' as const, lastActivity: '2024-06-25' },
      { id: 2, email: 'jane.smith@example.com', status: 'opened' as const, lastActivity: '2024-06-24' },
      { id: 3, email: 'bob.wilson@example.com', status: 'sent' as const, lastActivity: '2024-06-23' },
      { id: 4, email: 'alice.brown@example.com', status: 'bounced' as const, lastActivity: '2024-06-22' },
      { id: 5, email: 'charlie.davis@example.com', status: 'clicked' as const, lastActivity: '2024-06-21' }
    ];

    // Filter by campaign if specified
    let filteredContacts = mockContacts;
    if (campaign && campaign !== 'all') {
      // In production, filter by actual campaign participation
      filteredContacts = mockContacts.slice(0, 3); // Mock reduced set
    }

    // Paginate
    const startIndex = (page - 1) * limit;
    const paginatedContacts = filteredContacts.slice(startIndex, startIndex + limit);

    res.json({
      success: true,
      data: {
        contacts: paginatedContacts,
        total: filteredContacts.length,
        page,
        limit,
        totalPages: Math.ceil(filteredContacts.length / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching email contacts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch email contacts'
    });
  }
});

// Get email templates
router.get('/templates', requireAdmin, async (req, res) => {
  try {
    // Mock templates - in production, query database
    const templates = [
      {
        id: 1,
        name: 'Weekly Digest Template',
        lastModified: '2024-06-20',
        thumbnail: '/api/email/templates/1/thumbnail'
      },
      {
        id: 2,
        name: 'Market Alert Template',
        lastModified: '2024-06-15',
        thumbnail: '/api/email/templates/2/thumbnail'
      },
      {
        id: 3,
        name: 'Pro User Welcome',
        lastModified: '2024-06-10',
        thumbnail: '/api/email/templates/3/thumbnail'
      }
    ];

    res.json({
      success: true,
      data: templates
    });
  } catch (error) {
    console.error('Error fetching email templates:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch email templates'
    });
  }
});

// Create resend segment for bounced emails
router.post('/resend', requireAdmin, async (req, res) => {
  try {
    const { email, campaignId } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email address is required'
      });
    }

    // Mock resend logic - in production, create actual resend segment
    console.log(`Creating resend segment for: ${email}, campaign: ${campaignId}`);
    
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 500));

    res.json({
      success: true,
      message: 'Resend segment created successfully',
      data: {
        segmentId: `resend_${Date.now()}`,
        email,
        campaignId,
        scheduledFor: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours from now
      }
    });
  } catch (error) {
    console.error('Error creating resend segment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create resend segment'
    });
  }
});

export default router;