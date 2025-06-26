import { AlphaVantageService } from '../services/alphaVantageService';

async function testAlphaVantage() {
  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
  
  if (!apiKey) {
    console.error('ALPHA_VANTAGE_API_KEY not found in environment variables');
    process.exit(1);
  }

  const service = new AlphaVantageService(apiKey);
  
  try {
    console.log('Testing Alpha Vantage API with SPY...');
    const quote = await service.getGlobalQuote('SPY');
    console.log('✅ Successfully fetched SPY quote:', {
      symbol: quote.symbol,
      price: quote.close,
      date: quote.date,
      change: quote.change,
      changePercent: quote.changePercent + '%'
    });
    
    console.log('\nTesting daily data fetch...');
    const dailyData = await service.getDailyAdjusted('SPY', 5);
    console.log(`✅ Successfully fetched ${dailyData.length} days of SPY data`);
    console.log('Latest data point:', {
      date: dailyData[0].date,
      close: dailyData[0].adjustedClose,
      volume: dailyData[0].volume
    });
    
  } catch (error) {
    console.error('❌ Alpha Vantage test failed:', error);
    process.exit(1);
  }
}

testAlphaVantage();