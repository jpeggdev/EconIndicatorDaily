import { PrismaClient } from '@prisma/client';
import { IndicatorService } from '../services/indicatorService';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function refreshBankAssets() {
  console.log('Refreshing Bank Assets data with scaling...\n');

  try {
    const fredApiKey = process.env.FRED_API_KEY;
    const alphaVantageApiKey = process.env.ALPHA_VANTAGE_API_KEY;
    const blsApiKey = process.env.BLS_API_KEY;

    if (!fredApiKey || !alphaVantageApiKey || !blsApiKey) {
      throw new Error('Missing API keys');
    }

    const indicatorService = new IndicatorService(prisma, fredApiKey, alphaVantageApiKey, blsApiKey);
    
    // Refresh Bank Assets data
    await indicatorService.fetchAndStoreIndicatorData('Assets of Commercial Banks');
    
    console.log('✅ Bank Assets data refreshed!');
    
    // Check the new values
    const bankAssetsIndicator = await prisma.economicIndicator.findUnique({
      where: { name: 'Assets of Commercial Banks' },
      include: {
        data: {
          orderBy: { date: 'desc' },
          take: 3
        }
      }
    });

    if (bankAssetsIndicator) {
      console.log(`\nBank Assets (${bankAssetsIndicator.unit}):`);
      for (const data of bankAssetsIndicator.data) {
        console.log(`  ${data.date.toISOString().split('T')[0]}: ${data.value}`);
      }
    }

  } catch (error) {
    console.error('Error refreshing Bank Assets:', error);
  } finally {
    await prisma.$disconnect();
  }
}

refreshBankAssets();