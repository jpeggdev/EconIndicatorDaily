import { BlsService } from '../services/blsService';
import { AnalyticsService } from '../services/analyticsService';
import { FredService } from '../services/fredService';
import { AlphaVantageService } from '../services/alphaVantageService';
import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testBlsIntegration() {
  console.log('🚀 Testing BLS API Integration...\n');

  const blsService = new BlsService(process.env.BLS_API_KEY!);
  
  try {
    // Test 1: Get Unemployment Rate
    console.log('📊 Test 1: Unemployment Rate');
    const unemploymentData = await blsService.getUnemploymentRate();
    console.log(`Latest unemployment rate: ${unemploymentData[0].value}% (${unemploymentData[0].date})`);
    console.log(`Historical data points: ${unemploymentData.length}\n`);

    // Test 2: Get CPI Data
    console.log('📈 Test 2: CPI Components');
    const cpiData = await blsService.getCPIComponents();
    const cpiByType = cpiData.reduce((acc, data) => {
      if (!acc[data.seriesId]) acc[data.seriesId] = [];
      acc[data.seriesId].push(data);
      return acc;
    }, {} as Record<string, any[]>);

    Object.entries(cpiByType).forEach(([seriesId, data]) => {
      const latest = data[0];
      console.log(`${seriesId}: ${latest.value} (${latest.date})`);
    });

    // Test 3: Inflation Divergence Analysis
    console.log('\n🔍 Test 3: Inflation Divergence Analysis');
    const prisma = new PrismaClient();
    const fredService = new FredService(process.env.FRED_API_KEY!);
    const alphaVantageService = new AlphaVantageService(process.env.ALPHA_VANTAGE_API_KEY!);
    
    const analyticsService = new AnalyticsService(
      prisma,
      blsService,
      fredService,
      alphaVantageService
    );

    const inflationAnalysis = await analyticsService.analyzeInflationDivergence();
    console.log(`Signal: ${inflationAnalysis.signal}`);
    console.log(`Confidence: ${inflationAnalysis.confidence}%`);
    console.log(`Core Inflation: ${inflationAnalysis.coreInflation.toFixed(1)}%`);
    console.log(`Headline Inflation: ${inflationAnalysis.headlineInflation.toFixed(1)}%`);
    console.log(`Divergence Score: ${inflationAnalysis.divergenceScore.toFixed(1)}pp`);
    console.log(`Description: ${inflationAnalysis.description}`);

    await prisma.$disconnect();

    console.log('\n✅ All BLS tests completed successfully!');

  } catch (error) {
    console.error('❌ BLS test failed:', error);
  }
}

// Run if called directly
if (require.main === module) {
  testBlsIntegration();
}

export { testBlsIntegration };