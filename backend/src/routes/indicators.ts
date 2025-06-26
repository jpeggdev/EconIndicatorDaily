import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { IndicatorService } from '../services/indicatorService';

const router = Router();
const prisma = new PrismaClient();

const getIndicatorService = (): IndicatorService => {
  const fredApiKey = process.env.FRED_API_KEY;
  const alphaVantageApiKey = process.env.ALPHA_VANTAGE_API_KEY;
  const blsApiKey = process.env.BLS_API_KEY;
  const finnhubApiKey = process.env.FINNHUB_API_KEY; // Optional
  const fmpApiKey = process.env.FINANCIAL_MODELING_PREP_API_KEY; // Optional
  
  if (!fredApiKey) {
    throw new Error('FRED_API_KEY environment variable is required');
  }
  if (!alphaVantageApiKey) {
    throw new Error('ALPHA_VANTAGE_API_KEY environment variable is required');
  }
  if (!blsApiKey) {
    throw new Error('BLS_API_KEY environment variable is required');
  }
  
  return new IndicatorService(prisma, fredApiKey, alphaVantageApiKey, blsApiKey, finnhubApiKey, fmpApiKey);
};

router.get('/', async (req: any, res: any) => {
  try {
    const indicatorService = getIndicatorService();
    const userId = req.session?.user?.id;
    
    // Get query parameters for filtering
    const { categories, sources, frequencies, favoritesOnly } = req.query;
    
    // Parse filter parameters
    const categoryFilter = categories ? categories.split(',') : [];
    const sourceFilter = sources ? sources.split(',') : [];
    const frequencyFilter = frequencies ? frequencies.split(',') : [];
    const showFavoritesOnly = favoritesOnly === 'true';
    
    // Build where clause for filtering
    const whereClause: any = { isActive: true };
    
    if (categoryFilter.length > 0) {
      whereClause.category = { in: categoryFilter };
    }
    if (sourceFilter.length > 0) {
      whereClause.source = { in: sourceFilter };
    }
    if (frequencyFilter.length > 0) {
      whereClause.frequency = { in: frequencyFilter };
    }
    
    // If showing favorites only and user is authenticated
    if (showFavoritesOnly && userId) {
      whereClause.userPreferences = {
        some: {
          userId,
          isFavorite: true
        }
      };
    }
    
    const indicators = await prisma.economicIndicator.findMany({
      where: whereClause,
      include: {
        data: {
          orderBy: { date: 'desc' },
          take: 1
        },
        userPreferences: userId ? {
          where: { userId }
        } : false
      },
      orderBy: [
        { category: 'asc' },
        { name: 'asc' }
      ]
    });
    
    res.json({
      success: true,
      data: indicators.map(indicator => ({
        id: indicator.id,
        name: indicator.name,
        description: indicator.description,
        category: indicator.category,
        frequency: indicator.frequency,
        unit: indicator.unit,
        source: indicator.source,
        latestValue: indicator.data[0]?.value || null,
        latestDate: indicator.data[0]?.date || null,
        isFavorite: userId ? (indicator.userPreferences[0]?.isFavorite || false) : false
      }))
    });
  } catch (error) {
    console.error('Error fetching indicators:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch indicators'
    });
  }
});

router.get('/:id', async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const limit = parseInt(req.query.limit as string) || 30;
    
    const indicatorService = getIndicatorService();
    const indicator = await indicatorService.getIndicatorWithData(id, limit);
    
    if (!indicator) {
      return res.status(404).json({
        success: false,
        message: 'Indicator not found'
      });
    }

    res.json({
      success: true,
      data: {
        ...indicator,
        data: indicator.data.map(d => ({
          date: d.date,
          value: d.value
        }))
      }
    });
  } catch (error) {
    console.error('Error fetching indicator:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch indicator data'
    });
  }
});

router.post('/sync', async (req, res) => {
  const startTime = Date.now();
  const syncResults: { indicator: string; success: boolean; error?: string }[] = [];
  
  try {
    console.log('Starting indicator synchronization...');
    const indicatorService = getIndicatorService();
    
    // Initialize core indicators
    console.log('Initializing core indicators...');
    await indicatorService.initializeCoreIndicators();
    console.log('✓ Core indicators initialized successfully');
    
    // Sync data for each indicator
    const indicators = [
      // Weekly indicators (highest priority for free users)
      'Initial Claims',
      'Continuing Claims', 
      'Commercial Paper Outstanding',
      'Assets of Commercial Banks',
      // Monthly indicators
      'Housing Starts',
      'Unemployment Rate', 
      'Consumer Price Index', 
      'Federal Funds Rate', 
      'Nonfarm Payrolls',
      // Quarterly indicators
      'Gross Domestic Product',
      // Daily market indicators  
      'SPDR S&P 500 ETF',
      'Vanguard Total Stock Market ETF',
      'Invesco QQQ ETF',
      'SPDR Dow Jones Industrial Average ETF',
      'iPath Series B S&P 500 VIX Short-Term Futures ETN',
      // Annual World Bank indicators
      'US GDP',
      'US GDP per Capita',
      'US Population',
      'Government Debt to GDP',
      'Foreign Direct Investment'
    ];
    
    for (const indicator of indicators) {
      try {
        console.log(`Syncing data for: ${indicator}`);
        await indicatorService.fetchAndStoreIndicatorData(indicator);
        console.log(`✓ Successfully synced: ${indicator}`);
        syncResults.push({ indicator, success: true });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`✗ Failed to sync ${indicator}:`, errorMessage);
        console.error('Full error details:', error);
        syncResults.push({ indicator, success: false, error: errorMessage });
      }
    }

    const successCount = syncResults.filter(r => r.success).length;
    const failureCount = syncResults.filter(r => !r.success).length;
    const duration = Date.now() - startTime;
    
    console.log(`Sync completed in ${duration}ms: ${successCount} successful, ${failureCount} failed`);
    
    if (failureCount > 0) {
      console.warn('Some indicators failed to sync:', syncResults.filter(r => !r.success));
    }

    res.json({
      success: true,
      message: `Indicators synchronized successfully (${successCount}/${indicators.length})`,
      results: syncResults,
      duration: `${duration}ms`
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Critical error during sync initialization:', errorMessage);
    console.error('Full error details:', error);
    
    res.status(500).json({
      success: false,
      message: 'Failed to sync indicators',
      error: errorMessage,
      results: syncResults
    });
  }
});

export default router;