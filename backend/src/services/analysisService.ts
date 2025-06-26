import { PrismaClient } from '@prisma/client';
import { EconomicInsight, EconomicHealthScore, CorrelationAnalysis, TrendAnalysis, MarketSignal } from '../types/analysis';

export class AnalysisService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  // AI Economic Storytelling Engine
  async generateEconomicInsight(indicatorName: string): Promise<EconomicInsight | null> {
    try {
      // Get latest indicator data
      const indicator = await this.prisma.economicIndicator.findUnique({
        where: { name: indicatorName },
        include: {
          data: {
            orderBy: { date: 'desc' },
            take: 12 // Get last 12 data points for trend analysis
          }
        }
      });

      if (!indicator || indicator.data.length < 2) {
        return null;
      }

      const latestData = indicator.data[0];
      const previousData = indicator.data[1];
      const historicalData = indicator.data;

      // Calculate trend metrics
      const currentValue = latestData.value;
      const previousValue = previousData.value;
      const changePercent = ((currentValue - previousValue) / previousValue) * 100;

      // Determine trend direction and significance
      const trend = this.determineTrend(historicalData);
      const significance = this.assessSignificance(changePercent, indicator.category, indicator.source);

      // Generate AI narrative
      const narrative = this.generateNarrative(indicator, currentValue, previousValue, changePercent, trend);
      const investmentImplication = this.generateInvestmentImplication(indicator, trend, changePercent);
      const historicalContext = this.generateHistoricalContext(indicator, currentValue, historicalData);

      // Find related indicators
      const relatedIndicators = await this.findRelatedIndicators(indicator.category, indicator.source);

      return {
        id: `insight_${indicator.id}_${Date.now()}`,
        indicatorId: indicator.id,
        indicatorName: indicator.name,
        currentValue,
        previousValue,
        changePercent,
        trend: trend.direction === 'up' ? 'rising' : trend.direction === 'down' ? 'falling' : 'stable',
        significance,
        narrative,
        investmentImplication,
        historicalContext,
        relatedIndicators,
        createdAt: new Date(),
        updatedAt: new Date()
      };

    } catch (error) {
      console.error(`Failed to generate insight for ${indicatorName}:`, error);
      return null;
    }
  }

  // Economic Health Score Calculator
  async calculateEconomicHealthScore(): Promise<EconomicHealthScore> {
    try {
      // Get key indicators for health score calculation
      const keyIndicators = await this.getKeyHealthIndicators();

      // Calculate component scores
      const laborMarket = await this.calculateLaborMarketScore(keyIndicators);
      const inflation = await this.calculateInflationScore(keyIndicators);
      const economicGrowth = await this.calculateGrowthScore(keyIndicators);
      const fiscalHealth = await this.calculateFiscalHealthScore(keyIndicators);
      const marketConditions = await this.calculateMarketScore(keyIndicators);

      // Calculate weighted overall score
      const overallScore = Math.round(
        (laborMarket * 0.25) +
        (inflation * 0.20) +
        (economicGrowth * 0.25) +
        (fiscalHealth * 0.15) +
        (marketConditions * 0.15)
      );

      // Determine trend and risk level
      const trend = this.determineHealthTrend(overallScore, keyIndicators);
      const riskLevel = this.assessRiskLevel(overallScore);

      // Generate health narrative
      const narrative = this.generateHealthNarrative(overallScore, {
        laborMarket,
        inflation,
        economicGrowth,
        fiscalHealth,
        marketConditions
      }, trend, riskLevel);

      return {
        id: `health_${Date.now()}`,
        overallScore,
        trend,
        components: {
          laborMarket,
          inflation,
          economicGrowth,
          fiscalHealth,
          marketConditions
        },
        narrative,
        riskLevel,
        createdAt: new Date()
      };

    } catch (error) {
      console.error('Failed to calculate economic health score:', error);
      throw error;
    }
  }

  // Smart Correlation Analysis
  async analyzeCorrelations(): Promise<CorrelationAnalysis[]> {
    try {
      const correlations: CorrelationAnalysis[] = [];
      
      // Get all active indicators
      const indicators = await this.prisma.economicIndicator.findMany({
        where: { isActive: true },
        include: {
          data: {
            orderBy: { date: 'desc' },
            take: 100 // Get enough data for correlation analysis
          }
        }
      });

      // Calculate correlations between key indicator pairs
      const keyPairs = this.getKeyIndicatorPairs();
      
      for (const pair of keyPairs) {
        const indicator1 = indicators.find(i => i.name === pair.indicator1);
        const indicator2 = indicators.find(i => i.name === pair.indicator2);

        if (indicator1 && indicator2 && indicator1.data.length > 20 && indicator2.data.length > 20) {
          const correlation = await this.calculateCorrelation(indicator1, indicator2);
          if (correlation) {
            correlations.push(correlation);
          }
        }
      }

      return correlations.sort((a, b) => Math.abs(b.correlationCoeff) - Math.abs(a.correlationCoeff));

    } catch (error) {
      console.error('Failed to analyze correlations:', error);
      return [];
    }
  }

  // Helper Methods for Trend Analysis
  private determineTrend(data: any[]): TrendAnalysis {
    if (data.length < 3) {
      return { direction: 'sideways', strength: 0, duration: 0, volatility: 0, momentum: 0 };
    }

    // Simple trend analysis using linear regression
    const values = data.slice(0, 6).map(d => d.value).reverse(); // Last 6 periods
    const n = values.length;
    const sumX = (n * (n + 1)) / 2;
    const sumY = values.reduce((a, b) => a + b, 0);
    const sumXY = values.reduce((sum, y, i) => sum + (i + 1) * y, 0);
    const sumX2 = (n * (n + 1) * (2 * n + 1)) / 6;

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const direction = slope > 0.1 ? 'up' : slope < -0.1 ? 'down' : 'sideways';
    
    // Calculate volatility (coefficient of variation)
    const mean = sumY / n;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / n;
    const volatility = Math.min(100, (Math.sqrt(variance) / mean) * 100);

    return {
      direction,
      strength: Math.min(100, Math.abs(slope) * 100),
      duration: direction === 'sideways' ? 0 : Math.min(data.length, 30),
      volatility: isNaN(volatility) ? 0 : volatility,
      momentum: Math.max(-100, Math.min(100, slope * 1000))
    };
  }

  private assessSignificance(changePercent: number, category: string, source: string): 'low' | 'medium' | 'high' | 'critical' {
    const absChange = Math.abs(changePercent);
    
    // Adjust thresholds based on indicator type
    if (category === 'employment' || category === 'inflation') {
      if (absChange > 5) return 'critical';
      if (absChange > 2) return 'high';
      if (absChange > 0.5) return 'medium';
      return 'low';
    }
    
    if (category === 'market_indices') {
      if (absChange > 10) return 'critical';
      if (absChange > 5) return 'high';
      if (absChange > 2) return 'medium';
      return 'low';
    }

    // Default thresholds
    if (absChange > 10) return 'critical';
    if (absChange > 5) return 'high';
    if (absChange > 1) return 'medium';
    return 'low';
  }

  private generateNarrative(indicator: any, currentValue: number, previousValue: number, changePercent: number, trend: TrendAnalysis): string {
    const direction = changePercent > 0 ? 'increased' : changePercent < 0 ? 'decreased' : 'remained stable';
    const magnitude = Math.abs(changePercent);
    
    let narrativeStart = `${indicator.name} ${direction} `;
    
    if (magnitude > 5) {
      narrativeStart += 'significantly ';
    } else if (magnitude > 1) {
      narrativeStart += 'moderately ';
    } else {
      narrativeStart += 'slightly ';
    }

    narrativeStart += `by ${magnitude.toFixed(1)}% from the previous period. `;

    // Add trend context
    if (trend.direction !== 'sideways') {
      narrativeStart += `This continues a ${trend.direction === 'up' ? 'upward' : 'downward'} trend that has been developing over recent periods. `;
    }

    // Add category-specific context
    narrativeStart += this.getCategorySpecificContext(indicator.category, direction, magnitude);

    return narrativeStart;
  }

  private generateInvestmentImplication(indicator: any, trend: TrendAnalysis, changePercent: number): string {
    const category = indicator.category;
    const direction = changePercent > 0 ? 'rising' : 'falling';

    const implications: { [key: string]: { [key: string]: string } } = {
      'employment': {
        'rising': 'Improving employment typically supports consumer spending and economic growth, potentially benefiting equities and reducing bond appeal.',
        'falling': 'Weakening employment may signal economic slowdown, potentially leading to defensive positioning and increased bond demand.'
      },
      'inflation': {
        'rising': 'Rising inflation may prompt central bank tightening, potentially pressuring growth stocks while benefiting commodities and inflation-protected securities.',
        'falling': 'Declining inflation may reduce pressure for rate hikes, potentially supporting growth assets and longer-duration bonds.'
      },
      'market_indices': {
        'rising': 'Market strength suggests investor confidence, potentially supporting risk assets and cyclical sectors.',
        'falling': 'Market weakness may indicate risk-off sentiment, potentially favoring defensive assets and safe havens.'
      },
      'fiscal_policy': {
        'rising': 'Fiscal expansion may stimulate growth but increase debt concerns, potentially supporting equities while pressuring long-term bonds.',
        'falling': 'Fiscal tightening may reduce growth stimulus but improve fiscal sustainability, with mixed market implications.'
      }
    };

    return implications[category]?.[direction] || 'Market implications depend on broader economic context and should be evaluated alongside other indicators.';
  }

  private generateHistoricalContext(indicator: any, currentValue: number, historicalData: any[]): string {
    if (historicalData.length < 12) {
      return 'Insufficient historical data for meaningful comparison.';
    }

    const values = historicalData.map(d => d.value);
    const max = Math.max(...values);
    const min = Math.min(...values);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;

    let context = '';
    
    if (currentValue >= max * 0.95) {
      context = 'This reading is near historical highs for the available data period.';
    } else if (currentValue <= min * 1.05) {
      context = 'This reading is near historical lows for the available data period.';
    } else if (currentValue >= avg * 1.1) {
      context = 'This reading is above the historical average.';
    } else if (currentValue <= avg * 0.9) {
      context = 'This reading is below the historical average.';
    } else {
      context = 'This reading is within the normal historical range.';
    }

    // Add percentile information
    const sortedValues = [...values].sort((a, b) => a - b);
    const percentile = Math.round((sortedValues.findIndex(v => v >= currentValue) / sortedValues.length) * 100);
    context += ` It ranks in the ${percentile}th percentile of all recorded values.`;

    return context;
  }

  private getCategorySpecificContext(category: string, direction: string, magnitude: number): string {
    const contexts: { [key: string]: string } = {
      'employment': direction === 'increased' 
        ? 'This improvement in employment conditions suggests strengthening labor market dynamics.'
        : 'This decline may indicate softening labor market conditions.',
      'inflation': direction === 'increased'
        ? 'Rising inflation pressures may influence monetary policy decisions.'
        : 'Moderating inflation could provide flexibility for monetary policy.',
      'economic_growth': direction === 'increased'
        ? 'This growth acceleration indicates expanding economic activity.'
        : 'This slowdown suggests moderating economic momentum.',
      'market_indices': direction === 'increased'
        ? 'Market gains reflect investor optimism and risk appetite.'
        : 'Market declines suggest increased caution among investors.',
      'fiscal_policy': direction === 'increased'
        ? 'This fiscal expansion reflects government stimulus efforts.'
        : 'This fiscal restraint indicates government efforts to manage spending.'
    };

    return contexts[category] || 'This change reflects evolving economic conditions that warrant monitoring.';
  }

  // Placeholder methods for health score components (to be implemented)
  private async getKeyHealthIndicators() {
    return await this.prisma.economicIndicator.findMany({
      where: {
        isActive: true,
        name: {
          in: [
            'Unemployment Rate',
            'Consumer Price Index',
            'Real GDP',
            'Federal Budget Balance',
            'S&P 500'
          ]
        }
      },
      include: {
        data: {
          orderBy: { date: 'desc' },
          take: 6
        }
      }
    });
  }

  private async calculateLaborMarketScore(indicators: any[]): Promise<number> {
    const unemployment = indicators.find(i => i.name === 'Unemployment Rate');
    if (!unemployment || unemployment.data.length === 0) return 50;

    const currentRate = unemployment.data[0].value;
    // Inverse relationship: lower unemployment = higher score
    // Typical range: 3% (excellent) to 10% (poor)
    return Math.max(0, Math.min(100, 100 - ((currentRate - 3) * 100 / 7)));
  }

  private async calculateInflationScore(indicators: any[]): Promise<number> {
    const cpi = indicators.find(i => i.name === 'Consumer Price Index');
    if (!cpi || cpi.data.length < 2) return 50;

    // Calculate year-over-year inflation rate
    const currentCPI = cpi.data[0].value;
    const yearAgoCPI = cpi.data[cpi.data.length - 1].value;
    const inflationRate = ((currentCPI - yearAgoCPI) / yearAgoCPI) * 100;

    // Optimal inflation around 2%, score decreases as it moves away
    const distance = Math.abs(inflationRate - 2);
    return Math.max(0, Math.min(100, 100 - (distance * 10)));
  }

  private async calculateGrowthScore(indicators: any[]): Promise<number> {
    const gdp = indicators.find(i => i.name === 'Real GDP');
    if (!gdp || gdp.data.length < 2) return 50;

    const currentGDP = gdp.data[0].value;
    const previousGDP = gdp.data[1].value;
    const growthRate = ((currentGDP - previousGDP) / previousGDP) * 100;

    // Positive growth is good, target around 2-4% annually
    if (growthRate < 0) return Math.max(0, 50 + (growthRate * 10));
    return Math.min(100, 50 + (growthRate * 12.5));
  }

  private async calculateFiscalHealthScore(indicators: any[]): Promise<number> {
    const budget = indicators.find(i => i.name === 'Federal Budget Balance');
    if (!budget || budget.data.length === 0) return 50;

    const budgetBalance = budget.data[0].value;
    // Positive balance (surplus) is better, but large deficits are concerning
    // Score based on balance as % of GDP (approximate)
    const score = budgetBalance > 0 ? 100 : Math.max(0, 50 + (budgetBalance / 1000000000)); // Rough scaling
    return Math.max(0, Math.min(100, score));
  }

  private async calculateMarketScore(indicators: any[]): Promise<number> {
    const sp500 = indicators.find(i => i.name === 'S&P 500');
    if (!sp500 || sp500.data.length < 6) return 50;

    // Calculate 6-month trend
    const trend = this.determineTrend(sp500.data.slice(0, 6));
    
    // Score based on trend direction and strength
    if (trend.direction === 'up') {
      return Math.min(100, 50 + trend.strength / 2);
    } else if (trend.direction === 'down') {
      return Math.max(0, 50 - trend.strength / 2);
    }
    return 50;
  }

  private determineHealthTrend(currentScore: number, indicators: any[]): 'improving' | 'deteriorating' | 'stable' {
    // Simple implementation - could be enhanced with historical scoring
    if (currentScore > 70) return 'improving';
    if (currentScore < 40) return 'deteriorating';
    return 'stable';
  }

  private assessRiskLevel(score: number): 'low' | 'medium' | 'high' | 'critical' {
    if (score >= 80) return 'low';
    if (score >= 60) return 'medium';
    if (score >= 40) return 'high';
    return 'critical';
  }

  private generateHealthNarrative(score: number, components: any, trend: string, riskLevel: string): string {
    let narrative = `The current economic health score is ${score}/100, indicating `;
    
    if (score >= 80) narrative += 'strong economic conditions. ';
    else if (score >= 60) narrative += 'moderate economic conditions. ';
    else if (score >= 40) narrative += 'concerning economic conditions. ';
    else narrative += 'weak economic conditions. ';

    narrative += `The economy appears to be ${trend}. `;

    // Highlight strongest and weakest components
    const componentEntries = Object.entries(components) as [string, number][];
    const strongest = componentEntries.reduce((a, b) => a[1] > b[1] ? a : b);
    const weakest = componentEntries.reduce((a, b) => a[1] < b[1] ? a : b);

    narrative += `Strengths include ${strongest[0]} (${Math.round(strongest[1])}/100), while `;
    narrative += `${weakest[0]} (${Math.round(weakest[1])}/100) presents the greatest concern.`;

    return narrative;
  }

  // Correlation analysis helpers
  private getKeyIndicatorPairs() {
    return [
      { indicator1: 'Unemployment Rate', indicator2: 'Consumer Price Index' },
      { indicator1: 'Federal Budget Balance', indicator2: 'Real GDP' },
      { indicator1: 'S&P 500', indicator2: 'Consumer Price Index' },
      { indicator1: 'Unemployment Rate', indicator2: 'Real GDP' },
      { indicator1: 'Federal Revenue', indicator2: 'Real GDP' }
    ];
  }

  private async calculateCorrelation(indicator1: any, indicator2: any): Promise<CorrelationAnalysis | null> {
    try {
      // Align data points by date
      const alignedData = this.alignIndicatorData(indicator1.data, indicator2.data);
      
      if (alignedData.length < 10) return null;

      const values1 = alignedData.map(d => d.value1);
      const values2 = alignedData.map(d => d.value2);

      const correlation = this.pearsonCorrelation(values1, values2);
      const strength = this.getCorrelationStrength(Math.abs(correlation));
      const direction = correlation >= 0 ? 'positive' : 'negative';

      return {
        id: `corr_${indicator1.id}_${indicator2.id}_${Date.now()}`,
        indicator1Id: indicator1.id,
        indicator2Id: indicator2.id,
        indicator1Name: indicator1.name,
        indicator2Name: indicator2.name,
        correlationCoeff: correlation,
        strength,
        direction,
        lagDays: 0, // Simplified - could implement lag analysis
        confidence: Math.min(100, alignedData.length * 2), // More data = higher confidence
        narrative: this.generateCorrelationNarrative(indicator1.name, indicator2.name, correlation, strength),
        lastUpdated: new Date()
      };
    } catch (error) {
      console.error('Error calculating correlation:', error);
      return null;
    }
  }

  private alignIndicatorData(data1: any[], data2: any[]) {
    const aligned = [];
    const data2Map = new Map(data2.map(d => [d.date.toISOString().split('T')[0], d.value]));

    for (const d1 of data1) {
      const dateKey = d1.date.toISOString().split('T')[0];
      const value2 = data2Map.get(dateKey);
      if (value2 !== undefined) {
        aligned.push({ value1: d1.value, value2, date: d1.date });
      }
    }

    return aligned.slice(0, 50); // Limit to 50 most recent aligned points
  }

  private pearsonCorrelation(x: number[], y: number[]): number {
    const n = x.length;
    if (n !== y.length || n === 0) return 0;

    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
    const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

    return denominator === 0 ? 0 : numerator / denominator;
  }

  private getCorrelationStrength(absCorr: number): 'weak' | 'moderate' | 'strong' | 'very_strong' {
    if (absCorr >= 0.8) return 'very_strong';
    if (absCorr >= 0.6) return 'strong';
    if (absCorr >= 0.3) return 'moderate';
    return 'weak';
  }

  private generateCorrelationNarrative(name1: string, name2: string, correlation: number, strength: string): string {
    const direction = correlation >= 0 ? 'positive' : 'negative';
    const magnitude = Math.abs(correlation);

    let narrative = `${name1} and ${name2} show a ${strength} ${direction} correlation (${correlation.toFixed(2)}). `;

    if (direction === 'positive') {
      narrative += `When ${name1} increases, ${name2} tends to increase as well. `;
    } else {
      narrative += `When ${name1} increases, ${name2} tends to decrease. `;
    }

    if (strength === 'very_strong' || strength === 'strong') {
      narrative += 'This relationship is quite reliable for analysis and forecasting.';
    } else if (strength === 'moderate') {
      narrative += 'This relationship is moderately reliable but should be considered alongside other factors.';
    } else {
      narrative += 'This relationship is weak and may not be reliable for predictive purposes.';
    }

    return narrative;
  }

  private async findRelatedIndicators(category: string, source: string): Promise<string[]> {
    const related = await this.prisma.economicIndicator.findMany({
      where: {
        OR: [
          { category },
          { source }
        ],
        isActive: true
      },
      select: { name: true },
      take: 5
    });

    return related.map(r => r.name);
  }
}