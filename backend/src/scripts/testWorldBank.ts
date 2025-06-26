import { worldBankService } from '../services/worldBankService';
import { WORLD_BANK_INDICATORS } from '../types/worldBank';

async function testWorldBankAPI() {
  console.log('Testing World Bank API integration...\n');

  try {
    // Test individual indicators
    console.log('1. Testing GDP...');
    const gdp = await worldBankService.getGDP();
    console.log(`GDP: $${(gdp.value / 1e12).toFixed(2)}T (${gdp.date})`);

    console.log('\n2. Testing GDP per capita...');
    const gdpPerCapita = await worldBankService.getGDPPerCapita();
    console.log(`GDP per capita: $${gdpPerCapita.value.toLocaleString()} (${gdpPerCapita.date})`);

    console.log('\n3. Testing Inflation...');
    const inflation = await worldBankService.getInflation();
    console.log(`Inflation: ${inflation.value.toFixed(2)}% (${inflation.date})`);

    console.log('\n4. Testing Unemployment...');
    const unemployment = await worldBankService.getUnemploymentRate();
    console.log(`Unemployment: ${unemployment.value.toFixed(2)}% (${unemployment.date})`);

    console.log('\n5. Testing Population...');
    const population = await worldBankService.getPopulation();
    console.log(`Population: ${(population.value / 1e6).toFixed(1)}M (${population.date})`);

    // Test multiple indicators at once
    console.log('\n6. Testing multiple indicators...');
    const multipleIndicators = await worldBankService.getMultipleIndicators([
      WORLD_BANK_INDICATORS.FDI,
      WORLD_BANK_INDICATORS.GOVERNMENT_DEBT,
      WORLD_BANK_INDICATORS.TRADE_BALANCE
    ]);

    if (multipleIndicators[WORLD_BANK_INDICATORS.FDI]) {
      const fdi = multipleIndicators[WORLD_BANK_INDICATORS.FDI];
      console.log(`FDI: $${(fdi.value / 1e9).toFixed(2)}B (${fdi.date})`);
    }

    if (multipleIndicators[WORLD_BANK_INDICATORS.GOVERNMENT_DEBT]) {
      const debt = multipleIndicators[WORLD_BANK_INDICATORS.GOVERNMENT_DEBT];
      console.log(`Government Debt: ${debt.value.toFixed(2)}% of GDP (${debt.date})`);
    }

    if (multipleIndicators[WORLD_BANK_INDICATORS.TRADE_BALANCE]) {
      const trade = multipleIndicators[WORLD_BANK_INDICATORS.TRADE_BALANCE];
      console.log(`Trade Balance: $${(trade.value / 1e9).toFixed(2)}B (${trade.date})`);
    }

    console.log('\n✅ World Bank API integration test completed successfully!');

  } catch (error) {
    console.error('❌ Error testing World Bank API:', error);
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  testWorldBankAPI();
}

export { testWorldBankAPI };