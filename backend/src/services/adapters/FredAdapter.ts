import { DataSourceAdapter, ProcessedDataPoint, DataSourceConfig, CoreIndicator } from './DataSourceAdapter';
import { FredService, coreIndicators } from '../fredService';

/**
 * FRED Data Source Adapter
 * Replaces duplicated FRED-specific methods in indicatorService
 */
export class FredAdapter extends DataSourceAdapter {
  protected service: FredService;

  constructor(config: DataSourceConfig) {
    super('FRED', config, coreIndicators);
  }

  async initialize(): Promise<void> {
    this.service = new FredService(this.config.apiKey);
  }

  standardizeUnit(input: string): string {
    const unitMap: Record<string, string> = {
      'Percent': '%',
      'Thousands of Persons': 'K persons',
      'Billions of Dollars': '$B',
      'Millions of Dollars': '$M',
      'Index': 'Index',
      'Rate': 'Rate',
      'Seasonally Adjusted Annual Rate': 'SAAR',
      'Not Seasonally Adjusted': 'NSA',
      'Seasonally Adjusted': 'SA'
    };

    return unitMap[input] || input;
  }

  async fetchData(indicatorName: string): Promise<ProcessedDataPoint[]> {
    const indicator = this.validateIndicator(indicatorName);
    
    try {
      // Use actual FRED service methods
      const fredData = await this.service.getSeriesObservations(indicator.seriesId!, 50);
      const seriesInfo = await this.service.getSeriesInfo(indicator.seriesId!);
      
      const processedData: ProcessedDataPoint[] = [];
      
      for (const observation of fredData.observations) {
        if (observation.value !== '.') {
          let scaledValue = parseFloat(observation.value);
          
          // Apply FRED-specific scaling logic
          const originalUnits = seriesInfo.units.toLowerCase();
          if (originalUnits.includes('billion') && originalUnits.includes('dollar')) {
            scaledValue = scaledValue * 1e9;
          } else if (originalUnits.includes('thousand') && (originalUnits.includes('dollar') || originalUnits.includes('person') || originalUnits.includes('unit'))) {
            scaledValue = scaledValue * 1000;
          }
          
          processedData.push({
            date: new Date(observation.date),
            value: scaledValue,
            rawData: observation
          });
        }
      }

      return processedData;
    } catch (error) {
      console.error(`Failed to fetch FRED data for ${indicatorName}:`, error);
      throw error;
    }
  }
}