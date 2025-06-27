/**
 * Unified Data Source Adapter Interface
 * Eliminates 19+ duplicate methods across different data sources
 */

export interface ProcessedDataPoint {
  date: Date;
  value: number;
  rawData?: any;
}

export interface CoreIndicator {
  name: string;
  seriesId?: string;  // FRED, BLS
  symbol?: string;    // Alpha Vantage
  code?: string;      // World Bank, others
  category: string;
  frequency: string;
  description?: string;
  unit?: string;
}

export interface DataSourceConfig {
  apiKey?: string;
  baseUrl?: string;
  timeout?: number;
  rateLimitPerHour?: number;
}

/**
 * Abstract base class for all data source adapters
 */
export abstract class DataSourceAdapter {
  protected service: any;
  protected coreIndicators: CoreIndicator[];
  
  constructor(
    public readonly name: string,
    protected config: DataSourceConfig,
    coreIndicators: CoreIndicator[]
  ) {
    this.coreIndicators = coreIndicators;
  }

  /**
   * Initialize the underlying service with configuration
   */
  abstract initialize(): Promise<void>;

  /**
   * Standardize units from source-specific format to common format
   */
  abstract standardizeUnit(input: string): string;

  /**
   * Fetch processed data for a specific indicator by name
   */
  abstract fetchData(indicatorName: string): Promise<ProcessedDataPoint[]>;

  /**
   * Get core indicator configuration by name
   */
  getIndicatorConfig(name: string): CoreIndicator | undefined {
    return this.coreIndicators.find(indicator => indicator.name === name);
  }

  /**
   * Get all core indicators for this data source
   */
  getCoreIndicators(): CoreIndicator[] {
    return this.coreIndicators;
  }

  /**
   * Validate that indicator exists in this data source
   */
  protected validateIndicator(name: string): CoreIndicator {
    const indicator = this.getIndicatorConfig(name);
    if (!indicator) {
      throw new Error(`Core indicator configuration not found for ${name} in ${this.name}`);
    }
    return indicator;
  }
}