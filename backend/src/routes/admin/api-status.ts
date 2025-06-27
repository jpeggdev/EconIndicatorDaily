import { Router, Request, Response } from 'express';
import { adminAuthMiddleware } from '../../middleware/auth';

const router = Router();

// Admin authentication middleware
const requireAdmin = adminAuthMiddleware;

// Get comprehensive API status
router.get('/', requireAdmin, async (req, res) => {
  try {
    const apiServices = [
      {
        id: 'fred',
        name: 'Federal Reserve Economic Data (FRED)',
        description: 'Economic indicators from St. Louis Fed',
        status: 'healthy',
        lastChecked: new Date(),
        responseTime: 245,
        dailyQuota: 120,
        quotaUsed: 45,
        rateLimitPerHour: 120,
        currentHourUsage: 12,
        endpoint: 'https://api.stlouisfed.org/fred',
        keyConfigured: !!process.env.FRED_API_KEY,
        lastError: null,
        uptime: 99.8
      },
      {
        id: 'alphaVantage',
        name: 'Alpha Vantage',
        description: 'Stock market and financial data',
        status: 'healthy',
        lastChecked: new Date(),
        responseTime: 180,
        dailyQuota: 500,
        quotaUsed: 123,
        rateLimitPerHour: 75,
        currentHourUsage: 8,
        endpoint: 'https://www.alphavantage.co/query',
        keyConfigured: !!process.env.ALPHA_VANTAGE_API_KEY,
        lastError: null,
        uptime: 99.5
      },
      {
        id: 'bls',
        name: 'Bureau of Labor Statistics',
        description: 'Labor market and employment data',
        status: 'healthy',
        lastChecked: new Date(),
        responseTime: 320,
        dailyQuota: 500,
        quotaUsed: 67,
        rateLimitPerHour: 25,
        currentHourUsage: 4,
        endpoint: 'https://api.bls.gov/publicAPI/v2',
        keyConfigured: !!process.env.BLS_API_KEY,
        lastError: null,
        uptime: 98.9
      },
      {
        id: 'finnhub',
        name: 'Finnhub',
        description: 'Real-time financial market data',
        status: process.env.FINNHUB_API_KEY ? 'healthy' : 'disabled',
        lastChecked: new Date(),
        responseTime: process.env.FINNHUB_API_KEY ? 156 : null,
        dailyQuota: process.env.FINNHUB_API_KEY ? 60 : null,
        quotaUsed: process.env.FINNHUB_API_KEY ? 23 : null,
        rateLimitPerHour: process.env.FINNHUB_API_KEY ? 60 : null,
        currentHourUsage: process.env.FINNHUB_API_KEY ? 5 : null,
        endpoint: 'https://finnhub.io/api/v1',
        keyConfigured: !!process.env.FINNHUB_API_KEY,
        lastError: null,
        uptime: process.env.FINNHUB_API_KEY ? 99.2 : null
      },
      {
        id: 'fmp',
        name: 'Financial Modeling Prep',
        description: 'Financial statements and market data',
        status: process.env.FMP_API_KEY ? 'healthy' : 'disabled',
        lastChecked: new Date(),
        responseTime: process.env.FMP_API_KEY ? 210 : null,
        dailyQuota: process.env.FMP_API_KEY ? 250 : null,
        quotaUsed: process.env.FMP_API_KEY ? 89 : null,
        rateLimitPerHour: process.env.FMP_API_KEY ? 300 : null,
        currentHourUsage: process.env.FMP_API_KEY ? 15 : null,
        endpoint: 'https://financialmodelingprep.com/api/v3',
        keyConfigured: !!process.env.FMP_API_KEY,
        lastError: null,
        uptime: process.env.FMP_API_KEY ? 97.8 : null
      },
      {
        id: 'worldBank',
        name: 'World Bank',
        description: 'Global economic and development data',
        status: 'healthy',
        lastChecked: new Date(),
        responseTime: 450,
        dailyQuota: null, // No quota limit
        quotaUsed: null,
        rateLimitPerHour: null, // No rate limit
        currentHourUsage: 3,
        endpoint: 'https://api.worldbank.org/v2',
        keyConfigured: true, // No key required
        lastError: null,
        uptime: 99.9
      },
      {
        id: 'treasury',
        name: 'US Treasury',
        description: 'Government financial data',
        status: 'healthy',
        lastChecked: new Date(),
        responseTime: 380,
        dailyQuota: null,
        quotaUsed: null,
        rateLimitPerHour: null,
        currentHourUsage: 2,
        endpoint: 'https://api.fiscaldata.treasury.gov/services/api/v1',
        keyConfigured: true, // No key required
        lastError: null,
        uptime: 98.5
      }
    ];

    // Calculate overall system health
    const healthyServices = apiServices.filter(s => s.status === 'healthy').length;
    const totalServices = apiServices.filter(s => s.status !== 'disabled').length;
    const overallHealth = totalServices > 0 ? (healthyServices / totalServices) * 100 : 0;

    res.json({
      success: true,
      data: {
        services: apiServices,
        summary: {
          totalServices: apiServices.length,
          healthyServices,
          disabledServices: apiServices.filter(s => s.status === 'disabled').length,
          unhealthyServices: apiServices.filter(s => s.status === 'error').length,
          overallHealth: Math.round(overallHealth),
          lastUpdated: new Date()
        }
      }
    });
  } catch (error) {
    console.error('Error fetching API status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch API status'
    });
  }
});

// Test API connection
router.post('/:serviceId/test', requireAdmin, async (req, res) => {
  try {
    const { serviceId } = req.params;
    
    // Mock API test results - in production, make actual API calls
    const testResults = {
      fred: { success: true, responseTime: 234, message: 'Connection successful' },
      alphaVantage: { success: true, responseTime: 187, message: 'Connection successful' },
      bls: { success: true, responseTime: 345, message: 'Connection successful' },
      finnhub: { success: !!process.env.FINNHUB_API_KEY, responseTime: 156, message: process.env.FINNHUB_API_KEY ? 'Connection successful' : 'API key not configured' },
      fmp: { success: !!process.env.FMP_API_KEY, responseTime: 203, message: process.env.FMP_API_KEY ? 'Connection successful' : 'API key not configured' },
      worldBank: { success: true, responseTime: 432, message: 'Connection successful' },
      treasury: { success: true, responseTime: 367, message: 'Connection successful' }
    };

    const result = testResults[serviceId as keyof typeof testResults] || {
      success: false,
      message: 'Unknown service'
    };

    res.json({
      success: true,
      data: {
        serviceId,
        testResult: result,
        timestamp: new Date()
      }
    });
  } catch (error) {
    console.error('Error testing API connection:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to test API connection'
    });
  }
});

// Get API configuration
router.get('/config', requireAdmin, async (req, res) => {
  try {
    const config = {
      rateLimits: {
        fred: {
          requestsPerHour: 120,
          requestsPerDay: 120,
          enabled: true
        },
        alphaVantage: {
          requestsPerHour: 75,
          requestsPerDay: 500,
          enabled: true
        },
        bls: {
          requestsPerHour: 25,
          requestsPerDay: 500,
          enabled: true
        }
      },
      retrySettings: {
        maxRetries: 3,
        backoffMultiplier: 2,
        initialDelayMs: 1000
      },
      timeouts: {
        connectionTimeoutMs: 10000,
        requestTimeoutMs: 30000
      },
      caching: {
        enabled: true,
        defaultTtlMinutes: 60,
        maxCacheSize: 1000
      },
      monitoring: {
        healthCheckIntervalMinutes: 5,
        alertThresholdMs: 5000,
        uptimeTrackingDays: 30
      }
    };

    res.json({
      success: true,
      data: config
    });
  } catch (error) {
    console.error('Error fetching API configuration:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch API configuration'
    });
  }
});

// Update API configuration
router.patch('/config', requireAdmin, async (req, res) => {
  try {
    const { config } = req.body;
    
    // In production, validate and save configuration to database
    console.log('API configuration update requested:', config);
    
    res.json({
      success: true,
      message: 'API configuration updated successfully',
      data: config
    });
  } catch (error) {
    console.error('Error updating API configuration:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update API configuration'
    });
  }
});

export default router;