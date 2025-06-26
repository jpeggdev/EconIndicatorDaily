import axios from 'axios';

async function debugAlphaVantage() {
  const apiKey = 'CW6TYKT3WC5Z3G03';
  const url = 'https://www.alphavantage.co/query';
  
  try {
    console.log('Testing TIME_SERIES_DAILY_ADJUSTED for SPY...');
    const response = await axios.get(url, {
      params: {
        function: 'TIME_SERIES_DAILY_ADJUSTED',
        symbol: 'SPY',
        apikey: apiKey,
        outputsize: 'compact'
      }
    });
    
    console.log('Response keys:', Object.keys(response.data));
    console.log('Response data:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.error('API call failed:', error);
  }
}

debugAlphaVantage();