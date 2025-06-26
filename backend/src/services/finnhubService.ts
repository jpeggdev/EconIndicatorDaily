import axios from 'axios';
import { 
  FinnhubQuote, 
  FinnhubCandle, 
  FinnhubEconomicData, 
  FinnhubEconomicCalendar,
  FinnhubForexRates,
  ProcessedFinnhubData,
  FinnhubIndicator 
} from '../types/finnhub';

export class FinnhubService {
  private apiKey: string;
  private baseUrl = 'https://finnhub.io/api/v1';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async makeRequest<T>(endpoint: string, params: Record<string, any> = {}): Promise<T> {
    try {
      const response = await axios.get(`${this.baseUrl}${endpoint}`, {
        params: {
          ...params,
          token: this.apiKey
        }
      });

      return response.data;
    } catch (error) {
      console.error(`Finnhub API request failed for ${endpoint}:`, error);
      throw error;
    }
  }

  // Stock quotes and market data
  async getQuote(symbol: string): Promise<FinnhubQuote> {
    return this.makeRequest<FinnhubQuote>('/quote', { symbol });
  }

  async getCandles(
    symbol: string, 
    resolution: string = 'D', 
    from?: number, 
    to?: number
  ): Promise<FinnhubCandle> {
    const params: any = { symbol, resolution };
    if (from) params.from = from;
    if (to) params.to = to;
    
    return this.makeRequest<FinnhubCandle>('/stock/candle', params);
  }

  // Economic data
  async getEconomicData(indicator: string): Promise<FinnhubEconomicData> {
    return this.makeRequest<FinnhubEconomicData>('/economic/data', { indicator });
  }

  async getEconomicCalendar(from?: string, to?: string): Promise<FinnhubEconomicCalendar> {
    const params: any = {};
    if (from) params.from = from;
    if (to) params.to = to;
    
    return this.makeRequest<FinnhubEconomicCalendar>('/calendar/economic', params);
  }

  // Forex rates
  async getForexRates(base: string = 'USD'): Promise<FinnhubForexRates> {
    return this.makeRequest<FinnhubForexRates>('/forex/rates', { base });
  }

  // Crypto data
  async getCryptoCandles(
    symbol: string, 
    resolution: string = 'D', 
    from?: number, 
    to?: number
  ): Promise<FinnhubCandle> {
    const params: any = { symbol, resolution };
    if (from) params.from = from;
    if (to) params.to = to;
    
    return this.makeRequest<FinnhubCandle>('/crypto/candle', params);
  }

  // Process stock data for our database format
  async getProcessedStockData(symbol: string): Promise<ProcessedFinnhubData[]> {
    try {
      const [quote, candles] = await Promise.all([
        this.getQuote(symbol),
        this.getCandles(symbol, 'D', Math.floor(Date.now() / 1000) - 30 * 24 * 60 * 60) // Last 30 days
      ]);

      const processedData: ProcessedFinnhubData[] = [];

      // Add current quote
      if (quote && quote.c) {
        processedData.push({
          symbol,
          title: `${symbol} Stock Price`,
          date: new Date().toISOString().split('T')[0],
          value: quote.c,
          change: quote.d,
          changePercent: quote.dp,
          metadata: {
            high: quote.h,
            low: quote.l,
            open: quote.o,
            previousClose: quote.pc
          }
        });
      }

      // Add historical data from candles
      if (candles && candles.c && candles.t) {
        for (let i = 0; i < candles.c.length; i++) {
          processedData.push({
            symbol,
            title: `${symbol} Stock Price`,
            date: new Date(candles.t[i] * 1000).toISOString().split('T')[0],
            value: candles.c[i],
            metadata: {
              high: candles.h[i],
              low: candles.l[i],
              open: candles.o[i],
              volume: candles.v[i]
            }
          });
        }
      }

      return processedData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    } catch (error) {
      console.error(`Failed to process stock data for ${symbol}:`, error);
      return [];
    }
  }

  // Process economic data
  async getProcessedEconomicData(indicator: string, title: string): Promise<ProcessedFinnhubData[]> {
    try {
      const data = await this.getEconomicData(indicator);
      
      return data.data.map(point => ({
        symbol: indicator,
        title,
        date: point.period,
        value: point.value
      })).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    } catch (error) {
      console.error(`Failed to process economic data for ${indicator}:`, error);
      return [];
    }
  }

  // Process forex data
  async getProcessedForexData(base: string = 'USD'): Promise<ProcessedFinnhubData[]> {
    try {
      const rates = await this.getForexRates(base);
      const processedData: ProcessedFinnhubData[] = [];
      const currentDate = new Date().toISOString().split('T')[0];

      // Convert forex rates to our format
      Object.entries(rates.quote).forEach(([currency, rate]) => {
        processedData.push({
          symbol: `${base}${currency}`,
          title: `${base}/${currency} Exchange Rate`,
          date: currentDate,
          value: rate
        });
      });

      return processedData;
    } catch (error) {
      console.error(`Failed to process forex data for ${base}:`, error);
      return [];
    }
  }

  // Process crypto data
  async getProcessedCryptoData(symbol: string, title: string): Promise<ProcessedFinnhubData[]> {
    try {
      const candles = await this.getCryptoCandles(
        symbol, 
        'D', 
        Math.floor(Date.now() / 1000) - 30 * 24 * 60 * 60 // Last 30 days
      );

      if (!candles || !candles.c || !candles.t) {
        return [];
      }

      const processedData: ProcessedFinnhubData[] = [];

      for (let i = 0; i < candles.c.length; i++) {
        processedData.push({
          symbol,
          title,
          date: new Date(candles.t[i] * 1000).toISOString().split('T')[0],
          value: candles.c[i],
          metadata: {
            high: candles.h[i],
            low: candles.l[i],
            open: candles.o[i],
            volume: candles.v[i]
          }
        });
      }

      return processedData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    } catch (error) {
      console.error(`Failed to process crypto data for ${symbol}:`, error);
      return [];
    }
  }
}

// Core indicators we'll track with Finnhub
export const coreFinnhubIndicators: FinnhubIndicator[] = [
  // Major Stock Indices
  {
    code: '^GSPC',
    name: 'S&P 500 Index',
    country: 'US',
    category: 'market_indices',
    frequency: 'daily',
    description: 'Standard & Poor\'s 500 Index'
  },
  {
    code: '^DJI',
    name: 'Dow Jones Industrial Average',
    country: 'US',
    category: 'market_indices',
    frequency: 'daily',
    description: 'Dow Jones Industrial Average'
  },
  {
    code: '^IXIC',
    name: 'NASDAQ Composite',
    country: 'US',
    category: 'market_indices',
    frequency: 'daily',
    description: 'NASDAQ Composite Index'
  },

  // Major Forex Pairs
  {
    code: 'EURUSD',
    name: 'EUR/USD Exchange Rate',
    country: 'Global',
    category: 'forex',
    frequency: 'daily',
    description: 'Euro to US Dollar exchange rate'
  },
  {
    code: 'GBPUSD',
    name: 'GBP/USD Exchange Rate', 
    country: 'Global',
    category: 'forex',
    frequency: 'daily',
    description: 'British Pound to US Dollar exchange rate'
  },
  {
    code: 'USDJPY',
    name: 'USD/JPY Exchange Rate',
    country: 'Global', 
    category: 'forex',
    frequency: 'daily',
    description: 'US Dollar to Japanese Yen exchange rate'
  },

  // Major Cryptocurrencies
  {
    code: 'BINANCE:BTCUSDT',
    name: 'Bitcoin Price',
    country: 'Global',
    category: 'cryptocurrency',
    frequency: 'daily',
    description: 'Bitcoin price in USD'
  },
  {
    code: 'BINANCE:ETHUSDT',
    name: 'Ethereum Price',
    country: 'Global',
    category: 'cryptocurrency', 
    frequency: 'daily',
    description: 'Ethereum price in USD'
  },

  // Economic Indicators (using Finnhub economic data codes)
  {
    code: 'US_GDP',
    name: 'US GDP Growth Rate',
    country: 'US',
    category: 'economic_growth',
    frequency: 'quarterly',
    description: 'US Gross Domestic Product growth rate'
  },
  {
    code: 'US_CPI',
    name: 'US Consumer Price Index',
    country: 'US', 
    category: 'inflation',
    frequency: 'monthly',
    description: 'US Consumer Price Index'
  }
];