import { DataSourceAdapter, ProcessedDataPoint, DataSourceConfig, CoreIndicator } from './DataSourceAdapter';
import { BlsService, coreBlsIndicators } from '../blsService';

/**
 * BLS Data Source Adapter
 * Replaces duplicated BLS-specific methods in indicatorService
 */
export class BlsAdapter extends DataSourceAdapter {
  protected service: BlsService;

  constructor(config: DataSourceConfig) {
    super('BLS', config, coreBlsIndicators);
  }

  async initialize(): Promise<void> {
    this.service = new BlsService(this.config.apiKey);
  }

  standardizeUnit(input: string): string {
    const unitMap: Record<string, string> = {
      'Percent': '%',
      'Index': 'Index',
      'Thousands': 'K',
      'Rate': 'Rate',
      'Seasonally Adjusted': 'SA',
      'Not Seasonally Adjusted': 'NSA',
      '12-month percent change': '12m %chg'
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
      console.error(`Failed to fetch BLS data for ${indicatorCode}:`, error);
      throw error;
    }
  }
}