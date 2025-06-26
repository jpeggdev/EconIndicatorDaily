import { PrismaClient } from '@prisma/client';
import { IndicatorService } from '../services/indicatorService';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function initializeIMFData() {
  console.log('🌍 Initializing International Monetary Fund Data...\n');

  const prisma = new PrismaClient();
  
  try {
    const fredApiKey = process.env.FRED_API_KEY;
    const alphaVantageApiKey = process.env.ALPHA_VANTAGE_API_KEY;
    const blsApiKey = process.env.BLS_API_KEY;
    const finnhubApiKey = process.env.FINNHUB_API_KEY;
    const fmpApiKey = process.env.FINANCIAL_MODELING_PREP_API_KEY;

    if (!fredApiKey || !alphaVantageApiKey || !blsApiKey) {
      throw new Error('Missing required API keys');
    }

    const indicatorService = new IndicatorService(prisma, fredApiKey, alphaVantageApiKey, blsApiKey, finnhubApiKey, fmpApiKey);

    // Step 1: Initialize all indicators (including IMF)
    console.log('📝 Step 1: Initializing all indicators...');
    await indicatorService.initializeCoreIndicators();
    console.log('✅ All indicators initialized\n');

    // Step 2: Check which IMF indicators exist in database
    console.log('📊 Step 2: Checking IMF indicators in database...');
    const imfIndicators = await prisma.economicIndicator.findMany({
      where: { source: 'IMF' }
    });
    
    console.log(`Found ${imfIndicators.length} IMF indicators in database:`);
    imfIndicators.forEach(indicator => {
      console.log(`  - ${indicator.name} (${indicator.category})`);
    });

    // Step 3: Test IMF API connection and sync one indicator
    console.log('\n🌐 Step 3: Testing IMF API connection...');
    
    if (imfIndicators.length > 0) {
      const testIndicator = imfIndicators[0];
      console.log(`Testing sync for: ${testIndicator.name}`);
      
      try {
        await indicatorService.fetchAndStoreIndicatorData(testIndicator.name);
        
        const dataCount = await prisma.indicatorData.count({
          where: { indicatorId: testIndicator.id }
        });
        console.log(`✅ Successfully synced ${dataCount} data points for ${testIndicator.name}`);
      } catch (error) {
        console.error(`❌ Failed to sync ${testIndicator.name}:`, error);
      }
    }

    console.log('\n✅ IMF initialization complete!');

  } catch (error) {
    console.error('❌ IMF initialization failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  initializeIMFData();
}

export { initializeIMFData };