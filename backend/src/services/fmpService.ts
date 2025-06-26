import axios from 'axios';
import { 
  FMPQuote,
  FMPHistoricalPrice,
  FMPCommodity,
  FMPTreasuryRate,
  FMPEconomicIndicator,
  ProcessedFMPData,
  FMPIndicator 
} from '../types/fmp';

export class FMPService {
  private apiKey: string;
  private baseUrl = 'https://financialmodelingprep.com/api/v3';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async makeRequest<T>(endpoint: string, params: Record<string, any> = {}): Promise<T> {
    try {
      const response = await axios.get(`${this.baseUrl}${endpoint}`, {
        params: {
          ...params,
          apikey: this.apiKey
        }
      });

      return response.data;
    } catch (error) {
      console.error(`FMP API request failed for ${endpoint}:`, error);
      throw error;
    }
  }

  // Stock quotes
  async getQuote(symbol: string): Promise<FMPQuote[]> {
    return this.makeRequest<FMPQuote[]>(`/quote/${symbol}`);
  }

  async getHistoricalPrices(symbol: string, from?: string, to?: string): Promise<{ historical: FMPHistoricalPrice[] }> {
    const params: any = {};
    if (from) params.from = from;
    if (to) params.to = to;
    
    return this.makeRequest<{ historical: FMPHistoricalPrice[] }>(`/historical-price-full/${symbol}`, params);
  }

  // Commodities
  async getCommoditiesList(): Promise<FMPCommodity[]> {
    return this.makeRequest<FMPCommodity[]>('/quotes/commodity');
  }

  async getCommodityHistoricalPrices(symbol: string): Promise<{ historical: FMPHistoricalPrice[] }> {
    return this.makeRequest<{ historical: FMPHistoricalPrice[] }>(`/historical-price-full/${symbol}`);
  }

  // Treasury rates
  async getTreasuryRates(): Promise<FMPTreasuryRate[]> {
    return this.makeRequest<FMPTreasuryRate[]>('/treasury');
  }

  // Economic indicators
  async getEconomicIndicator(indicator: string): Promise<FMPEconomicIndicator[]> {
    return this.makeRequest<FMPEconomicIndicator[]>(`/economic_indicator/${indicator}`);
  }

  // Process stock data
  async getProcessedStockData(symbol: string): Promise<ProcessedFMPData[]> {
    try {
      const [quotes, historical] = await Promise.all([
        this.getQuote(symbol),
        this.getHistoricalPrices(symbol)
      ]);

      const processedData: ProcessedFMPData[] = [];

      // Add current quote
      if (quotes && quotes.length > 0) {
        const quote = quotes[0];
        processedData.push({
          symbol: quote.symbol,
          title: `${quote.name || quote.symbol} Stock Price`,
          date: new Date(quote.timestamp * 1000).toISOString().split('T')[0],
          value: quote.price,
          change: quote.change,
          changePercent: quote.changesPercentage,
          metadata: {
            high: quote.dayHigh,
            low: quote.dayLow,
            open: quote.open,
            volume: quote.volume,
            marketCap: quote.marketCap
          }
        });
      }

      // Add historical data (last 30 days)
      if (historical?.historical) {
        historical.historical.slice(0, 30).forEach(point => {
          processedData.push({
            symbol,
            title: `${symbol} Stock Price`,
            date: point.date,
            value: point.close,
            change: point.change,
            changePercent: point.changePercent,
            metadata: {
              high: point.high,
              low: point.low,
              open: point.open,
              volume: point.volume
            }
          });
        });
      }

      return processedData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    } catch (error) {
      console.error(`Failed to process stock data for ${symbol}:`, error);
      return [];
    }
  }

  // Process commodity data
  async getProcessedCommodityData(symbol: string): Promise<ProcessedFMPData[]> {
    try {
      const commodities = await this.getCommoditiesList();
      const commodity = commodities.find(c => c.symbol === symbol);
      
      if (!commodity) {
        return [];
      }

      const historical = await this.getCommodityHistoricalPrices(symbol);
      const processedData: ProcessedFMPData[] = [];

      // Add current price
      processedData.push({
        symbol: commodity.symbol,
        title: `${commodity.name} Price`,
        date: new Date(commodity.timestamp * 1000).toISOString().split('T')[0],
        value: commodity.price,
        change: commodity.change,
        changePercent: commodity.changesPercentage,
        metadata: {
          high: commodity.dayHigh,
          low: commodity.dayLow,
          open: commodity.open,
          volume: commodity.volume
        }
      });

      // Add historical data (last 30 days)
      if (historical?.historical) {
        historical.historical.slice(0, 30).forEach(point => {
          processedData.push({
            symbol,
            title: `${commodity.name} Price`,
            date: point.date,
            value: point.close,
            change: point.change,
            changePercent: point.changePercent,
            metadata: {
              high: point.high,
              low: point.low,
              open: point.open,
              volume: point.volume
            }
          });
        });
      }

      return processedData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    } catch (error) {
      console.error(`Failed to process commodity data for ${symbol}:`, error);
      return [];
    }
  }

  // Process treasury rates
  async getProcessedTreasuryData(): Promise<ProcessedFMPData[]> {
    try {
      const rates = await this.getTreasuryRates();
      const processedData: ProcessedFMPData[] = [];

      if (rates && rates.length > 0) {
        const latestRates = rates[0];
        
        // Convert each maturity to a separate indicator
        const maturities = [
          { key: 'month1', name: '1 Month Treasury Rate', symbol: 'DGS1MO' },
          { key: 'month3', name: '3 Month Treasury Rate', symbol: 'DGS3MO' },
          { key: 'month6', name: '6 Month Treasury Rate', symbol: 'DGS6MO' },
          { key: 'year1', name: '1 Year Treasury Rate', symbol: 'DGS1' },
          { key: 'year2', name: '2 Year Treasury Rate', symbol: 'DGS2' },
          { key: 'year5', name: '5 Year Treasury Rate', symbol: 'DGS5' },
          { key: 'year10', name: '10 Year Treasury Rate', symbol: 'DGS10' },
          { key: 'year30', name: '30 Year Treasury Rate', symbol: 'DGS30' }
        ];

        maturities.forEach(maturity => {
          const value = latestRates[maturity.key as keyof FMPTreasuryRate];
          if (typeof value === 'number' && !isNaN(value)) {
            processedData.push({
              symbol: maturity.symbol,
              title: maturity.name,
              date: latestRates.date,
              value: value
            });
          }
        });

        // Add historical data for key rates
        rates.slice(0, 30).forEach(ratePoint => {
          if (ratePoint.year10 && !isNaN(ratePoint.year10)) {
            processedData.push({
              symbol: 'DGS10',
              title: '10 Year Treasury Rate',
              date: ratePoint.date,
              value: ratePoint.year10
            });
          }
        });
      }

      return processedData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    } catch (error) {
      console.error('Failed to process treasury data:', error);
      return [];
    }
  }

  // Process economic indicators
  async getProcessedEconomicIndicator(indicator: string, title: string): Promise<ProcessedFMPData[]> {
    try {
      const data = await this.getEconomicIndicator(indicator);
      
      return data.map(point => ({
        symbol: indicator,
        title,
        date: point.date,
        value: point.value
      })).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    } catch (error) {
      console.error(`Failed to process economic indicator ${indicator}:`, error);
      return [];
    }
  }
}

// Core indicators we'll track with FMP
export const coreFMPIndicators: FMPIndicator[] = [
  // Major Commodities
  {
    symbol: 'GCUSD',
    name: 'Gold Price',
    category: 'commodities',
    frequency: 'daily',
    description: 'Gold spot price in USD',
    unit: 'USD per troy ounce'
  },
  {
    symbol: 'SIUSD',
    name: 'Silver Price',
    category: 'commodities',
    frequency: 'daily',
    description: 'Silver spot price in USD',
    unit: 'USD per troy ounce'
  },
  {
    symbol: 'CLUSD',
    name: 'Crude Oil Price',
    category: 'commodities',
    frequency: 'daily',
    description: 'WTI Crude Oil price in USD',
    unit: 'USD per barrel'
  },
  {
    symbol: 'NGUSD',
    name: 'Natural Gas Price',
    category: 'commodities',
    frequency: 'daily',
    description: 'Natural Gas price in USD',
    unit: 'USD per MMBtu'
  },

  // Treasury Rates
  {
    symbol: 'DGS10',
    name: '10 Year Treasury Rate',
    category: 'interest_rates',
    frequency: 'daily',
    description: '10-Year Treasury Constant Maturity Rate',
    unit: 'Percent'
  },
  {
    symbol: 'DGS2',
    name: '2 Year Treasury Rate',
    category: 'interest_rates',
    frequency: 'daily',
    description: '2-Year Treasury Constant Maturity Rate',
    unit: 'Percent'
  },
  {
    symbol: 'DGS30',
    name: '30 Year Treasury Rate',
    category: 'interest_rates',
    frequency: 'daily',
    description: '30-Year Treasury Constant Maturity Rate',
    unit: 'Percent'
  },

  // International Indices
  {
    symbol: 'FTSE',
    name: 'FTSE 100 Index',
    category: 'market_indices',
    frequency: 'daily',
    description: 'Financial Times Stock Exchange 100 Index'
  },
  {
    symbol: 'DAX',
    name: 'DAX Index',
    category: 'market_indices',
    frequency: 'daily',
    description: 'German Stock Index DAX'
  },
  {
    symbol: 'N225',
    name: 'Nikkei 225',
    category: 'market_indices',
    frequency: 'daily',
    description: 'Nikkei 225 Index'
  }
];