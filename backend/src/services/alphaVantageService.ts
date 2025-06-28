import axios from 'axios';
import { AlphaVantageTimeSeriesResponse, AlphaVantageGlobalQuoteResponse, MarketDataPoint } from '../types/alphaVantage';

export class AlphaVantageService {
  private apiKey: string;
  private baseUrl = 'https://www.alphavantage.co/query';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async getDailyAdjusted(symbol: string, limit = 100): Promise<MarketDataPoint[]> {
    // Use TIME_SERIES_DAILY (free) instead of TIME_SERIES_DAILY_ADJUSTED (premium)
    const response = await axios.get(this.baseUrl, {
      params: {
        function: 'TIME_SERIES_DAILY',
        symbol,
        apikey: this.apiKey,
        outputsize: 'compact' // Last 100 data points
      }
    });

    const timeSeries = response.data['Time Series (Daily)'];
    if (!timeSeries) {
      throw new Error(`No data found for symbol: ${symbol}. Response: ${JSON.stringify(response.data)}`);
    }

    return Object.entries(timeSeries)
      .slice(0, limit)
      .map(([date, data]: [string, any]) => ({
        symbol,
        date,
        open: parseFloat(data['1. open']),
        high: parseFloat(data['2. high']),
        low: parseFloat(data['3. low']),
        close: parseFloat(data['4. close']),
        adjustedClose: parseFloat(data['4. close']), // Use close as adjusted close for free tier
        volume: parseInt(data['5. volume'])
      }));
  }

  async getGlobalQuote(symbol: string): Promise<MarketDataPoint> {
    const response = await axios.get<AlphaVantageGlobalQuoteResponse>(this.baseUrl, {
      params: {
        function: 'GLOBAL_QUOTE',
        symbol,
        apikey: this.apiKey
      }
    });

    const quote = response.data['Global Quote'];
    if (!quote) {
      throw new Error(`No quote data found for symbol: ${symbol}`);
    }

    return {
      symbol: quote['01. symbol'],
      date: quote['07. latest trading day'],
      open: parseFloat(quote['02. open']),
      high: parseFloat(quote['03. high']),
      low: parseFloat(quote['04. low']),
      close: parseFloat(quote['05. price']),
      adjustedClose: parseFloat(quote['05. price']),
      volume: parseInt(quote['06. volume']),
      change: parseFloat(quote['09. change']),
      changePercent: parseFloat(quote['10. change percent'].replace('%', ''))
    };
  }

  async getMultipleQuotes(symbols: string[]): Promise<MarketDataPoint[]> {
    const quotes: MarketDataPoint[] = [];
    
    // Process symbols sequentially to respect rate limits (5 calls/minute)
    for (const symbol of symbols) {
      try {
        const quote = await this.getGlobalQuote(symbol);
        quotes.push(quote);
        
        // Add delay between calls to respect rate limits
        if (symbols.indexOf(symbol) < symbols.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 12000)); // 12 seconds between calls
        }
      } catch (error) {
        console.error(`Failed to fetch quote for ${symbol}:`, error);
      }
    }
    
    return quotes;
  }
}

export const coreMarketIndicators = [
  {
    symbol: 'SPY',
    name: 'SPDR S&P 500 ETF',
    category: 'market_index',
    description: 'Tracks the S&P 500 index representing large-cap US stocks'
  },
  {
    symbol: 'VTI',
    name: 'Vanguard Total Stock Market ETF',
    category: 'market_index',
    description: 'Tracks the entire US stock market including small, mid, and large-cap stocks'
  },
  {
    symbol: 'QQQ',
    name: 'Invesco QQQ ETF',
    category: 'market_index',
    description: 'Tracks the Nasdaq-100 index, heavily weighted toward technology companies'
  },
  {
    symbol: 'DIA',
    name: 'SPDR Dow Jones Industrial Average ETF',
    category: 'market_index',
    description: 'Tracks the Dow Jones Industrial Average of 30 large US companies'
  },
  {
    symbol: 'VXX',
    name: 'CBOE Volatility Index',
    category: 'volatility',
    description: 'VIX futures ETF tracking CBOE Volatility Index'
  },
  {
    symbol: 'VXX',
    name: 'iPath Series B S&P 500 VIX Short-Term Futures ETN',
    category: 'volatility',
    description: 'Tracks short-term VIX futures, providing exposure to market volatility'
  }
];