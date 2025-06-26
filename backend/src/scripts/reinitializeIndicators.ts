import { PrismaClient } from '@prisma/client';
import { IndicatorService } from '../services/indicatorService';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function reinitializeIndicators() {
  console.log('Re-initializing all indicators with standardized units...\n');

  try {
    const fredApiKey = process.env.FRED_API_KEY;
    const alphaVantageApiKey = process.env.ALPHA_VANTAGE_API_KEY;
    const blsApiKey = process.env.BLS_API_KEY;

    if (!fredApiKey || !alphaVantageApiKey || !blsApiKey) {
      throw new Error('Missing API keys');
    }

    const indicatorService = new IndicatorService(prisma, fredApiKey, alphaVantageApiKey, blsApiKey);
    
    await indicatorService.initializeCoreIndicators();
    
    console.log('✅ All indicators re-initialized successfully!');
    
    // Test the units again
    const indicators = await prisma.economicIndicator.findMany({
      include: {
        data: {
          orderBy: { date: 'desc' },
          take: 1
        }
      }
    });

    console.log('\nUpdated indicator units:\n');
    
    for (const indicator of indicators) {
      const latestData = indicator.data[0];
      const value = latestData ? latestData.value : 'No data';
      
      console.log(`${indicator.name}:`);
      console.log(`  Source: ${indicator.source}`);
      console.log(`  Unit: ${indicator.unit}`);
      console.log(`  Latest Value: ${value}`);
      console.log('');
    }

  } catch (error) {
    console.error('Error re-initializing indicators:', error);
  } finally {
    await prisma.$disconnect();
  }
}

reinitializeIndicators();