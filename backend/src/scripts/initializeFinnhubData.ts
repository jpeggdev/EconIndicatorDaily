import { PrismaClient } from '@prisma/client';
import { IndicatorService } from '../services/indicatorService';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function initializeFinnhubData() {
  console.log('🚀 Initializing Finnhub Data...\n');

  const prisma = new PrismaClient();
  
  try {
    const fredApiKey = process.env.FRED_API_KEY;
    const alphaVantageApiKey = process.env.ALPHA_VANTAGE_API_KEY;
    const blsApiKey = process.env.BLS_API_KEY;
    const finnhubApiKey = process.env.FINNHUB_API_KEY;

    if (!fredApiKey || !alphaVantageApiKey || !blsApiKey) {
      throw new Error('Missing required API keys');
    }

    if (!finnhubApiKey) {
      throw new Error('FINNHUB_API_KEY is required for this initialization');
    }

    const indicatorService = new IndicatorService(prisma, fredApiKey, alphaVantageApiKey, blsApiKey, finnhubApiKey);

    // Step 1: Initialize all indicators (including Finnhub)
    console.log('📝 Step 1: Initializing all indicators...');
    await indicatorService.initializeCoreIndicators();
    console.log('✅ All indicators initialized\n');

    // Step 2: Check which Finnhub indicators exist in database
    console.log('📊 Step 2: Checking Finnhub indicators in database...');
    const finnhubIndicators = await prisma.economicIndicator.findMany({
      where: { source: 'FINNHUB' }
    });
    
    console.log(`Found ${finnhubIndicators.length} Finnhub indicators in database:`);
    finnhubIndicators.forEach(indicator => {
      console.log(`  - ${indicator.name} (${indicator.id})`);
    });

    console.log('\n✅ Finnhub initialization complete!');

  } catch (error) {
    console.error('❌ Finnhub initialization failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  initializeFinnhubData();
}

export { initializeFinnhubData };