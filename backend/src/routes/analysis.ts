import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { AnalysisService } from '../services/analysisService';
import { authMiddleware } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();
const analysisService = new AnalysisService(prisma);

// Cache for analysis results (simple in-memory cache)
const analysisCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 1000 * 60 * 15; // 15 minutes

function getCachedResult(key: string) {
  const cached = analysisCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }
  return null;
}

function setCachedResult(key: string, data: any) {
  analysisCache.set(key, { data, timestamp: Date.now() });
}

// GET /api/analysis/insights - Get AI-generated insights for all indicators
router.get('/insights', async (req: any, res: any) => {
  try {
    const cacheKey = 'all_insights';
    const cached = getCachedResult(cacheKey);
    if (cached) {
      return res.json({ success: true, data: cached, cached: true });
    }

    // Get all active indicators
    const indicators = await prisma.economicIndicator.findMany({
      where: { isActive: true },
      select: { name: true }
    });

    const insights = [];
    
    // Generate insights for key indicators (limit to avoid overwhelming)
    const keyIndicators = indicators.slice(0, 10);
    
    for (const indicator of keyIndicators) {
      try {
        const insight = await analysisService.generateEconomicInsight(indicator.name);
        if (insight) {
          insights.push(insight);
        }
      } catch (error) {
        console.error(`Failed to generate insight for ${indicator.name}:`, error);
      }
    }

    // Sort by significance
    insights.sort((a, b) => {
      const significanceOrder = { 'critical': 4, 'high': 3, 'medium': 2, 'low': 1 };
      return significanceOrder[b.significance] - significanceOrder[a.significance];
    });

    setCachedResult(cacheKey, insights);
    res.json({ success: true, data: insights });

  } catch (error) {
    console.error('Error generating insights:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to generate economic insights' 
    });
  }
});

// GET /api/analysis/insights/:indicatorName - Get insight for specific indicator
router.get('/insights/:indicatorName', async (req: any, res: any) => {
  try {
    const { indicatorName } = req.params;
    const cacheKey = `insight_${indicatorName}`;
    const cached = getCachedResult(cacheKey);
    
    if (cached) {
      return res.json({ success: true, data: cached, cached: true });
    }

    const insight = await analysisService.generateEconomicInsight(indicatorName);
    
    if (!insight) {
      return res.status(404).json({
        success: false,
        error: 'Indicator not found or insufficient data'
      });
    }

    setCachedResult(cacheKey, insight);
    res.json({ success: true, data: insight });

  } catch (error) {
    console.error('Error generating insight:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate insight'
    });
  }
});

// GET /api/analysis/health-score - Get Economic Health Score
router.get('/health-score', async (req: any, res: any) => {
  try {
    const cacheKey = 'health_score';
    const cached = getCachedResult(cacheKey);
    
    if (cached) {
      return res.json({ success: true, data: cached, cached: true });
    }

    const healthScore = await analysisService.calculateEconomicHealthScore();
    
    setCachedResult(cacheKey, healthScore);
    res.json({ success: true, data: healthScore });

  } catch (error) {
    console.error('Error calculating health score:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to calculate economic health score'
    });
  }
});

// GET /api/analysis/correlations - Get Smart Correlation Analysis
router.get('/correlations', async (req: any, res: any) => {
  try {
    const cacheKey = 'correlations';
    const cached = getCachedResult(cacheKey);
    
    if (cached) {
      return res.json({ success: true, data: cached, cached: true });
    }

    const correlations = await analysisService.analyzeCorrelations();
    
    setCachedResult(cacheKey, correlations);
    res.json({ success: true, data: correlations });

  } catch (error) {
    console.error('Error analyzing correlations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to analyze correlations'
    });
  }
});

// GET /api/analysis/summary - Get comprehensive analysis summary
router.get('/summary', async (req: any, res: any) => {
  try {
    const cacheKey = 'analysis_summary';
    const cached = getCachedResult(cacheKey);
    
    if (cached) {
      return res.json({ success: true, data: cached, cached: true });
    }

    // Get all analysis components
    const [healthScore, correlations] = await Promise.all([
      analysisService.calculateEconomicHealthScore(),
      analysisService.analyzeCorrelations()
    ]);

    // Get top insights for key indicators
    const keyIndicatorInsights = [];
    const keyIndicators = ['Unemployment Rate', 'Consumer Price Index', 'Real GDP', 'S&P 500'];
    
    for (const indicatorName of keyIndicators) {
      try {
        const insight = await analysisService.generateEconomicInsight(indicatorName);
        if (insight) {
          keyIndicatorInsights.push(insight);
        }
      } catch (error) {
        console.error(`Failed to generate insight for ${indicatorName}:`, error);
      }
    }

    const summary = {
      healthScore,
      topCorrelations: correlations.slice(0, 5),
      keyInsights: keyIndicatorInsights,
      lastUpdated: new Date(),
      dataQuality: 85 // Simple static value - could be calculated based on data freshness
    };

    setCachedResult(cacheKey, summary);
    res.json({ success: true, data: summary });

  } catch (error) {
    console.error('Error generating analysis summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate analysis summary'
    });
  }
});

// POST /api/analysis/refresh-cache - Refresh analysis cache (admin endpoint)
router.post('/refresh-cache', async (req: any, res: any) => {
  try {
    // Clear all cached results
    analysisCache.clear();
    
    return res.json({ 
      success: true, 
      message: 'Analysis cache cleared successfully' 
    });

  } catch (error) {
    console.error('Error refreshing cache:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to refresh cache'
    });
  }
});

// GET /api/analysis/market-signals - Get market signals and warnings
router.get('/market-signals', async (req: any, res: any) => {
  try {
    const cacheKey = 'market_signals';
    const cached = getCachedResult(cacheKey);
    
    if (cached) {
      return res.json({ success: true, data: cached, cached: true });
    }

    // Simple market signals based on current data
    const healthScore = await analysisService.calculateEconomicHealthScore();
    const correlations = await analysisService.analyzeCorrelations();
    
    const signals = [];
    
    // Recession risk signal
    if (healthScore.overallScore < 40) {
      signals.push({
        type: 'recession_risk',
        strength: 100 - healthScore.overallScore,
        confidence: 75,
        narrative: 'Economic health score indicates elevated recession risk based on multiple deteriorating indicators.',
        triggerIndicators: ['Overall Health Score'],
        historicalPrecedent: 'Similar conditions preceded economic downturns in historical data.'
      });
    }

    // High correlation signal
    const strongCorrelations = correlations.filter(c => Math.abs(c.correlationCoeff) > 0.7);
    if (strongCorrelations.length > 0) {
      signals.push({
        type: 'correlation_alert',
        strength: strongCorrelations.length * 20,
        confidence: 80,
        narrative: `${strongCorrelations.length} strong correlations detected between key economic indicators.`,
        triggerIndicators: strongCorrelations.map(c => `${c.indicator1Name}-${c.indicator2Name}`),
        historicalPrecedent: 'Strong correlations often indicate synchronized economic movements.'
      });
    }

    setCachedResult(cacheKey, signals);
    res.json({ success: true, data: signals });

  } catch (error) {
    console.error('Error generating market signals:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate market signals'
    });
  }
});

export default router;