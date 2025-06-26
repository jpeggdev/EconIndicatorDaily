import { PrismaClient } from '@prisma/client';
import { IndicatorService } from '../services/indicatorService';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function refreshClaims() {
  console.log('Refreshing Claims data with scaling...\n');

  try {
    const fredApiKey = process.env.FRED_API_KEY;
    const alphaVantageApiKey = process.env.ALPHA_VANTAGE_API_KEY;
    const blsApiKey = process.env.BLS_API_KEY;

    if (!fredApiKey || !alphaVantageApiKey || !blsApiKey) {
      throw new Error('Missing API keys');
    }

    const indicatorService = new IndicatorService(prisma, fredApiKey, alphaVantageApiKey, blsApiKey);
    
    // Refresh Claims data (these shouldn't be scaled since they're counts)
    await indicatorService.fetchAndStoreIndicatorData('Initial Claims');
    await indicatorService.fetchAndStoreIndicatorData('Nonfarm Payrolls');
    
    console.log('✅ Claims data refreshed!');
    
    // Check the new values
    const initialClaims = await prisma.economicIndicator.findUnique({
      where: { name: 'Initial Claims' },
      include: {
        data: {
          orderBy: { date: 'desc' },
          take: 2
        }
      }
    });

    const payrolls = await prisma.economicIndicator.findUnique({
      where: { name: 'Nonfarm Payrolls' },
      include: {
        data: {
          orderBy: { date: 'desc' },
          take: 2
        }
      }
    });

    if (initialClaims) {
      console.log(`\nInitial Claims (${initialClaims.unit}):`);
      for (const data of initialClaims.data) {
        console.log(`  ${data.date.toISOString().split('T')[0]}: ${data.value}`);
      }
    }

    if (payrolls) {
      console.log(`\nNonfarm Payrolls (${payrolls.unit}):`);
      for (const data of payrolls.data) {
        console.log(`  ${data.date.toISOString().split('T')[0]}: ${data.value}`);
      }
    }

  } catch (error) {
    console.error('Error refreshing Claims:', error);
  } finally {
    await prisma.$disconnect();
  }
}

refreshClaims();