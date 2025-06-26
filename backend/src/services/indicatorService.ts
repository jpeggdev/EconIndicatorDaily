import { PrismaClient } from '@prisma/client';
import { FredService, coreIndicators } from './fredService';
import { AlphaVantageService, coreMarketIndicators } from './alphaVantageService';
import { WorldBankService } from './worldBankService';
import { BlsService, coreBlsIndicators } from './blsService';
import { FinnhubService, coreFinnhubIndicators } from './finnhubService';
import { FMPService, coreFMPIndicators } from './fmpService';
import { ECBService, coreECBIndicators } from './ecbService';
import { IMFService, coreIMFIndicators } from './imfService';
import { TreasuryService, coreTreasuryIndicators } from './treasuryService';
import { SECService, coreSECIndicators } from './secService';
import { RapidAPIService, coreRapidAPIIndicators } from './rapidAPIService';
import { WORLD_BANK_INDICATORS } from '../types/worldBank';

export const coreWorldBankIndicators = [
  {
    name: 'US GDP',
    code: WORLD_BANK_INDICATORS.GDP,
    category: 'Economic Growth',
    frequency: 'Annual',
    description: 'Gross Domestic Product of the United States'
  },
  {
    name: 'US GDP per Capita',
    code: WORLD_BANK_INDICATORS.GDP_PER_CAPITA,
    category: 'Economic Growth',
    frequency: 'Annual',
    description: 'GDP per capita of the United States'
  },
  {
    name: 'US Population',
    code: WORLD_BANK_INDICATORS.POPULATION,
    category: 'Demographics',
    frequency: 'Annual',
    description: 'Total population of the United States'
  },
  {
    name: 'Government Debt to GDP',
    code: WORLD_BANK_INDICATORS.GOVERNMENT_DEBT,
    category: 'Fiscal Policy',
    frequency: 'Annual',
    description: 'Central government debt as percentage of GDP'
  },
  {
    name: 'Foreign Direct Investment',
    code: WORLD_BANK_INDICATORS.FDI,
    category: 'International Trade',
    frequency: 'Annual',
    description: 'Foreign direct investment net inflows'
  }
];

export class IndicatorService {
  private prisma: PrismaClient;
  private fredService: FredService;
  private alphaVantageService: AlphaVantageService;
  private worldBankService: WorldBankService;
  private blsService: BlsService;
  private finnhubService?: FinnhubService;
  private fmpService?: FMPService;
  private ecbService: ECBService;
  private imfService: IMFService;
  private treasuryService: TreasuryService;
  private secService: SECService;
  private rapidAPIService?: RapidAPIService;

  constructor(
    prisma: PrismaClient, 
    fredApiKey: string, 
    alphaVantageApiKey: string, 
    blsApiKey: string,
    finnhubApiKey?: string,
    fmpApiKey?: string,
    rapidApiKey?: string
  ) {
    this.prisma = prisma;
    this.fredService = new FredService(fredApiKey);
    this.alphaVantageService = new AlphaVantageService(alphaVantageApiKey);
    this.worldBankService = new WorldBankService();
    this.blsService = new BlsService(blsApiKey);
    
    // Initialize optional services if API keys are provided
    if (finnhubApiKey) {
      this.finnhubService = new FinnhubService(finnhubApiKey);
    }
    if (fmpApiKey) {
      this.fmpService = new FMPService(fmpApiKey);
    }
    if (rapidApiKey) {
      this.rapidAPIService = new RapidAPIService(rapidApiKey);
    }
    
    // Initialize free APIs
    this.ecbService = new ECBService();
    this.imfService = new IMFService();
    this.treasuryService = new TreasuryService();
    this.secService = new SECService();
  }

  private standardizeFredUnit(fredUnit: string): string {
    // Convert FRED units to standardized format
    const lowerUnit = fredUnit.toLowerCase();
    
    if (lowerUnit.includes('billion') && lowerUnit.includes('dollar')) {
      return 'USD'; // Convert "Billions of Dollars" to "USD" - values will be in billions
    }
    if (lowerUnit.includes('million') && lowerUnit.includes('dollar')) {
      return 'USD'; // Convert "Millions of Dollars" to "USD" - values will be in millions
    }
    if (lowerUnit.includes('thousand') && (lowerUnit.includes('dollar') || lowerUnit.includes('unit'))) {
      return lowerUnit.includes('dollar') ? 'USD' : 'Units'; // "Thousands of Dollars" -> "USD", "Thousands of Units" -> "Units"
    }
    if (lowerUnit.includes('thousand') && lowerUnit.includes('person')) {
      return 'People'; // "Thousands of Persons" -> "People"
    }
    if (lowerUnit === 'number') {
      return 'Claims'; // For unemployment claims
    }
    if (lowerUnit.includes('percent')) {
      return '%';
    }
    if (lowerUnit.includes('index')) {
      return 'Index';
    }
    
    // Return original unit if no standardization needed
    return fredUnit;
  }

  private standardizeAlphaVantageUnit(symbol: string): string {
    // All Alpha Vantage market data is in USD
    return 'USD';
  }

  private standardizeBlsUnit(seriesId: string): string {
    // Standardize BLS units based on series ID patterns
    if (seriesId.includes('LNS14') || seriesId.includes('LNS11') || seriesId.includes('LNS12')) {
      return '%'; // Employment rates are percentages
    }
    if (seriesId.includes('CUUR') || seriesId.includes('WPUFD')) {
      return 'Index'; // CPI and PPI are index values
    }
    if (seriesId.includes('CES') && seriesId.includes('49')) {
      return 'USD'; // Earnings data
    }
    return 'Index'; // Default for most BLS series
  }

  private standardizeFinnhubUnit(code: string): string {
    // Standardize Finnhub units based on indicator codes
    if (code.includes('GSPC') || code.includes('DJI') || code.includes('IXIC')) {
      return 'Index'; // Stock indices
    }
    if (code.includes('USD') || code.includes('EUR') || code.includes('GBP') || code.includes('JPY')) {
      return 'Exchange Rate'; // Forex pairs
    }
    if (code.includes('BTC') || code.includes('ETH')) {
      return 'USD'; // Cryptocurrency prices
    }
    if (code.includes('GDP')) {
      return '%'; // GDP growth rate
    }
    if (code.includes('CPI')) {
      return 'Index'; // Consumer Price Index
    }
    return 'USD'; // Default for most financial instruments
  }

  private standardizeFMPUnit(symbol: string): string {
    // Standardize FMP units based on symbol patterns
    if (symbol.includes('USD') && (symbol.includes('GC') || symbol.includes('SI') || symbol.includes('CL') || symbol.includes('NG'))) {
      return 'USD'; // Commodities priced in USD
    }
    if (symbol.includes('DGS')) {
      return '%'; // Treasury rates are percentages
    }
    if (symbol.includes('FTSE') || symbol.includes('DAX') || symbol.includes('N225')) {
      return 'Index'; // International stock indices
    }
    return 'USD'; // Default for most financial instruments
  }

  private standardizeECBUnit(code: string): string {
    // Standardize ECB units based on series codes
    if (code.includes('KR.MRR_FR') || code.includes('KR.DFR') || code.includes('KR.MLF_RT')) {
      return '%'; // Interest rates are percentages
    }
    if (code.includes('EXR.D.')) {
      return 'Exchange Rate'; // Daily exchange rates
    }
    if (code.includes('BSI.M.') && code.includes('.M10.') || code.includes('.M30.')) {
      return 'EUR'; // Money supply aggregates
    }
    if (code.includes('ICP.M.') && code.includes('.ANR')) {
      return '%'; // Inflation rates are percentages
    }
    if (code.includes('LFSI.M.') && code.includes('UNEHRT')) {
      return '%'; // Unemployment rates are percentages
    }
    return 'Index'; // Default for ECB indicators
  }

  private standardizeIMFUnit(code: string): string {
    // Standardize IMF units based on indicator codes
    if (code.includes('NGDP_RPCH') || code.includes('PCPIPCH') || code.includes('LUR')) {
      return '%'; // Growth rates, inflation, and unemployment are percentages
    }
    if (code.includes('BCA_NGDPD') || code.includes('GGR_NGDP')) {
      return '% of GDP'; // Balance indicators as percent of GDP
    }
    return '%'; // Most IMF indicators are percentages
  }

  private standardizeTreasuryUnit(code: string): string {
    // All Treasury financial data is in USD
    if (code.includes('receipts') || code.includes('outlays') || code.includes('balance') || 
        code.includes('debt') || code.includes('cash')) {
      return 'USD';
    }
    return 'USD'; // Default for Treasury data
  }

  async initializeCoreIndicators(): Promise<void> {
    // Initialize FRED indicators
    for (const indicator of coreIndicators) {
      try {
        const seriesInfo = await this.fredService.getSeriesInfo(indicator.seriesId);
        
        // Standardize FRED units
        const standardizedUnit = this.standardizeFredUnit(seriesInfo.units);
        
        await this.prisma.economicIndicator.upsert({
          where: { name: indicator.name },
          update: {
            description: seriesInfo.title,
            source: 'FRED',
            category: indicator.category,
            frequency: indicator.frequency,
            unit: standardizedUnit
          },
          create: {
            name: indicator.name,
            description: seriesInfo.title,
            source: 'FRED',
            category: indicator.category,
            frequency: indicator.frequency,
            unit: standardizedUnit
          }
        });
      } catch (error) {
        console.error(`Failed to initialize FRED indicator ${indicator.name}:`, error);
      }
    }

    // Initialize Alpha Vantage indicators
    for (const indicator of coreMarketIndicators) {
      try {
        await this.prisma.economicIndicator.upsert({
          where: { name: indicator.name },
          update: {
            description: indicator.description,
            source: 'ALPHA_VANTAGE',
            category: indicator.category,
            frequency: 'daily',
            unit: this.standardizeAlphaVantageUnit(indicator.symbol)
          },
          create: {
            name: indicator.name,
            description: indicator.description,
            source: 'ALPHA_VANTAGE',
            category: indicator.category,
            frequency: 'daily',
            unit: this.standardizeAlphaVantageUnit(indicator.symbol)
          }
        });
      } catch (error) {
        console.error(`Failed to initialize Alpha Vantage indicator ${indicator.name}:`, error);
      }
    }

    // Initialize World Bank indicators
    for (const indicator of coreWorldBankIndicators) {
      try {
        await this.prisma.economicIndicator.upsert({
          where: { name: indicator.name },
          update: {
            description: indicator.description,
            source: 'WORLD_BANK',
            category: indicator.category,
            frequency: indicator.frequency,
            unit: indicator.name.includes('Debt to GDP') ? '% of GDP' :
                  indicator.name.includes('GDP') && !indicator.name.includes('per Capita') ? 'USD' : 
                  indicator.name.includes('per Capita') ? 'USD per person' :
                  indicator.name.includes('Population') ? 'People' :
                  indicator.name.includes('Investment') ? 'USD' : ''
          },
          create: {
            name: indicator.name,
            description: indicator.description,
            source: 'WORLD_BANK',
            category: indicator.category,
            frequency: indicator.frequency,
            unit: indicator.name.includes('Debt to GDP') ? '% of GDP' :
                  indicator.name.includes('GDP') && !indicator.name.includes('per Capita') ? 'USD' : 
                  indicator.name.includes('per Capita') ? 'USD per person' :
                  indicator.name.includes('Population') ? 'People' :
                  indicator.name.includes('Investment') ? 'USD' : ''
          }
        });
      } catch (error) {
        console.error(`Failed to initialize World Bank indicator ${indicator.name}:`, error);
      }
    }

    // Initialize BLS indicators
    for (const indicator of coreBlsIndicators) {
      try {
        await this.prisma.economicIndicator.upsert({
          where: { name: indicator.name },
          update: {
            description: indicator.description,
            source: 'BLS',
            category: indicator.category,
            frequency: indicator.frequency,
            unit: this.standardizeBlsUnit(indicator.seriesId)
          },
          create: {
            name: indicator.name,
            description: indicator.description,
            source: 'BLS',
            category: indicator.category,
            frequency: indicator.frequency,
            unit: this.standardizeBlsUnit(indicator.seriesId)
          }
        });
      } catch (error) {
        console.error(`Failed to initialize BLS indicator ${indicator.name}:`, error);
      }
    }

    // Initialize Finnhub indicators (if service is available)
    if (this.finnhubService) {
      for (const indicator of coreFinnhubIndicators) {
        try {
          await this.prisma.economicIndicator.upsert({
            where: { name: indicator.name },
            update: {
              description: indicator.description,
              source: 'FINNHUB',
              category: indicator.category,
              frequency: indicator.frequency,
              unit: this.standardizeFinnhubUnit(indicator.code)
            },
            create: {
              name: indicator.name,
              description: indicator.description,
              source: 'FINNHUB',
              category: indicator.category,
              frequency: indicator.frequency,
              unit: this.standardizeFinnhubUnit(indicator.code)
            }
          });
        } catch (error) {
          console.error(`Failed to initialize Finnhub indicator ${indicator.name}:`, error);
        }
      }
    }

    // Initialize FMP indicators (if service is available)
    if (this.fmpService) {
      for (const indicator of coreFMPIndicators) {
        try {
          await this.prisma.economicIndicator.upsert({
            where: { name: indicator.name },
            update: {
              description: indicator.description,
              source: 'FMP',
              category: indicator.category,
              frequency: indicator.frequency,
              unit: indicator.unit || 'USD'
            },
            create: {
              name: indicator.name,
              description: indicator.description,
              source: 'FMP',
              category: indicator.category,
              frequency: indicator.frequency,
              unit: indicator.unit || 'USD'
            }
          });
        } catch (error) {
          console.error(`Failed to initialize FMP indicator ${indicator.name}:`, error);
        }
      }
    }

    // Initialize ECB indicators
    for (const indicator of coreECBIndicators) {
      try {
        await this.prisma.economicIndicator.upsert({
          where: { name: indicator.name },
          update: {
            description: indicator.description,
            source: 'ECB',
            category: indicator.category,
            frequency: indicator.frequency,
            unit: indicator.unit
          },
          create: {
            name: indicator.name,
            description: indicator.description,
            source: 'ECB',
            category: indicator.category,
            frequency: indicator.frequency,
            unit: indicator.unit
          }
        });
      } catch (error) {
        console.error(`Failed to initialize ECB indicator ${indicator.name}:`, error);
      }
    }

    // Initialize IMF indicators
    for (const indicator of coreIMFIndicators) {
      try {
        await this.prisma.economicIndicator.upsert({
          where: { name: indicator.name },
          update: {
            description: indicator.description,
            source: 'IMF',
            category: indicator.category,
            frequency: indicator.frequency,
            unit: indicator.unit
          },
          create: {
            name: indicator.name,
            description: indicator.description,
            source: 'IMF',
            category: indicator.category,
            frequency: indicator.frequency,
            unit: indicator.unit
          }
        });
      } catch (error) {
        console.error(`Failed to initialize IMF indicator ${indicator.name}:`, error);
      }
    }

    // Initialize Treasury indicators
    for (const indicator of coreTreasuryIndicators) {
      try {
        await this.prisma.economicIndicator.upsert({
          where: { name: indicator.name },
          update: {
            description: indicator.description,
            source: 'TREASURY',
            category: indicator.category,
            frequency: indicator.frequency,
            unit: indicator.unit
          },
          create: {
            name: indicator.name,
            description: indicator.description,
            source: 'TREASURY',
            category: indicator.category,
            frequency: indicator.frequency,
            unit: indicator.unit
          }
        });
      } catch (error) {
        console.error(`Failed to initialize Treasury indicator ${indicator.name}:`, error);
      }
    }

    // Initialize SEC indicators
    for (const indicator of coreSECIndicators) {
      try {
        await this.prisma.economicIndicator.upsert({
          where: { name: indicator.name },
          update: {
            description: indicator.description,
            source: 'SEC',
            category: indicator.category,
            frequency: indicator.frequency,
            unit: indicator.unit
          },
          create: {
            name: indicator.name,
            description: indicator.description,
            source: 'SEC',
            category: indicator.category,
            frequency: indicator.frequency,
            unit: indicator.unit
          }
        });
      } catch (error) {
        console.error(`Failed to initialize SEC indicator ${indicator.name}:`, error);
      }
    }

    // Initialize RapidAPI indicators (if service is available)
    if (this.rapidAPIService) {
      for (const indicator of coreRapidAPIIndicators) {
        try {
          await this.prisma.economicIndicator.upsert({
            where: { name: indicator.name },
            update: {
              description: indicator.description,
              source: 'RAPIDAPI',
              category: indicator.category,
              frequency: indicator.frequency,
              unit: indicator.unit
            },
            create: {
              name: indicator.name,
              description: indicator.description,
              source: 'RAPIDAPI',
              category: indicator.category,
              frequency: indicator.frequency,
              unit: indicator.unit
            }
          });
        } catch (error) {
          console.error(`Failed to initialize RapidAPI indicator ${indicator.name}:`, error);
        }
      }
    }
  }

  async fetchAndStoreIndicatorData(indicatorName: string): Promise<void> {
    const indicator = await this.prisma.economicIndicator.findUnique({
      where: { name: indicatorName }
    });

    if (!indicator) {
      throw new Error(`Indicator ${indicatorName} not found`);
    }

    if (indicator.source === 'FRED') {
      await this.fetchFredData(indicator, indicatorName);
    } else if (indicator.source === 'ALPHA_VANTAGE') {
      await this.fetchAlphaVantageData(indicator, indicatorName);
    } else if (indicator.source === 'WORLD_BANK') {
      await this.fetchWorldBankData(indicator, indicatorName);
    } else if (indicator.source === 'BLS') {
      await this.fetchBlsData(indicator, indicatorName);
    } else if (indicator.source === 'FINNHUB') {
      await this.fetchFinnhubData(indicator, indicatorName);
    } else if (indicator.source === 'FMP') {
      await this.fetchFMPData(indicator, indicatorName);
    } else if (indicator.source === 'ECB') {
      await this.fetchECBData(indicator, indicatorName);
    } else if (indicator.source === 'IMF') {
      await this.fetchIMFData(indicator, indicatorName);
    } else if (indicator.source === 'TREASURY') {
      await this.fetchTreasuryData(indicator, indicatorName);
    } else if (indicator.source === 'SEC') {
      await this.fetchSECData(indicator, indicatorName);
    } else if (indicator.source === 'RAPIDAPI') {
      await this.fetchRapidAPIData(indicator, indicatorName);
    } else {
      throw new Error(`Unsupported data source: ${indicator.source}`);
    }
  }

  private async fetchFredData(indicator: any, indicatorName: string): Promise<void> {
    const coreIndicator = coreIndicators.find(ci => ci.name === indicatorName);
    if (!coreIndicator) {
      throw new Error(`Core indicator configuration not found for ${indicatorName}`);
    }

    try {
      const fredData = await this.fredService.getSeriesObservations(coreIndicator.seriesId, 50);
      
      for (const observation of fredData.observations) {
        if (observation.value !== '.') {
          // Scale FRED values to base units if needed
          let scaledValue = parseFloat(observation.value);
          
          // Get the original units to determine scaling
          const seriesInfo = await this.fredService.getSeriesInfo(coreIndicator.seriesId);
          const originalUnits = seriesInfo.units.toLowerCase();
          
          // Scale billions to actual value for USD display
          if (originalUnits.includes('billion') && originalUnits.includes('dollar')) {
            scaledValue = scaledValue * 1e9; // Convert billions to actual dollars
          }
          // Scale thousands to actual value
          else if (originalUnits.includes('thousand') && (originalUnits.includes('dollar') || originalUnits.includes('person') || originalUnits.includes('unit'))) {
            scaledValue = scaledValue * 1000; // Convert thousands to actual value
          }
          
          await this.prisma.indicatorData.upsert({
            where: {
              indicatorId_date: {
                indicatorId: indicator.id,
                date: new Date(observation.date)
              }
            },
            update: {
              value: scaledValue
            },
            create: {
              indicatorId: indicator.id,
              date: new Date(observation.date),
              value: scaledValue,
              rawData: observation as any
            }
          });
        }
      }
    } catch (error) {
      console.error(`Failed to fetch FRED data for ${indicatorName}:`, error);
      throw error;
    }
  }

  private async fetchAlphaVantageData(indicator: any, indicatorName: string): Promise<void> {
    const marketIndicator = coreMarketIndicators.find(mi => mi.name === indicatorName);
    if (!marketIndicator) {
      throw new Error(`Market indicator configuration not found for ${indicatorName}`);
    }

    try {
      const marketData = await this.alphaVantageService.getDailyAdjusted(marketIndicator.symbol, 30);
      
      for (const dataPoint of marketData) {
        await this.prisma.indicatorData.upsert({
          where: {
            indicatorId_date: {
              indicatorId: indicator.id,
              date: new Date(dataPoint.date)
            }
          },
          update: {
            value: dataPoint.adjustedClose
          },
          create: {
            indicatorId: indicator.id,
            date: new Date(dataPoint.date),
            value: dataPoint.adjustedClose,
            rawData: dataPoint as any
          }
        });
      }
    } catch (error) {
      console.error(`Failed to fetch Alpha Vantage data for ${indicatorName}:`, error);
      throw error;
    }
  }

  private async fetchWorldBankData(indicator: any, indicatorName: string): Promise<void> {
    const worldBankIndicator = coreWorldBankIndicators.find(wbi => wbi.name === indicatorName);
    if (!worldBankIndicator) {
      throw new Error(`World Bank indicator configuration not found for ${indicatorName}`);
    }

    try {
      const worldBankData = await this.worldBankService.getIndicator(worldBankIndicator.code);
      
      // Store all available data points (last 10 years)
      for (const dataPoint of worldBankData.all_data) {
        if (dataPoint.value !== null) {
          await this.prisma.indicatorData.upsert({
            where: {
              indicatorId_date: {
                indicatorId: indicator.id,
                date: new Date(`${dataPoint.date}-01-01`) // Convert year to full date
              }
            },
            update: {
              value: dataPoint.value
            },
            create: {
              indicatorId: indicator.id,
              date: new Date(`${dataPoint.date}-01-01`),
              value: dataPoint.value,
              rawData: dataPoint as any
            }
          });
        }
      }
    } catch (error) {
      console.error(`Failed to fetch World Bank data for ${indicatorName}:`, error);
      throw error;
    }
  }

  private async fetchBlsData(indicator: any, indicatorName: string): Promise<void> {
    const blsIndicator = coreBlsIndicators.find(bi => bi.name === indicatorName);
    if (!blsIndicator) {
      throw new Error(`BLS indicator configuration not found for ${indicatorName}`);
    }

    try {
      const blsData = await this.blsService.getSeriesData([blsIndicator.seriesId]);
      
      for (const dataPoint of blsData) {
        await this.prisma.indicatorData.upsert({
          where: {
            indicatorId_date: {
              indicatorId: indicator.id,
              date: new Date(dataPoint.date)
            }
          },
          update: {
            value: dataPoint.value
          },
          create: {
            indicatorId: indicator.id,
            date: new Date(dataPoint.date),
            value: dataPoint.value,
            rawData: dataPoint as any
          }
        });
      }
    } catch (error) {
      console.error(`Failed to fetch BLS data for ${indicatorName}:`, error);
      throw error;
    }
  }

  async getAllIndicators() {
    return this.prisma.economicIndicator.findMany({
      where: { isActive: true },
      include: {
        data: {
          orderBy: { date: 'desc' },
          take: 1
        }
      }
    });
  }

  async getIndicatorWithData(indicatorId: string, limit = 30) {
    return this.prisma.economicIndicator.findUnique({
      where: { id: indicatorId },
      include: {
        data: {
          orderBy: { date: 'desc' },
          take: limit
        },
        explanations: {
          orderBy: { date: 'desc' },
          take: 5
        }
      }
    });
  }

  private async fetchFinnhubData(indicator: any, indicatorName: string): Promise<void> {
    if (!this.finnhubService) {
      throw new Error('Finnhub service not initialized');
    }

    const coreIndicator = coreFinnhubIndicators.find(ci => ci.name === indicatorName);
    if (!coreIndicator) {
      throw new Error(`Core Finnhub indicator configuration not found for ${indicatorName}`);
    }

    let processedData: any[] = [];

    try {
      // Handle different types of Finnhub data
      if (coreIndicator.category === 'market_indices') {
        processedData = await this.finnhubService.getProcessedStockData(coreIndicator.code);
      } else if (coreIndicator.category === 'forex') {
        const forexData = await this.finnhubService.getProcessedForexData();
        processedData = forexData.filter(d => d.symbol === coreIndicator.code);
      } else if (coreIndicator.category === 'cryptocurrency') {
        processedData = await this.finnhubService.getProcessedCryptoData(coreIndicator.code, coreIndicator.name);
      } else if (coreIndicator.category === 'economic_growth' || coreIndicator.category === 'inflation') {
        processedData = await this.finnhubService.getProcessedEconomicData(coreIndicator.code, coreIndicator.name);
      }

      // Store the processed data
      for (const dataPoint of processedData.slice(0, 30)) { // Limit to recent data
        await this.prisma.indicatorData.upsert({
          where: {
            indicatorId_date: {
              indicatorId: indicator.id,
              date: new Date(dataPoint.date)
            }
          },
          update: {
            value: dataPoint.value
          },
          create: {
            indicatorId: indicator.id,
            date: new Date(dataPoint.date),
            value: dataPoint.value
          }
        });
      }
    } catch (error) {
      console.error(`Failed to fetch Finnhub data for ${indicatorName}:`, error);
      throw error;
    }
  }

  private async fetchFMPData(indicator: any, indicatorName: string): Promise<void> {
    if (!this.fmpService) {
      throw new Error('FMP service not initialized');
    }

    const coreIndicator = coreFMPIndicators.find(ci => ci.name === indicatorName);
    if (!coreIndicator) {
      throw new Error(`Core FMP indicator configuration not found for ${indicatorName}`);
    }

    let processedData: any[] = [];

    try {
      // Handle different types of FMP data
      if (coreIndicator.category === 'commodities') {
        processedData = await this.fmpService.getProcessedCommodityData(coreIndicator.symbol);
      } else if (coreIndicator.category === 'interest_rates') {
        if (coreIndicator.symbol.includes('DGS')) {
          processedData = await this.fmpService.getProcessedTreasuryData();
          processedData = processedData.filter(d => d.symbol === coreIndicator.symbol);
        }
      } else if (coreIndicator.category === 'market_indices') {
        processedData = await this.fmpService.getProcessedStockData(coreIndicator.symbol);
      }

      // Store the processed data
      for (const dataPoint of processedData.slice(0, 30)) { // Limit to recent data
        await this.prisma.indicatorData.upsert({
          where: {
            indicatorId_date: {
              indicatorId: indicator.id,
              date: new Date(dataPoint.date)
            }
          },
          update: {
            value: dataPoint.value
          },
          create: {
            indicatorId: indicator.id,
            date: new Date(dataPoint.date),
            value: dataPoint.value
          }
        });
      }
    } catch (error) {
      console.error(`Failed to fetch FMP data for ${indicatorName}:`, error);
      throw error;
    }
  }

  private async fetchECBData(indicator: any, indicatorName: string): Promise<void> {
    const coreIndicator = coreECBIndicators.find(ci => ci.name === indicatorName);
    if (!coreIndicator) {
      throw new Error(`Core ECB indicator configuration not found for ${indicatorName}`);
    }

    let processedData: any[] = [];

    try {
      // Handle different types of ECB data based on category
      if (coreIndicator.category === 'forex') {
        processedData = await this.ecbService.getProcessedExchangeRateData(coreIndicator.code);
      } else if (coreIndicator.category === 'monetary_policy') {
        if (coreIndicator.code.includes('KR.')) {
          // Interest rates
          processedData = await this.ecbService.getProcessedInterestRateData(coreIndicator.code);
        } else {
          // Money supply
          processedData = await this.ecbService.getProcessedSeriesData(coreIndicator.code);
        }
      } else if (coreIndicator.category === 'inflation') {
        processedData = await this.ecbService.getProcessedInflationData(coreIndicator.code);
      } else {
        // Default to series data
        processedData = await this.ecbService.getProcessedSeriesData(coreIndicator.code);
      }

      // Store the processed data
      for (const dataPoint of processedData.slice(0, 30)) { // Limit to recent data
        await this.prisma.indicatorData.upsert({
          where: {
            indicatorId_date: {
              indicatorId: indicator.id,
              date: new Date(dataPoint.date)
            }
          },
          update: {
            value: dataPoint.value
          },
          create: {
            indicatorId: indicator.id,
            date: new Date(dataPoint.date),
            value: dataPoint.value
          }
        });
      }
    } catch (error) {
      console.error(`Failed to fetch ECB data for ${indicatorName}:`, error);
      throw error;
    }
  }

  private async fetchIMFData(indicator: any, indicatorName: string): Promise<void> {
    const coreIndicator = coreIMFIndicators.find(ci => ci.name === indicatorName);
    if (!coreIndicator) {
      throw new Error(`Core IMF indicator configuration not found for ${indicatorName}`);
    }

    let processedData: any[] = [];

    try {
      // Extract country code and indicator code from the full code
      const codeParts = coreIndicator.code.split('.');
      const indicatorCode = codeParts[0];
      const countryCode = codeParts[1] || 'W00'; // Default to World

      // Use WEO data for most indicators
      processedData = await this.imfService.getProcessedWEOData(indicatorCode, countryCode);

      // Store the processed data
      for (const dataPoint of processedData.slice(0, 20)) { // Limit to recent data
        await this.prisma.indicatorData.upsert({
          where: {
            indicatorId_date: {
              indicatorId: indicator.id,
              date: new Date(dataPoint.date)
            }
          },
          update: {
            value: dataPoint.value
          },
          create: {
            indicatorId: indicator.id,
            date: new Date(dataPoint.date),
            value: dataPoint.value
          }
        });
      }
    } catch (error) {
      console.error(`Failed to fetch IMF data for ${indicatorName}:`, error);
      throw error;
    }
  }

  private async fetchTreasuryData(indicator: any, indicatorName: string): Promise<void> {
    const coreIndicator = coreTreasuryIndicators.find(ci => ci.name === indicatorName);
    if (!coreIndicator) {
      throw new Error(`Core Treasury indicator configuration not found for ${indicatorName}`);
    }

    let processedData: any[] = [];

    try {
      // Get data based on the specific Treasury indicator
      processedData = await this.treasuryService.getProcessedIndicatorData(
        coreIndicator.endpoint, 
        coreIndicator.code
      );

      // Store the processed data
      for (const dataPoint of processedData.slice(0, 30)) { // Limit to recent data
        await this.prisma.indicatorData.upsert({
          where: {
            indicatorId_date: {
              indicatorId: indicator.id,
              date: new Date(dataPoint.date)
            }
          },
          update: {
            value: dataPoint.value
          },
          create: {
            indicatorId: indicator.id,
            date: new Date(dataPoint.date),
            value: dataPoint.value
          }
        });
      }
    } catch (error) {
      console.error(`Failed to fetch Treasury data for ${indicatorName}:`, error);
      throw error;
    }
  }

  private async fetchSECData(indicator: any, indicatorName: string): Promise<void> {
    const coreIndicator = coreSECIndicators.find(ci => ci.name === indicatorName);
    if (!coreIndicator) {
      throw new Error(`Core SEC indicator configuration not found for ${indicatorName}`);
    }

    let processedData: any[] = [];

    try {
      console.log(`📊 Fetching SEC data for ${indicatorName}...`);
      
      // Get processed data from SEC service
      const secData = await this.secService.processIndicator(coreIndicator);
      
      // Store the processed data
      for (const dataPoint of secData.slice(0, 20)) { // Limit to recent data
        await this.prisma.indicatorData.upsert({
          where: {
            indicatorId_date: {
              indicatorId: indicator.id,
              date: dataPoint.date
            }
          },
          update: {
            value: dataPoint.value
          },
          create: {
            indicatorId: indicator.id,
            date: dataPoint.date,
            value: dataPoint.value
          }
        });
      }

      console.log(`✅ Successfully stored ${secData.length} SEC data points for ${indicatorName}`);
    } catch (error) {
      console.error(`Failed to fetch SEC data for ${indicatorName}:`, error);
      throw error;
    }
  }

  private async fetchRapidAPIData(indicator: any, indicatorName: string): Promise<void> {
    if (!this.rapidAPIService) {
      throw new Error('RapidAPI service not initialized - API key required');
    }

    const coreIndicator = coreRapidAPIIndicators.find(ci => ci.name === indicatorName);
    if (!coreIndicator) {
      throw new Error(`Core RapidAPI indicator configuration not found for ${indicatorName}`);
    }

    try {
      console.log(`📊 Fetching RapidAPI data for ${indicatorName}...`);
      
      // Get processed data from RapidAPI service
      const rapidData = await this.rapidAPIService.processIndicator(coreIndicator);
      
      // Store the processed data
      for (const dataPoint of rapidData.slice(0, 10)) { // Limit to recent data
        await this.prisma.indicatorData.upsert({
          where: {
            indicatorId_date: {
              indicatorId: indicator.id,
              date: dataPoint.date
            }
          },
          update: {
            value: dataPoint.value
          },
          create: {
            indicatorId: indicator.id,
            date: dataPoint.date,
            value: dataPoint.value
          }
        });
      }

      console.log(`✅ Successfully stored ${rapidData.length} RapidAPI data points for ${indicatorName}`);
    } catch (error) {
      console.error(`Failed to fetch RapidAPI data for ${indicatorName}:`, error);
      throw error;
    }
  }
}