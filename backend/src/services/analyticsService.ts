import { PrismaClient } from '@prisma/client';
import { BlsService } from './blsService';
import { FredService } from './fredService';
import { AlphaVantageService } from './alphaVantageService';

export interface AnalyticsResult {
  engine: string;
  score: number;
  confidence: number;
  signal: 'bullish' | 'bearish' | 'neutral';
  description: string;
  metadata: Record<string, any>;
  calculatedAt: Date;
}

export interface InflationDivergenceResult extends AnalyticsResult {
  coreInflation: number;
  headlineInflation: number;
  divergenceScore: number;
  historicalPercentile: number;
}

export class AnalyticsService {
  private prisma: PrismaClient;
  private blsService: BlsService;
  private fredService: FredService;
  private alphaVantageService: AlphaVantageService;

  constructor(
    prisma: PrismaClient,
    blsService: BlsService,
    fredService: FredService,
    alphaVantageService: AlphaVantageService
  ) {
    this.prisma = prisma;
    this.blsService = blsService;
    this.fredService = fredService;
    this.alphaVantageService = alphaVantageService;
  }

  /**
   * Inflation Divergence Analysis
   * Compares Core CPI vs Headline CPI to detect Fed policy implications
   * Core CPI rising faster = underlying inflation pressure
   * Headline CPI rising faster = temporary energy/food price spikes
   */
  async analyzeInflationDivergence(): Promise<InflationDivergenceResult> {
    try {
      // Get latest CPI data (Core and Headline)
      const [coreData, headlineData] = await Promise.all([
        this.blsService.getCoreCPI(),
        this.blsService.getCPI()
      ]);

      if (!coreData.length || !headlineData.length) {
        throw new Error('Insufficient CPI data for analysis');
      }

      // Calculate year-over-year changes
      const latestCoreValue = coreData[0].value;
      const latestHeadlineValue = headlineData[0].value;
      
      // Find same month previous year for YoY calculation
      const oneYearAgo = new Date(coreData[0].date);
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      
      const coreYearAgo = coreData.find(d => 
        Math.abs(new Date(d.date).getTime() - oneYearAgo.getTime()) < 32 * 24 * 60 * 60 * 1000 // 32 days tolerance
      );
      const headlineYearAgo = headlineData.find(d => 
        Math.abs(new Date(d.date).getTime() - oneYearAgo.getTime()) < 32 * 24 * 60 * 60 * 1000
      );

      if (!coreYearAgo || !headlineYearAgo) {
        throw new Error('Insufficient historical data for YoY calculation');
      }

      // Calculate year-over-year inflation rates
      const coreInflationYoY = ((latestCoreValue - coreYearAgo.value) / coreYearAgo.value) * 100;
      const headlineInflationYoY = ((latestHeadlineValue - headlineYearAgo.value) / headlineYearAgo.value) * 100;

      // Calculate divergence (Core - Headline)
      const divergenceScore = coreInflationYoY - headlineInflationYoY;

      // Calculate historical percentile of this divergence
      const historicalDivergences = await this.calculateHistoricalDivergences(coreData, headlineData);
      const historicalPercentile = this.calculatePercentile(divergenceScore, historicalDivergences);

      // Determine signal based on divergence analysis
      let signal: 'bullish' | 'bearish' | 'neutral';
      let description: string;
      let confidence: number;

      if (divergenceScore > 0.5) {
        // Core inflation significantly higher than headline
        signal = 'bearish';
        description = `Core inflation (${coreInflationYoY.toFixed(1)}%) exceeds headline inflation (${headlineInflationYoY.toFixed(1)}%) by ${divergenceScore.toFixed(1)}pp, indicating underlying price pressures. Fed likely to maintain hawkish stance.`;
        confidence = Math.min(90, 60 + Math.abs(divergenceScore) * 10);
      } else if (divergenceScore < -0.5) {
        // Headline inflation significantly higher than core
        signal = 'bullish';
        description = `Headline inflation (${headlineInflationYoY.toFixed(1)}%) exceeds core inflation (${coreInflationYoY.toFixed(1)}%) by ${Math.abs(divergenceScore).toFixed(1)}pp, suggesting temporary price spikes in food/energy. Core inflation remains contained.`;
        confidence = Math.min(90, 60 + Math.abs(divergenceScore) * 10);
      } else {
        // Minimal divergence
        signal = 'neutral';
        description = `Core and headline inflation are aligned (${coreInflationYoY.toFixed(1)}% vs ${headlineInflationYoY.toFixed(1)}%), indicating balanced price pressures across categories.`;
        confidence = 70;
      }

      // Adjust confidence based on historical context
      if (historicalPercentile > 90 || historicalPercentile < 10) {
        confidence = Math.min(95, confidence + 15); // High confidence for extreme readings
      }

      return {
        engine: 'inflation_divergence',
        score: divergenceScore,
        confidence,
        signal,
        description,
        coreInflation: coreInflationYoY,
        headlineInflation: headlineInflationYoY,
        divergenceScore,
        historicalPercentile,
        metadata: {
          coreLatestValue: latestCoreValue,
          headlineLatestValue: latestHeadlineValue,
          coreYearAgoValue: coreYearAgo.value,
          headlineYearAgoValue: headlineYearAgo.value,
          dataDate: coreData[0].date,
          historicalSampleSize: historicalDivergences.length
        },
        calculatedAt: new Date()
      };

    } catch (error) {
      console.error('Error in inflation divergence analysis:', error);
      throw error;
    }
  }

  /**
   * Calculate historical divergences for percentile ranking
   */
  private async calculateHistoricalDivergences(
    coreData: any[],
    headlineData: any[]
  ): Promise<number[]> {
    const divergences: number[] = [];
    
    // Calculate divergences for each month with YoY data available
    for (let i = 12; i < Math.min(coreData.length, headlineData.length); i++) {
      const coreValue = coreData[i].value;
      const headlineValue = headlineData[i].value;
      const coreYearAgo = coreData[i + 12]?.value;
      const headlineYearAgo = headlineData[i + 12]?.value;
      
      if (coreYearAgo && headlineYearAgo) {
        const coreYoY = ((coreValue - coreYearAgo) / coreYearAgo) * 100;
        const headlineYoY = ((headlineValue - headlineYearAgo) / headlineYearAgo) * 100;
        divergences.push(coreYoY - headlineYoY);
      }
    }
    
    return divergences;
  }

  /**
   * Calculate percentile ranking of a value within an array
   */
  private calculatePercentile(value: number, dataset: number[]): number {
    const sorted = dataset.sort((a, b) => a - b);
    const rank = sorted.filter(v => v <= value).length;
    return (rank / sorted.length) * 100;
  }

  /**
   * Store analytics result in database
   */
  async storeAnalyticsResult(result: AnalyticsResult): Promise<void> {
    try {
      await this.prisma.analyticsResult.create({
        data: {
          engineType: result.engine,
          calculationDate: new Date(result.calculatedAt),
          score: result.score,
          confidence: result.confidence,
          metadata: result.metadata as any
        }
      });
    } catch (error) {
      console.error('Failed to store analytics result:', error);
    }
  }

  /**
   * Get recent analytics results for a specific engine
   */
  async getRecentAnalytics(engineType: string, limit = 30): Promise<any[]> {
    return this.prisma.analyticsResult.findMany({
      where: { engineType },
      orderBy: { calculationDate: 'desc' },
      take: limit
    });
  }

  /**
   * Market Stress Early Warning System
   * Combines Initial Claims + VXX + Commercial Paper for stress detection
   */
  async analyzeMarketStress(): Promise<AnalyticsResult> {
    try {
      // Get Initial Claims data (FRED)
      const initialClaimsData = await this.fredService.getSeriesObservations('ICSA', 20);
      
      // Get VXX data (Alpha Vantage)
      const vxxData = await this.alphaVantageService.getDailyAdjusted('VXX', 20);
      
      // Get Commercial Paper data (FRED)
      const commercialPaperData = await this.fredService.getSeriesObservations('CPFF', 20);

      if (!initialClaimsData.observations.length || !vxxData.length || !commercialPaperData.observations.length) {
        throw new Error('Insufficient data for market stress analysis');
      }

      // Calculate 4-week average for Initial Claims
      const recentClaims = initialClaimsData.observations
        .slice(0, 4)
        .map(obs => parseFloat(obs.value))
        .filter(val => !isNaN(val));
      
      const claims4WeekAvg = recentClaims.reduce((sum, val) => sum + val, 0) / recentClaims.length;
      
      // Calculate historical average for comparison
      const allClaims = initialClaimsData.observations
        .map(obs => parseFloat(obs.value))
        .filter(val => !isNaN(val));
      const claimsHistoricalAvg = allClaims.reduce((sum, val) => sum + val, 0) / allClaims.length;

      // Calculate VXX level vs historical average
      const latestVxx = vxxData[0].close;
      const vxxHistoricalAvg = vxxData.reduce((sum, data) => sum + data.close, 0) / vxxData.length;

      // Calculate stress indicators
      const claimsStressScore = ((claims4WeekAvg - claimsHistoricalAvg) / claimsHistoricalAvg) * 100;
      const vxxStressScore = ((latestVxx - vxxHistoricalAvg) / vxxHistoricalAvg) * 100;

      // Combined stress score (weighted average)
      const combinedStressScore = (claimsStressScore * 0.6) + (vxxStressScore * 0.4);

      // Determine signal
      let signal: 'bullish' | 'bearish' | 'neutral';
      let description: string;
      let confidence: number;

      if (combinedStressScore > 15) {
        signal = 'bearish';
        description = `High market stress detected: Initial Claims up ${claimsStressScore.toFixed(1)}%, VXX up ${vxxStressScore.toFixed(1)}%. Combined stress score: ${combinedStressScore.toFixed(1)}`;
        confidence = Math.min(90, 70 + (combinedStressScore - 15) * 2);
      } else if (combinedStressScore < -10) {
        signal = 'bullish';
        description = `Low market stress environment: Claims and volatility both below historical averages. Combined stress score: ${combinedStressScore.toFixed(1)}`;
        confidence = Math.min(85, 70 + Math.abs(combinedStressScore + 10) * 1.5);
      } else {
        signal = 'neutral';
        description = `Market stress levels normal. Combined stress score: ${combinedStressScore.toFixed(1)}`;
        confidence = 65;
      }

      return {
        engine: 'market_stress',
        score: combinedStressScore,
        confidence,
        signal,
        description,
        metadata: {
          claims4WeekAvg,
          claimsHistoricalAvg,
          claimsStressScore,
          latestVxx,
          vxxHistoricalAvg,
          vxxStressScore,
          dataDate: new Date().toISOString().split('T')[0]
        },
        calculatedAt: new Date()
      };

    } catch (error) {
      console.error('Error in market stress analysis:', error);
      throw error;
    }
  }
}