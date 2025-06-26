import { PrismaClient } from '@prisma/client';
import { IndicatorService } from '../services/indicatorService';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function refreshGDP() {
  console.log('Refreshing GDP data with scaling...\n');

  try {
    const fredApiKey = process.env.FRED_API_KEY;
    const alphaVantageApiKey = process.env.ALPHA_VANTAGE_API_KEY;
    const blsApiKey = process.env.BLS_API_KEY;

    if (!fredApiKey || !alphaVantageApiKey || !blsApiKey) {
      throw new Error('Missing API keys');
    }

    const indicatorService = new IndicatorService(prisma, fredApiKey, alphaVantageApiKey, blsApiKey);
    
    // Refresh GDP data
    await indicatorService.fetchAndStoreIndicatorData('Gross Domestic Product');
    
    console.log('✅ GDP data refreshed!');
    
    // Check the new values
    const gdpIndicator = await prisma.economicIndicator.findUnique({
      where: { name: 'Gross Domestic Product' },
      include: {
        data: {
          orderBy: { date: 'desc' },
          take: 3
        }
      }
    });

    if (gdpIndicator) {
      console.log(`\nGDP (${gdpIndicator.unit}):`);
      for (const data of gdpIndicator.data) {
        console.log(`  ${data.date.toISOString().split('T')[0]}: ${data.value}`);
      }
    }

  } catch (error) {
    console.error('Error refreshing GDP:', error);
  } finally {
    await prisma.$disconnect();
  }
}

refreshGDP();