import { DataSourceAdapter, DataSourceConfig } from './DataSourceAdapter';
import { FredAdapter } from './FredAdapter';
import { AlphaVantageAdapter } from './AlphaVantageAdapter';
import { BlsAdapter } from './BlsAdapter';
// TODO: Import remaining adapters as they're created

/**
 * Factory for managing data source adapters
 * Eliminates duplicate service instantiation and routing logic
 */
export class DataSourceAdapterFactory {
  private adapters: Map<string, DataSourceAdapter> = new Map();
  private initialized = false;

  /**
   * Initialize all available data source adapters
   */
  async initialize(configs: Record<string, DataSourceConfig>): Promise<void> {
    // Register adapters
    this.registerAdapter(new FredAdapter(configs.fred || {}));
    this.registerAdapter(new AlphaVantageAdapter(configs.alphaVantage || {}));
    this.registerAdapter(new BlsAdapter(configs.bls || {}));
    
    // TODO: Register remaining adapters:
    // this.registerAdapter(new WorldBankAdapter(configs.worldBank || {}));
    // this.registerAdapter(new FinnhubAdapter(configs.finnhub || {}));
    // this.registerAdapter(new FMPAdapter(configs.fmp || {}));
    // this.registerAdapter(new ECBAdapter(configs.ecb || {}));
    // this.registerAdapter(new IMFAdapter(configs.imf || {}));
    // this.registerAdapter(new TreasuryAdapter(configs.treasury || {}));
    // this.registerAdapter(new SECAdapter(configs.sec || {}));
    // this.registerAdapter(new RapidAPIAdapter(configs.rapidapi || {}));

    // Initialize all adapters
    const initPromises = Array.from(this.adapters.values()).map(adapter => 
      adapter.initialize().catch(error => {
        console.error(`Failed to initialize ${adapter.name} adapter:`, error);
      })
    );

    await Promise.all(initPromises);
    this.initialized = true;
  }

  /**
   * Register a data source adapter
   */
  private registerAdapter(adapter: DataSourceAdapter): void {
    this.adapters.set(adapter.name, adapter);
  }

  /**
   * Get adapter by source name
   */
  getAdapter(sourceName: string): DataSourceAdapter | undefined {
    return this.adapters.get(sourceName);
  }

  /**
   * Get all registered adapters
   */
  getAllAdapters(): DataSourceAdapter[] {
    return Array.from(this.adapters.values());
  }

  /**
   * Get all core indicators from all adapters
   */
  getAllCoreIndicators() {
    const allIndicators: Array<{ source: string; indicators: any[] }> = [];
    
    for (const adapter of this.adapters.values()) {
      allIndicators.push({
        source: adapter.name,
        indicators: adapter.getCoreIndicators()
      });
    }
    
    return allIndicators;
  }

  /**
   * Fetch data from specific source
   */
  async fetchData(sourceName: string, indicatorCode: string) {
    const adapter = this.getAdapter(sourceName);
    if (!adapter) {
      throw new Error(`No adapter found for source: ${sourceName}`);
    }
    
    return adapter.fetchData(indicatorCode);
  }

  /**
   * Standardize unit for specific source
   */
  standardizeUnit(sourceName: string, input: string): string {
    const adapter = this.getAdapter(sourceName);
    if (!adapter) {
      throw new Error(`No adapter found for source: ${sourceName}`);
    }
    
    return adapter.standardizeUnit(input);
  }

  /**
   * Check if factory is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }
}