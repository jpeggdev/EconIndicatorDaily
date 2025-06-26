import { PrismaClient } from '@prisma/client';
import { FredService } from '../services/fredService';
import { AlphaVantageService } from '../services/alphaVantageService';
import { WorldBankService } from '../services/worldBankService';
import { IndicatorService } from '../services/indicatorService';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function testAllUnits() {
  console.log('Testing all indicator units...\n');

  try {
    // Get all indicators from database
    const indicators = await prisma.economicIndicator.findMany({
      include: {
        data: {
          orderBy: { date: 'desc' },
          take: 1
        }
      }
    });

    console.log('Current indicator units and values:\n');
    
    for (const indicator of indicators) {
      const latestData = indicator.data[0];
      const value = latestData ? latestData.value : 'No data';
      
      console.log(`${indicator.name}:`);
      console.log(`  Source: ${indicator.source}`);
      console.log(`  Unit: ${indicator.unit}`);
      console.log(`  Latest Value: ${value}`);
      console.log(`  Category: ${indicator.category}`);
      console.log('');
    }

    // Test FRED series units specifically
    const fredApiKey = process.env.FRED_API_KEY;
    if (fredApiKey) {
      console.log('\n=== FRED API Unit Analysis ===');
      const fredService = new FredService(fredApiKey);
      
      const fredSeries = [
        'ICSA', 'CCSA', 'CPFF', 'TOTBKCR', 'HOUST', 
        'UNRATE', 'CPIAUCSL', 'FEDFUNDS', 'PAYEMS', 'GDP'
      ];

      for (const seriesId of fredSeries) {
        try {
          const info = await fredService.getSeriesInfo(seriesId);
          console.log(`${seriesId} (${info.title}):`);
          console.log(`  FRED Unit: "${info.units}"`);
          console.log('');
        } catch (error) {
          console.log(`${seriesId}: Error - ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    }

  } catch (error) {
    console.error('Error testing units:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testAllUnits();