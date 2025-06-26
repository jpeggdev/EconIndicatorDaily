import { PrismaClient } from '@prisma/client';
import { IndicatorService } from '../services/indicatorService';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function initializeTreasuryData() {
  console.log('🏛️ Initializing US Treasury Fiscal Data...\n');

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

    // Step 1: Initialize all indicators (including Treasury)
    console.log('📝 Step 1: Initializing all indicators...');
    await indicatorService.initializeCoreIndicators();
    console.log('✅ All indicators initialized\n');

    // Step 2: Check which Treasury indicators exist in database
    console.log('📊 Step 2: Checking Treasury indicators in database...');
    const treasuryIndicators = await prisma.economicIndicator.findMany({
      where: { source: 'TREASURY' }
    });
    
    console.log(`Found ${treasuryIndicators.length} Treasury indicators in database:`);
    treasuryIndicators.forEach(indicator => {
      console.log(`  - ${indicator.name} (${indicator.category})`);
    });

    // Step 3: Test Treasury API connection and sync one indicator
    console.log('\n🏛️ Step 3: Testing Treasury API connection...');
    
    if (treasuryIndicators.length > 0) {
      const testIndicator = treasuryIndicators[0];
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

    console.log('\n✅ Treasury initialization complete!');

  } catch (error) {
    console.error('❌ Treasury initialization failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  initializeTreasuryData();
}

export { initializeTreasuryData };