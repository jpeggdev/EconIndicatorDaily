const { PrismaClient } = require('@prisma/client');
const { IndicatorService } = require('./dist/services/indicatorService');

async function testDataFetch() {
  const prisma = new PrismaClient();
  const fredApiKey = process.env.FRED_API_KEY || '4987cfbb5876af660d32cf1fa6502da5';
  const indicatorService = new IndicatorService(prisma, fredApiKey);
  
  console.log('=== Testing Data Fetch ===');
  
  try {
    // Test fetching data for GDP
    console.log('Fetching data for Gross Domestic Product...');
    await indicatorService.fetchAndStoreIndicatorData('Gross Domestic Product');
    console.log('Data fetch completed');
    
    // Check data count
    const dataCount = await prisma.indicatorData.count();
    console.log('Total data records:', dataCount);
    
    // Get sample data
    const sampleData = await prisma.indicatorData.findMany({
      take: 3,
      include: {
        indicator: { select: { name: true } }
      },
      orderBy: { date: 'desc' }
    });
    
    console.log('\nSample data:');
    sampleData.forEach(d => {
      console.log(`- ${d.indicator.name}: $${d.value} billion on ${d.date.toISOString().split('T')[0]}`);
    });
    
  } catch (error) {
    console.error('Data fetch failed:', error.message);
    console.error('Full error:', error);
  }
  
  await prisma.$disconnect();
}

require('dotenv').config();
testDataFetch().catch(console.error);