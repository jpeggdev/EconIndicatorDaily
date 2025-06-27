import { PrismaClient } from '@prisma/client';
import { DataSourceAdapterFactory } from './adapters/DataSourceAdapterFactory';
import { DataSourceConfig } from './adapters/DataSourceAdapter';

/**
 * Refactored Indicator Service using DataSourceAdapter pattern
 * 
 * ELIMINATES:
 * - 19+ duplicate methods across data sources
 * - 300+ lines of duplicated initialization code  
 * - 11 duplicate service instantiation blocks
 * - Massive if/else chains for routing
 * - Duplicate error handling patterns
 * 
 * REPLACES: 1200+ lines with ~200 lines using adapter pattern
 */
export class IndicatorService {
  private prisma: PrismaClient;
  private adapterFactory: DataSourceAdapterFactory;

  constructor() {
    this.prisma = new PrismaClient();
    this.adapterFactory = new DataSourceAdapterFactory();
  }

  /**
   * Initialize all data source adapters
   * REPLACES: 11 duplicate service instantiation blocks (lines 76-98)
   */
  async initialize(): Promise<void> {
    const configs: Record<string, DataSourceConfig> = {
      fred: { apiKey: process.env.FRED_API_KEY },
      alphaVantage: { apiKey: process.env.ALPHA_VANTAGE_API_KEY },
      bls: { apiKey: process.env.BLS_API_KEY },
      worldBank: {}, // No API key required
      finnhub: { apiKey: process.env.FINNHUB_API_KEY },
      fmp: { apiKey: process.env.FMP_API_KEY },
      ecb: {}, // No API key required
      imf: {}, // No API key required
      treasury: {}, // No API key required
      sec: {}, // No API key required
      rapidapi: { apiKey: process.env.RAPIDAPI_KEY }
    };

    await this.adapterFactory.initialize(configs);
    console.log('✅ All data source adapters initialized');
  }

  /**
   * Initialize all core indicators across all data sources
   * REPLACES: 300+ lines of duplicated initialization loops (lines 224-528)
   */
  async initializeCoreIndicators(): Promise<void> {
    const allCoreIndicators = this.adapterFactory.getAllCoreIndicators();

    for (const { source, indicators } of allCoreIndicators) {
      console.log(`Initializing ${indicators.length} ${source} indicators...`);
      
      for (const indicator of indicators) {
        try {
          await this.prisma.economicIndicator.upsert({
            where: { name: indicator.name },
            update: {
              code: indicator.code,
              category: indicator.category,
              frequency: indicator.frequency,
              description: indicator.description,
              unit: indicator.unit || 'Unknown',
              source: source,
              isActive: true,
              updatedAt: new Date()
            },
            create: {
              name: indicator.name,
              code: indicator.code,
              category: indicator.category,
              frequency: indicator.frequency,
              description: indicator.description,
              unit: indicator.unit || 'Unknown',
              source: source,
              isActive: true
            }
          });
        } catch (error) {
          console.error(`Failed to initialize ${source} indicator ${indicator.name}:`, error);
        }
      }
    }

    console.log('✅ All core indicators initialized');
  }

  /**
   * Fetch and store data for a specific indicator
   * REPLACES: Massive if/else chain (lines 539-563) + 11 duplicate fetch methods (lines 566-1067)
   */
  async fetchAndStoreIndicatorData(indicatorName: string): Promise<void> {
    const indicator = await this.prisma.economicIndicator.findUnique({
      where: { name: indicatorName }
    });

    if (!indicator) {
      throw new Error(`Indicator ${indicatorName} not found`);
    }

    try {
      // Single unified call replaces entire if/else chain + individual fetch methods
      const processedData = await this.adapterFactory.fetchData(indicator.source, indicatorName);
      
      // Store data with standardized logic
      await this.storeIndicatorData(indicator.id, processedData);
      
      console.log(`✅ Successfully fetched and stored ${processedData.length} data points for ${indicatorName}`);
    } catch (error) {
      console.error(`Failed to fetch data for ${indicatorName}:`, error);
      throw error;
    }
  }

  /**
   * Store processed data points for an indicator
   * CONSOLIDATES: Duplicate upsert logic from all 11 fetch methods
   */
  private async storeIndicatorData(indicatorId: string, dataPoints: any[]): Promise<void> {
    for (const dataPoint of dataPoints) {
      await this.prisma.indicatorData.upsert({
        where: {
          indicatorId_date: {
            indicatorId,
            date: dataPoint.date
          }
        },
        update: { 
          value: dataPoint.value,
          updatedAt: new Date()
        },
        create: {
          indicatorId,
          date: dataPoint.date,
          value: dataPoint.value,
          rawData: dataPoint.rawData
        }
      });
    }
  }

  /**
   * Standardize unit for any data source
   * REPLACES: 9 duplicate standardization methods (lines 100-221)
   */
  standardizeUnit(source: string, input: string): string {
    try {
      return this.adapterFactory.standardizeUnit(source, input);
    } catch (error) {
      console.warn(`Failed to standardize unit for ${source}:`, error);
      return input;
    }
  }

  /**
   * Get all available indicators from all sources
   */
  async getAllIndicators() {
    return this.prisma.economicIndicator.findMany({
      orderBy: [
        { category: 'asc' },
        { name: 'asc' }
      ]
    });
  }

  /**
   * Get indicators by source
   */
  async getIndicatorsBySource(source: string) {
    return this.prisma.economicIndicator.findMany({
      where: { source },
      orderBy: { name: 'asc' }
    });
  }

  /**
   * Get latest data for an indicator
   */
  async getLatestData(indicatorName: string) {
    const indicator = await this.prisma.economicIndicator.findUnique({
      where: { name: indicatorName },
      include: {
        data: {
          orderBy: { date: 'desc' },
          take: 1
        }
      }
    });

    return indicator?.data[0] || null;
  }

  /**
   * Get historical data for an indicator
   */
  async getHistoricalData(indicatorName: string, startDate?: Date, endDate?: Date) {
    const whereClause: any = {
      indicator: { name: indicatorName }
    };

    if (startDate || endDate) {
      whereClause.date = {};
      if (startDate) whereClause.date.gte = startDate;
      if (endDate) whereClause.date.lte = endDate;
    }

    return this.prisma.indicatorData.findMany({
      where: whereClause,
      orderBy: { date: 'asc' },
      include: {
        indicator: {
          select: { name: true, unit: true, category: true }
        }
      }
    });
  }

  /**
   * Cleanup method
   */
  async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
  }
}

// Export singleton instance
export const indicatorService = new IndicatorService();