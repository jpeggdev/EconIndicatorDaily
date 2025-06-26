// RapidAPI Bull/Bear Advisor Types and Interfaces

export interface BullBearStock {
  symbol: string;
  signal: 'Bull' | 'Bear';
  rating: 'Strong' | 'Moderate' | 'Weak';
  volume: number;
  price: number;
  change: number;
  changePercent: number;
  pattern?: 'Bullish Engulfing' | 'Bearish Engulfing' | 'Bullish Harami' | 'Bearish Harami' | 'Doji' | 'Hammer' | 'Shooting Star';
  date: string;
  marketCap?: number;
  sector?: string;
}

export interface BullBearResponse {
  success: boolean;
  timestamp: string;
  tradingDate: string;
  totalStocks: number;
  bullishStocks: number;
  bearishStocks: number;
  stocks: BullBearStock[];
  marketSentiment: 'Bullish' | 'Bearish' | 'Neutral';
  confidenceScore: number; // 0-100
}

// Processed market sentiment data for our indicators
export interface ProcessedMarketSentiment {
  date: Date;
  bullishCount: number;
  bearishCount: number;
  neutralCount: number;
  bullBearRatio: number; // bullish / bearish
  marketSentiment: 'Bullish' | 'Bearish' | 'Neutral';
  confidenceScore: number;
  strongSignalCount: number;
  totalVolume: number;
  avgVolumePerStock: number;
  topBullishStocks: string[];
  topBearishStocks: string[];
}

// Economic indicators derived from Bull/Bear data
export interface RapidAPIEconomicIndicator {
  name: string;
  code: string;
  description: string;
  category: 'market_sentiment' | 'trading_signals' | 'market_psychology';
  frequency: 'daily';
  unit: string;
  source: 'RAPIDAPI_BULLBEAR';
  calculationMethod: 'ratio' | 'count' | 'average' | 'percentage';
  tier: 'basic' | 'pro' | 'ultra';
}

// Core RapidAPI indicators we'll track
export const coreRapidAPIIndicators: RapidAPIEconomicIndicator[] = [
  {
    name: 'Bull/Bear Market Ratio',
    code: 'RAPID_BULL_BEAR_RATIO',
    description: 'Daily ratio of bullish to bearish stock signals from market analysis',
    category: 'market_sentiment',
    frequency: 'daily',
    unit: 'RATIO',
    source: 'RAPIDAPI_BULLBEAR',
    calculationMethod: 'ratio',
    tier: 'basic',
  },
  {
    name: 'Market Sentiment Score',
    code: 'RAPID_MARKET_SENTIMENT',
    description: 'Daily market sentiment confidence score based on stock pattern analysis',
    category: 'market_psychology',
    frequency: 'daily',
    unit: 'PERCENT',
    source: 'RAPIDAPI_BULLBEAR',
    calculationMethod: 'average',
    tier: 'basic',
  },
  {
    name: 'Strong Signal Count',
    code: 'RAPID_STRONG_SIGNALS',
    description: 'Number of stocks showing strong bullish or bearish patterns',
    category: 'trading_signals',
    frequency: 'daily',
    unit: 'COUNT',
    source: 'RAPIDAPI_BULLBEAR',
    calculationMethod: 'count',
    tier: 'basic',
  },
  {
    name: 'Bullish Stock Percentage',
    code: 'RAPID_BULLISH_PERCENT',
    description: 'Percentage of analyzed stocks showing bullish patterns',
    category: 'market_sentiment',
    frequency: 'daily',
    unit: 'PERCENT',
    source: 'RAPIDAPI_BULLBEAR',
    calculationMethod: 'percentage',
    tier: 'basic',
  },
  {
    name: 'High Volume Signal Ratio',
    code: 'RAPID_VOLUME_SIGNALS',
    description: 'Ratio of high-volume bullish to bearish signals',
    category: 'trading_signals',
    frequency: 'daily',
    unit: 'RATIO',
    source: 'RAPIDAPI_BULLBEAR',
    calculationMethod: 'ratio',
    tier: 'pro',
  }
];

// API configuration
export const RAPIDAPI_CONFIG = {
  BASE_URL: 'https://bullbear-advisor.p.rapidapi.com',
  ENDPOINTS: {
    BASIC_SIGNALS: '/basic-signals',
    PRO_SIGNALS: '/pro-signals',
    ULTRA_SIGNALS: '/ultra-signals',
    MARKET_SENTIMENT: '/market-sentiment',
    HISTORICAL_DATA: '/historical/{date}',
  },
  HEADERS: {
    'X-RapidAPI-Key': '', // Will be set from environment
    'X-RapidAPI-Host': 'bullbear-advisor.p.rapidapi.com',
  },
} as const;

// Sentiment calculation weights
export const SENTIMENT_WEIGHTS = {
  STRONG_BULL: 3,
  MODERATE_BULL: 2,
  WEAK_BULL: 1,
  NEUTRAL: 0,
  WEAK_BEAR: -1,
  MODERATE_BEAR: -2,
  STRONG_BEAR: -3,
} as const;

// Volume thresholds for different analysis tiers
export const VOLUME_THRESHOLDS = {
  BASIC: 0,
  PRO: 100000,    // 100K shares minimum
  ULTRA: 1000000, // 1M shares minimum
} as const;