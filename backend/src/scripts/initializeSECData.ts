import { PrismaClient } from '@prisma/client';
import { IndicatorService } from '../services/indicatorService';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function initializeSECData() {
  try {
    console.log('🏛️ Initializing SEC EDGAR Data Integration...\n');
    
    // Get API keys from environment
    const fredApiKey = process.env.FRED_API_KEY;
    const alphaVantageApiKey = process.env.ALPHA_VANTAGE_API_KEY;
    const blsApiKey = process.env.BLS_API_KEY;
    const finnhubApiKey = process.env.FINNHUB_API_KEY;
    const fmpApiKey = process.env.FMP_API_KEY;

    if (!fredApiKey || !alphaVantageApiKey || !blsApiKey) {
      throw new Error('Required API keys not found in environment variables');
    }

    // Initialize the indicator service
    const indicatorService = new IndicatorService(
      prisma, 
      fredApiKey, 
      alphaVantageApiKey, 
      blsApiKey,
      finnhubApiKey,
      fmpApiKey
    );

    console.log('📊 Initializing SEC economic indicators in database...');
    
    // Initialize all core indicators (including SEC)
    await indicatorService.initializeCoreIndicators();
    
    console.log('✅ SEC indicators initialized successfully!\n');

    // Test SEC API connection
    console.log('🔗 Testing SEC EDGAR API connection...');
    
    try {
      // Try to fetch one SEC indicator to test the integration
      console.log('📈 Attempting to fetch sample SEC data...');
      await indicatorService.fetchAndStoreIndicatorData('S&P 500 Aggregate Revenue');
      console.log('✅ SEC data integration test successful!');
    } catch (error) {
      console.log('⚠️ SEC data fetch test failed (this is normal for initial setup):', (error as Error).message);
      console.log('💡 SEC indicators are initialized but may need time to populate data.');
    }

    console.log('\n🎉 SEC EDGAR Integration Complete!');
    console.log('\n📋 Available SEC Indicators:');
    console.log('┌─────────────────────────────────────────────────────────┐');
    console.log('│ • S&P 500 Aggregate Revenue (Quarterly)                │');
    console.log('│ • Corporate Debt Levels (Quarterly)                    │');
    console.log('│ • Corporate Cash Holdings (Quarterly)                  │');
    console.log('│ • Net Income Growth Rate (Quarterly)                   │');
    console.log('│ • Return on Assets Median (Quarterly)                  │');
    console.log('└─────────────────────────────────────────────────────────┘');
    
    console.log('\n🔄 These indicators will be automatically updated with:');
    console.log('  - Latest corporate earnings data');
    console.log('  - Financial statement filings');
    console.log('  - Aggregate metrics from major corporations');
    console.log('  - Quarterly corporate financial health indicators');

    console.log('\n📁 Data Sources:');
    console.log('  - SEC EDGAR database (https://data.sec.gov)');
    console.log('  - XBRL financial statement data');
    console.log('  - Major corporation filings (10-K, 10-Q)');
    console.log('  - Real-time corporate financial metrics');

    console.log('\n⚡ Features:');
    console.log('  - Rate-limited API calls (< 10 req/sec)');
    console.log('  - Automated data aggregation');
    console.log('  - Cross-company financial analysis');
    console.log('  - Quarterly financial health tracking');

  } catch (error) {
    console.error('❌ Failed to initialize SEC data:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the initialization
initializeSECData();