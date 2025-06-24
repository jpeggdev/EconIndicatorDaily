const { PrismaClient } = require('@prisma/client');
const { FredService, coreIndicators } = require('./dist/services/fredService');
const { IndicatorService } = require('./dist/services/indicatorService');

async function testSync() {
  const prisma = new PrismaClient();
  const fredApiKey = process.env.FRED_API_KEY || '4987cfbb5876af660d32cf1fa6502da5';
  
  console.log('=== Testing FRED API Key ===');
  console.log('API Key:', fredApiKey ? 'Present' : 'Missing');
  
  console.log('\n=== Testing FRED Service ===');
  const fredService = new FredService(fredApiKey);
  
  try {
    // Test getting series info for GDP
    console.log('Testing getSeriesInfo for GDP...');
    const seriesInfo = await fredService.getSeriesInfo('GDP');
    console.log('Series Info Success:', seriesInfo.title);
    console.log('Units:', seriesInfo.units);
  } catch (error) {
    console.error('getSeriesInfo failed:', error.message);
  }
  
  try {
    // Test getting observations for GDP
    console.log('\nTesting getSeriesObservations for GDP...');
    const observations = await fredService.getSeriesObservations('GDP', 3);
    console.log('Observations Success:', observations.observations.length, 'records');
    console.log('Sample data:', observations.observations[0]);
  } catch (error) {
    console.error('getSeriesObservations failed:', error.message);
  }
  
  console.log('\n=== Testing IndicatorService ===');
  const indicatorService = new IndicatorService(prisma, fredApiKey);
  
  try {
    console.log('Testing initializeCoreIndicators...');
    await indicatorService.initializeCoreIndicators();
    console.log('initializeCoreIndicators completed');
    
    // Check if indicators were created
    const count = await prisma.economicIndicator.count();
    console.log('Indicators created:', count);
    
  } catch (error) {
    console.error('initializeCoreIndicators failed:', error.message);
    console.error('Full error:', error);
  }
  
  await prisma.$disconnect();
}

// Load environment variables
require('dotenv').config();
testSync().catch(console.error);