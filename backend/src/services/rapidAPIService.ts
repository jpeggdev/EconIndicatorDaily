import axios, { AxiosInstance } from 'axios';
import {
  BullBearStock,
  BullBearResponse,
  ProcessedMarketSentiment,
  RapidAPIEconomicIndicator,
  coreRapidAPIIndicators,
  RAPIDAPI_CONFIG,
  SENTIMENT_WEIGHTS,
  VOLUME_THRESHOLDS
} from '../types/rapidapi';

export { coreRapidAPIIndicators } from '../types/rapidapi';

export class RapidAPIService {
  private apiClient: AxiosInstance;
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    
    this.apiClient = axios.create({
      baseURL: RAPIDAPI_CONFIG.BASE_URL,
      timeout: 15000,
      headers: {
        ...RAPIDAPI_CONFIG.HEADERS,
        'X-RapidAPI-Key': apiKey,
      },
    });
  }

  // Get basic bull/bear signals (10 stocks)
  async getBasicSignals(): Promise<BullBearStock[]> {
    try {
      console.log('📊 Fetching basic Bull/Bear signals...');
      
      const response = await this.apiClient.get(RAPIDAPI_CONFIG.ENDPOINTS.BASIC_SIGNALS);
      
      if (response.data && Array.isArray(response.data)) {
        return response.data;
      }
      
      // Handle different response formats
      if (response.data.stocks && Array.isArray(response.data.stocks)) {
        return response.data.stocks;
      }
      
      console.warn('Unexpected response format from Bull/Bear API:', response.data);
      return [];
      
    } catch (error) {
      console.error('Failed to fetch basic Bull/Bear signals:', error);
      
      // Return mock data for development/testing
      return this.getMockBullBearData();
    }
  }

  // Get pro signals with volume filtering
  async getProSignals(minVolume: number = VOLUME_THRESHOLDS.PRO): Promise<BullBearStock[]> {
    try {
      console.log(`📊 Fetching pro Bull/Bear signals (min volume: ${minVolume})...`);
      
      const response = await this.apiClient.get(RAPIDAPI_CONFIG.ENDPOINTS.PRO_SIGNALS, {
        params: { minVolume }
      });
      
      if (response.data && Array.isArray(response.data)) {
        return response.data;
      }
      
      if (response.data.stocks && Array.isArray(response.data.stocks)) {
        return response.data.stocks;
      }
      
      console.warn('Unexpected response format from Pro Bull/Bear API:', response.data);
      return [];
      
    } catch (error) {
      console.error('Failed to fetch pro Bull/Bear signals:', error);
      
      // Fallback to basic signals if pro fails
      return this.getBasicSignals();
    }
  }

  // Get ultra signals with comprehensive filtering
  async getUltraSignals(minVolume: number = VOLUME_THRESHOLDS.ULTRA): Promise<BullBearStock[]> {
    try {
      console.log(`📊 Fetching ultra Bull/Bear signals (min volume: ${minVolume})...`);
      
      const response = await this.apiClient.get(RAPIDAPI_CONFIG.ENDPOINTS.ULTRA_SIGNALS, {
        params: { minVolume }
      });
      
      if (response.data && Array.isArray(response.data)) {
        return response.data;
      }
      
      if (response.data.stocks && Array.isArray(response.data.stocks)) {
        return response.data.stocks;
      }
      
      console.warn('Unexpected response format from Ultra Bull/Bear API:', response.data);
      return [];
      
    } catch (error) {
      console.error('Failed to fetch ultra Bull/Bear signals:', error);
      
      // Fallback to pro signals if ultra fails
      return this.getProSignals(minVolume);
    }
  }

  // Process market sentiment from stock signals
  private processBullBearData(stocks: BullBearStock[]): ProcessedMarketSentiment {
    const bullishStocks = stocks.filter(stock => stock.signal === 'Bull');
    const bearishStocks = stocks.filter(stock => stock.signal === 'Bear');
    
    const bullishCount = bullishStocks.length;
    const bearishCount = bearishStocks.length;
    const neutralCount = stocks.length - bullishCount - bearishCount;
    
    // Calculate bull/bear ratio (avoid division by zero)
    const bullBearRatio = bearishCount > 0 ? bullishCount / bearishCount : bullishCount > 0 ? 10 : 1;
    
    // Determine overall market sentiment
    let marketSentiment: 'Bullish' | 'Bearish' | 'Neutral';
    if (bullBearRatio > 1.5) {
      marketSentiment = 'Bullish';
    } else if (bullBearRatio < 0.67) {
      marketSentiment = 'Bearish';
    } else {
      marketSentiment = 'Neutral';
    }
    
    // Calculate confidence score based on signal strength and volume
    const strongSignals = stocks.filter(stock => stock.rating === 'Strong');
    const totalVolume = stocks.reduce((sum, stock) => sum + (stock.volume || 0), 0);
    const avgVolumePerStock = stocks.length > 0 ? totalVolume / stocks.length : 0;
    
    // Confidence based on ratio strength and signal quality
    let confidenceScore = Math.min(100, Math.abs(bullBearRatio - 1) * 50 + (strongSignals.length / stocks.length) * 50);
    
    return {
      date: new Date(),
      bullishCount,
      bearishCount,
      neutralCount,
      bullBearRatio,
      marketSentiment,
      confidenceScore: Math.round(confidenceScore),
      strongSignalCount: strongSignals.length,
      totalVolume,
      avgVolumePerStock,
      topBullishStocks: bullishStocks
        .filter(stock => stock.rating === 'Strong')
        .sort((a, b) => (b.volume || 0) - (a.volume || 0))
        .slice(0, 5)
        .map(stock => stock.symbol),
      topBearishStocks: bearishStocks
        .filter(stock => stock.rating === 'Strong')
        .sort((a, b) => (b.volume || 0) - (a.volume || 0))
        .slice(0, 5)
        .map(stock => stock.symbol),
    };
  }

  // Get processed market sentiment data
  async getMarketSentiment(tier: 'basic' | 'pro' | 'ultra' = 'basic'): Promise<ProcessedMarketSentiment> {
    let stocks: BullBearStock[] = [];
    
    try {
      switch (tier) {
        case 'basic':
          stocks = await this.getBasicSignals();
          break;
        case 'pro':
          stocks = await this.getProSignals();
          break;
        case 'ultra':
          stocks = await this.getUltraSignals();
          break;
      }
      
      return this.processBullBearData(stocks);
      
    } catch (error) {
      console.error(`Failed to get market sentiment for tier ${tier}:`, error);
      
      // Return neutral sentiment on error
      return {
        date: new Date(),
        bullishCount: 0,
        bearishCount: 0,
        neutralCount: 0,
        bullBearRatio: 1,
        marketSentiment: 'Neutral',
        confidenceScore: 0,
        strongSignalCount: 0,
        totalVolume: 0,
        avgVolumePerStock: 0,
        topBullishStocks: [],
        topBearishStocks: [],
      };
    }
  }

  // Process indicator data for specific metric
  async processIndicator(indicator: RapidAPIEconomicIndicator): Promise<{ date: Date; value: number }[]> {
    try {
      console.log(`📈 Processing RapidAPI indicator: ${indicator.name}`);
      
      const sentimentData = await this.getMarketSentiment(indicator.tier);
      let value: number;
      
      switch (indicator.calculationMethod) {
        case 'ratio':
          if (indicator.code === 'RAPID_BULL_BEAR_RATIO') {
            value = sentimentData.bullBearRatio;
          } else if (indicator.code === 'RAPID_VOLUME_SIGNALS') {
            // Calculate high-volume signal ratio
            const stocks = await this.getBasicSignals();
            const highVolumeStocks = stocks.filter(s => (s.volume || 0) > VOLUME_THRESHOLDS.PRO);
            const highVolumeBulls = highVolumeStocks.filter(s => s.signal === 'Bull').length;
            const highVolumeBears = highVolumeStocks.filter(s => s.signal === 'Bear').length;
            value = highVolumeBears > 0 ? highVolumeBulls / highVolumeBears : highVolumeBulls > 0 ? 10 : 1;
          } else {
            value = sentimentData.bullBearRatio;
          }
          break;
          
        case 'count':
          if (indicator.code === 'RAPID_STRONG_SIGNALS') {
            value = sentimentData.strongSignalCount;
          } else {
            value = sentimentData.bullishCount + sentimentData.bearishCount;
          }
          break;
          
        case 'average':
          if (indicator.code === 'RAPID_MARKET_SENTIMENT') {
            value = sentimentData.confidenceScore;
          } else {
            value = sentimentData.avgVolumePerStock;
          }
          break;
          
        case 'percentage':
          if (indicator.code === 'RAPID_BULLISH_PERCENT') {
            const total = sentimentData.bullishCount + sentimentData.bearishCount + sentimentData.neutralCount;
            value = total > 0 ? (sentimentData.bullishCount / total) * 100 : 50;
          } else {
            value = sentimentData.confidenceScore;
          }
          break;
          
        default:
          value = sentimentData.bullBearRatio;
      }
      
      return [{
        date: sentimentData.date,
        value: Math.round(value * 100) / 100, // Round to 2 decimal places
      }];
      
    } catch (error) {
      console.error(`Failed to process RapidAPI indicator ${indicator.name}:`, error);
      return [];
    }
  }

  // Get latest data for all indicators
  async getAllProcessedIndicators(): Promise<Map<string, { date: Date; value: number }[]>> {
    const results = new Map<string, { date: Date; value: number }[]>();
    
    console.log(`🚀 Processing ${coreRapidAPIIndicators.length} RapidAPI indicators`);
    
    for (const indicator of coreRapidAPIIndicators) {
      try {
        const data = await this.processIndicator(indicator);
        results.set(indicator.code, data);
        
        // Small delay to avoid overwhelming the API
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        console.error(`Failed to process indicator ${indicator.name}:`, error);
        results.set(indicator.code, []);
      }
    }
    
    console.log(`✅ Completed processing RapidAPI indicators`);
    return results;
  }

  // Test connection to RapidAPI
  async testConnection(): Promise<boolean> {
    try {
      console.log('🔗 Testing RapidAPI Bull/Bear Advisor connection...');
      const signals = await this.getBasicSignals();
      console.log(`✅ Successfully connected to RapidAPI (${signals.length} signals received)`);
      return signals.length > 0;
    } catch (error) {
      console.error('❌ RapidAPI connection test failed:', error);
      return false;
    }
  }

  // Mock data for development/testing
  private getMockBullBearData(): BullBearStock[] {
    return [
      {
        symbol: 'AAPL',
        signal: 'Bull',
        rating: 'Strong',
        volume: 50000000,
        price: 185.50,
        change: 2.30,
        changePercent: 1.26,
        pattern: 'Bullish Engulfing',
        date: new Date().toISOString(),
        sector: 'Technology',
      },
      {
        symbol: 'TSLA',
        signal: 'Bull',
        rating: 'Moderate',
        volume: 25000000,
        price: 245.80,
        change: 8.40,
        changePercent: 3.54,
        pattern: 'Bullish Harami',
        date: new Date().toISOString(),
        sector: 'Automotive',
      },
      {
        symbol: 'SPY',
        signal: 'Bear',
        rating: 'Strong',
        volume: 75000000,
        price: 445.20,
        change: -3.80,
        changePercent: -0.85,
        pattern: 'Bearish Engulfing',
        date: new Date().toISOString(),
        sector: 'ETF',
      },
      {
        symbol: 'QQQ',
        signal: 'Bear',
        rating: 'Moderate',
        volume: 40000000,
        price: 385.60,
        change: -2.10,
        changePercent: -0.54,
        pattern: 'Shooting Star',
        date: new Date().toISOString(),
        sector: 'ETF',
      },
      {
        symbol: 'MSFT',
        signal: 'Bull',
        rating: 'Strong',
        volume: 35000000,
        price: 420.75,
        change: 5.25,
        changePercent: 1.26,
        pattern: 'Hammer',
        date: new Date().toISOString(),
        sector: 'Technology',
      },
    ];
  }
}