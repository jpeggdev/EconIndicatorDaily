import { PrismaClient } from '@prisma/client';
import { IndicatorService, coreWorldBankIndicators } from '../services/indicatorService';

const prisma = new PrismaClient();

async function seedWorldBankIndicators() {
  console.log('🌍 Seeding World Bank indicators...\n');

  try {
    // Initialize the service (API keys not needed for World Bank)
    const indicatorService = new IndicatorService(
      prisma,
      process.env.FRED_API_KEY || 'dummy',
      process.env.ALPHA_VANTAGE_API_KEY || 'dummy',
      process.env.BLS_API_KEY || 'dummy'
    );

    // Initialize World Bank indicators in database
    console.log('1. Initializing World Bank indicators...');
    await indicatorService.initializeCoreIndicators();
    console.log('✅ World Bank indicators initialized\n');

    // Fetch and store data for each World Bank indicator
    for (const indicator of coreWorldBankIndicators) {
      try {
        console.log(`2. Fetching data for ${indicator.name}...`);
        await indicatorService.fetchAndStoreIndicatorData(indicator.name);
        console.log(`✅ ${indicator.name} data stored\n`);
      } catch (error) {
        console.error(`❌ Failed to fetch ${indicator.name}:`, error);
      }
    }

    // Display summary
    console.log('3. Fetching summary of stored indicators...');
    const storedIndicators = await prisma.economicIndicator.findMany({
      where: { source: 'WORLD_BANK' },
      include: {
        data: {
          orderBy: { date: 'desc' },
          take: 1
        }
      }
    });

    console.log('\n📊 World Bank Indicators Summary:');
    console.log('===================================');
    for (const indicator of storedIndicators) {
      const latestData = indicator.data[0];
      if (latestData) {
        let formattedValue = latestData.value.toLocaleString();
        if (indicator.name.includes('Debt to GDP')) {
          formattedValue = `${latestData.value.toFixed(2)}% of GDP`;
        } else if (indicator.name.includes('per Capita')) {
          formattedValue = `$${latestData.value.toLocaleString()}`;
        } else if (indicator.name.includes('GDP')) {
          formattedValue = `$${(latestData.value / 1e12).toFixed(2)}T`;
        } else if (indicator.name.includes('Population')) {
          formattedValue = `${(latestData.value / 1e6).toFixed(1)}M`;
        } else if (indicator.name.includes('Investment')) {
          formattedValue = `$${(latestData.value / 1e9).toFixed(2)}B`;
        }

        console.log(`${indicator.name}: ${formattedValue} (${latestData.date.getFullYear()})`);
      } else {
        console.log(`${indicator.name}: No data available`);
      }
    }

    console.log('\n✅ World Bank integration completed successfully!');

  } catch (error) {
    console.error('❌ Error seeding World Bank indicators:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seeding if this file is executed directly
if (require.main === module) {
  seedWorldBankIndicators();
}

export { seedWorldBankIndicators };