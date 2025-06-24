const { PrismaClient } = require('@prisma/client');

async function checkDatabase() {
  const prisma = new PrismaClient();

  try {
    console.log('=== Database Debug Info ===');
    
    const indicatorCount = await prisma.economicIndicator.count();
    const dataCount = await prisma.indicatorData.count();
    
    console.log('Economic Indicators count:', indicatorCount);
    console.log('Indicator Data count:', dataCount);
    
    if (indicatorCount > 0) {
      console.log('\n=== Existing Indicators ===');
      const indicators = await prisma.economicIndicator.findMany();
      indicators.forEach(i => {
        console.log(`- ${i.name} (${i.id}) - Active: ${i.isActive}`);
      });
    }
    
    // Check for any existing data
    if (dataCount > 0) {
      console.log('\n=== Sample Data ===');
      const sampleData = await prisma.indicatorData.findMany({
        take: 5,
        include: {
          indicator: {
            select: { name: true }
          }
        }
      });
      sampleData.forEach(d => {
        console.log(`- ${d.indicator.name}: ${d.value} on ${d.date}`);
      });
    }
    
  } catch (error) {
    console.error('Database check error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabase();