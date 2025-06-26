import { PrismaClient } from '@prisma/client';
import { IndicatorService } from '../services/indicatorService';
import { coreBlsIndicators } from '../services/blsService';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function initializeBlsData() {
  console.log('🚀 Initializing BLS Data...\n');

  const prisma = new PrismaClient();
  
  try {
    const fredApiKey = process.env.FRED_API_KEY;
    const alphaVantageApiKey = process.env.ALPHA_VANTAGE_API_KEY;
    const blsApiKey = process.env.BLS_API_KEY;

    if (!fredApiKey || !alphaVantageApiKey || !blsApiKey) {
      throw new Error('Missing required API keys');
    }

    const indicatorService = new IndicatorService(prisma, fredApiKey, alphaVantageApiKey, blsApiKey);

    // Step 1: Initialize BLS indicators in database
    console.log('📝 Step 1: Initializing BLS indicators...');
    await indicatorService.initializeCoreIndicators();
    console.log('✅ BLS indicators initialized\n');

    // Step 2: Check which BLS indicators exist in database
    console.log('📊 Step 2: Checking BLS indicators in database...');
    const blsIndicators = await prisma.economicIndicator.findMany({
      where: { source: 'BLS' }
    });
    
    console.log(`Found ${blsIndicators.length} BLS indicators in database:`);
    blsIndicators.forEach(indicator => {
      console.log(`  - ${indicator.name} (${indicator.id})`);
    });

    // Step 3: Fetch data for each BLS indicator
    console.log('\n📈 Step 3: Fetching BLS data...');
    
    for (const indicator of blsIndicators) {
      try {
        console.log(`Fetching data for: ${indicator.name}`);
        await indicatorService.fetchAndStoreIndicatorData(indicator.name);
        
        // Check how much data was stored
        const dataCount = await prisma.indicatorData.count({
          where: { indicatorId: indicator.id }
        });
        console.log(`  ✅ Stored ${dataCount} data points\n`);
        
        // Add delay to respect BLS rate limits
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`  ❌ Failed to fetch ${indicator.name}:`, error);
      }
    }

    // Step 4: Verify data was stored correctly
    console.log('🔍 Step 4: Verifying stored data...');
    
    for (const indicator of blsIndicators) {
      const latestData = await prisma.indicatorData.findFirst({
        where: { indicatorId: indicator.id },
        orderBy: { date: 'desc' }
      });
      
      if (latestData) {
        console.log(`${indicator.name}: Latest value ${latestData.value} on ${latestData.date.toISOString().split('T')[0]}`);
      } else {
        console.log(`${indicator.name}: ⚠️  No data found`);
      }
    }

    console.log('\n✅ BLS initialization complete!');

  } catch (error) {
    console.error('❌ BLS initialization failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  initializeBlsData();
}

export { initializeBlsData };