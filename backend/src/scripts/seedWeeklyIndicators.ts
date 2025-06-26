import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const weeklyIndicators = [
  {
    name: 'Initial Claims',
    description: 'Weekly unemployment insurance claims filed by workers who have lost their jobs',
    source: 'FRED',
    category: 'employment',
    frequency: 'weekly',
    unit: 'Number'
  },
  {
    name: 'Continuing Claims',
    description: 'Weekly number of people continuing to receive unemployment benefits',
    source: 'FRED',
    category: 'employment',
    frequency: 'weekly',
    unit: 'Number'
  },
  {
    name: 'Commercial Paper Outstanding',
    description: 'Total amount of commercial paper outstanding, updated weekly',
    source: 'FRED',
    category: 'monetary_policy',
    frequency: 'weekly',
    unit: 'Billions of Dollars'
  },
  {
    name: 'Assets of Commercial Banks',
    description: 'Total assets held by commercial banks in the US, reported weekly',
    source: 'FRED',
    category: 'monetary_policy',
    frequency: 'weekly',
    unit: 'Billions of Dollars'
  },
  {
    name: 'Housing Starts',
    description: 'Number of new housing units that began construction',
    source: 'FRED',
    category: 'housing',
    frequency: 'monthly',
    unit: 'Thousands of Units'
  }
];

async function seedWeeklyIndicators() {
  console.log('Seeding weekly and additional economic indicators...');

  for (const indicator of weeklyIndicators) {
    try {
      const existing = await prisma.economicIndicator.findUnique({
        where: { name: indicator.name }
      });

      if (!existing) {
        await prisma.economicIndicator.create({
          data: {
            name: indicator.name,
            description: indicator.description,
            source: indicator.source,
            category: indicator.category,
            frequency: indicator.frequency,
            unit: indicator.unit,
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

  console.log('Weekly indicators seeding completed!');
}

seedWeeklyIndicators()
  .catch((error) => {
    console.error('Error seeding weekly indicators:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });