// Finnhub API Types
export interface FinnhubQuote {
  c: number;  // Current price
  d: number;  // Change
  dp: number; // Percent change
  h: number;  // High price of the day
  l: number;  // Low price of the day
  o: number;  // Open price of the day
  pc: number; // Previous close price
  t: number;  // Timestamp
}

export interface FinnhubCandle {
  c: number[]; // Close prices
  h: number[]; // High prices
  l: number[]; // Low prices
  o: number[]; // Open prices
  s: string;   // Status
  t: number[]; // Timestamps
  v: number[]; // Volume
}

export interface FinnhubEconomicData {
  code: string;
  country: string;
  data: Array<{
    period: string;
    value: number;
  }>;
}

export interface FinnhubEconomicCalendar {
  economicCalendar: Array<{
    actual: number;
    country: string;
    estimate: number;
    event: string;
    impact: string;
    prev: number;
    time: string;
    unit: string;
  }>;
}

export interface FinnhubForexRates {
  quote: Record<string, number>;
}

export interface FinnhubCryptoCandle {
  c: number[]; // Close prices
  h: number[]; // High prices
  l: number[]; // Low prices
  o: number[]; // Open prices
  s: string;   // Status
  t: number[]; // Timestamps
  v: number[]; // Volume
}

export interface ProcessedFinnhubData {
  symbol: string;
  title: string;
  date: string;
  value: number;
  change?: number;
  changePercent?: number;
  metadata?: {
    high?: number;
    low?: number;
    open?: number;
    volume?: number;
    previousClose?: number;
  };
}

// Economic Indicators supported by Finnhub
export interface FinnhubIndicator {
  code: string;
  name: string;
  country: string;
  category: string;
  frequency: string;
  description: string;
  unit?: string;
}