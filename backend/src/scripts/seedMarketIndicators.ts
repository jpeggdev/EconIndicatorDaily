import { PrismaClient } from '@prisma/client';
import { coreMarketIndicators } from '../services/alphaVantageService';

const prisma = new PrismaClient();

async function seedMarketIndicators() {
  console.log('Seeding market indicators...');

  for (const indicator of coreMarketIndicators) {
    try {
      const existing = await prisma.economicIndicator.findUnique({
        where: { name: indicator.name }
      });

      if (!existing) {
        await prisma.economicIndicator.create({
          data: {
            name: indicator.name,
            description: indicator.description,
            source: 'ALPHA_VANTAGE',
            category: indicator.category,
            frequency: 'daily',
            unit: indicator.symbol === 'VIX' ? 'index' : 'USD',
            isActive: true
          }
        });
        console.log(`✅ Created indicator: ${indicator.name}`);
      } else {
        console.log(`⏭️  Skipped existing indicator: ${indicator.name}`);
      }
    } catch (error) {
      console.error(`❌ Failed to create indicator ${indicator.name}:`, error);
    }
  }

  console.log('Market indicators seeding completed!');
}

seedMarketIndicators()
  .catch((error) => {
    console.error('Error seeding market indicators:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });