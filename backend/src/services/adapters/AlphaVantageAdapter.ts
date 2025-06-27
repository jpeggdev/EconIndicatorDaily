import { DataSourceAdapter, ProcessedDataPoint, DataSourceConfig, CoreIndicator } from './DataSourceAdapter';
import { AlphaVantageService, coreMarketIndicators } from '../alphaVantageService';

/**
 * Alpha Vantage Data Source Adapter
 * Replaces duplicated Alpha Vantage-specific methods in indicatorService
 */
export class AlphaVantageAdapter extends DataSourceAdapter {
  protected service: AlphaVantageService;

  constructor(config: DataSourceConfig) {
    super('ALPHA_VANTAGE', config, coreMarketIndicators);
  }

  async initialize(): Promise<void> {
    this.service = new AlphaVantageService(this.config.apiKey);
  }

  standardizeUnit(input: string): string {
    const unitMap: Record<string, string> = {
      'USD': '$',
      'Points': 'pts',
      'Percent': '%',
      'Index': 'Index',
      'Ratio': 'Ratio',
      'Volume': 'Vol'
    };

    return unitMap[input] || input;
  }

  async fetchData(indicatorCode: string): Promise<ProcessedDataPoint[]> {
    const indicator = this.validateIndicator(indicatorCode);
    
    try {
      const processedData = await this.service.getProcessedData(
        indicator.code,
        indicator.name,
        indicator.category,
        indicator.frequency
      );

      return processedData.map(dataPoint => ({
        date: new Date(dataPoint.date),
        value: dataPoint.value,
        rawData: dataPoint
      }));
    } catch (error) {
      console.error(`Failed to fetch Alpha Vantage data for ${indicatorCode}:`, error);
      throw error;
    }
  }
}