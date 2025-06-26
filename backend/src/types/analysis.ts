export interface EconomicInsight {
  id: string;
  indicatorId: string;
  indicatorName: string;
  currentValue: number;
  previousValue: number;
  changePercent: number;
  trend: 'rising' | 'falling' | 'stable';
  significance: 'low' | 'medium' | 'high' | 'critical';
  narrative: string;
  investmentImplication: string;
  historicalContext: string;
  relatedIndicators: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface EconomicHealthScore {
  id: string;
  overallScore: number; // 0-100
  trend: 'improving' | 'deteriorating' | 'stable';
  components: {
    laborMarket: number;
    inflation: number;
    economicGrowth: number;
    fiscalHealth: number;
    marketConditions: number;
  };
  narrative: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  createdAt: Date;
}

export interface CorrelationAnalysis {
  id: string;
  indicator1Id: string;
  indicator2Id: string;
  indicator1Name: string;
  indicator2Name: string;
  correlationCoeff: number; // -1 to 1
  strength: 'weak' | 'moderate' | 'strong' | 'very_strong';
  direction: 'positive' | 'negative';
  lagDays: number; // How many days indicator1 leads/lags indicator2
  confidence: number; // 0-100
  narrative: string;
  lastUpdated: Date;
}

export interface TrendAnalysis {
  direction: 'up' | 'down' | 'sideways';
  strength: number; // 0-100
  duration: number; // days
  volatility: number; // 0-100
  momentum: number; // -100 to 100
}

export interface MarketSignal {
  type: 'recession_risk' | 'inflation_pressure' | 'rate_change' | 'growth_slowdown';
  strength: number; // 0-100
  confidence: number; // 0-100
  narrative: string;
  triggerIndicators: string[];
  historicalPrecedent: string;
}

export interface AnalysisRequest {
  indicatorIds?: string[];
  analysisType: 'insight' | 'health_score' | 'correlation' | 'market_signals';
  timeframe?: 'week' | 'month' | 'quarter' | 'year';
  includeForecasting?: boolean;
}

export interface AnalysisResponse {
  insights?: EconomicInsight[];
  healthScore?: EconomicHealthScore;
  correlations?: CorrelationAnalysis[];
  marketSignals?: MarketSignal[];
  lastUpdated: Date;
  dataQuality: number; // 0-100
}