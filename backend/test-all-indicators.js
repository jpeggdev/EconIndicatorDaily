const { PrismaClient } = require('@prisma/client');
const { IndicatorService } = require('./dist/services/indicatorService');

async function testAllIndicators() {
  const prisma = new PrismaClient();
  const fredApiKey = process.env.FRED_API_KEY || '4987cfbb5876af660d32cf1fa6502da5';
  const indicatorService = new IndicatorService(prisma, fredApiKey);
  
  const indicators = ['Gross Domestic Product', 'Unemployment Rate', 'Consumer Price Index', 'Federal Funds Rate', 'Nonfarm Payrolls'];
  
  console.log('=== Testing All Indicators Data Fetch ===');
  
  for (const indicatorName of indicators) {
    console.log(`\nFetching data for: ${indicatorName}`);
    try {
      await indicatorService.fetchAndStoreIndicatorData(indicatorName);
      
      // Count data for this indicator
      const indicator = await prisma.economicIndicator.findUnique({
        where: { name: indicatorName },
        include: { data: true }
      });
      
      console.log(`✓ Success: ${indicator.data.length} data points`);
      if (indicator.data.length > 0) {
        const latest = indicator.data.sort((a, b) => new Date(b.date) - new Date(a.date))[0];
        console.log(`  Latest: ${latest.value} on ${latest.date.toISOString().split('T')[0]}`);
      }
      
    } catch (error) {
      console.log(`✗ Failed: ${error.message}`);
    }
  }
  
  // Final summary
  console.log('\n=== Final Summary ===');
  const totalIndicators = await prisma.economicIndicator.count();
  const totalData = await prisma.indicatorData.count();
  console.log(`Total indicators: ${totalIndicators}`);
  console.log(`Total data points: ${totalData}`);
  
  await prisma.$disconnect();
}

require('dotenv').config();
testAllIndicators().catch(console.error);