import axios from 'axios';

interface WorldBankResponse {
  [0]: {
    page: number;
    pages: number;
    per_page: number;
    total: number;
  };
  [1]: Array<{
    indicator: {
      id: string;
      value: string;
    };
    country: {
      id: string;
      value: string;
    };
    countryiso3code: string;
    date: string;
    value: number | null;
    unit: string;
    obs_status: string;
    decimal: number;
  }>;
}

export class WorldBankService {
  private readonly baseUrl = 'https://api.worldbank.org/v2';
  private readonly defaultCountry = 'US'; // United States

  async getIndicator(indicatorCode: string, startYear?: number, endYear?: number): Promise<any> {
    try {
      const currentYear = new Date().getFullYear();
      const fromYear = startYear || currentYear - 5;
      const toYear = endYear || currentYear;

      const url = `${this.baseUrl}/country/${this.defaultCountry}/indicator/${indicatorCode}`;
      const params = {
        format: 'json',
        date: `${fromYear}:${toYear}`,
        per_page: 1000
      };

      const response = await axios.get<WorldBankResponse>(url, { params });
      
      if (!response.data || !Array.isArray(response.data) || response.data.length < 2) {
        throw new Error('Invalid response format from World Bank API');
      }

      const [metadata, data] = response.data;
      
      if (!data || data.length === 0) {
        throw new Error(`No data found for indicator ${indicatorCode}`);
      }

      // Get the most recent data point with a value
      const validData = data.filter(item => item.value !== null);
      if (validData.length === 0) {
        throw new Error(`No valid data found for indicator ${indicatorCode}`);
      }

      // Sort by date descending to get most recent
      const sortedData = validData.sort((a, b) => b.date.localeCompare(a.date));
      const latestData = sortedData[0];

      return {
        indicator: {
          id: latestData.indicator.id,
          name: latestData.indicator.value
        },
        country: latestData.country.value,
        date: latestData.date,
        value: latestData.value,
        unit: latestData.unit || '',
        metadata: {
          total_records: metadata.total,
          page: metadata.page,
          pages: metadata.pages
        },
        all_data: sortedData // Include all data for historical analysis
      };
    } catch (error) {
      console.error(`Error fetching World Bank indicator ${indicatorCode}:`, error);
      throw error;
    }
  }

  // Get GDP data
  async getGDP(): Promise<any> {
    return this.getIndicator('NY.GDP.MKTP.CD'); // GDP current US$
  }

  // Get GDP per capita
  async getGDPPerCapita(): Promise<any> {
    return this.getIndicator('NY.GDP.PCAP.CD'); // GDP per capita current US$
  }

  // Get Inflation (Consumer Prices)
  async getInflation(): Promise<any> {
    return this.getIndicator('FP.CPI.TOTL.ZG'); // Inflation, consumer prices (annual %)
  }

  // Get Population
  async getPopulation(): Promise<any> {
    return this.getIndicator('SP.POP.TOTL'); // Population, total
  }

  // Get Unemployment rate
  async getUnemploymentRate(): Promise<any> {
    return this.getIndicator('SL.UEM.TOTL.ZS'); // Unemployment, total (% of total labor force)
  }

  // Get Foreign Direct Investment
  async getFDI(): Promise<any> {
    return this.getIndicator('BX.KLT.DINV.CD.WD'); // Foreign direct investment, net inflows (BoP, current US$)
  }

  // Get Government Debt
  async getGovernmentDebt(): Promise<any> {
    return this.getIndicator('GC.DOD.TOTL.GD.ZS'); // Central government debt, total (% of GDP)
  }

  // Get Trade Balance
  async getTradeBalance(): Promise<any> {
    return this.getIndicator('NE.RSB.GNFS.CD'); // External balance on goods and services (current US$)
  }

  // Generic method to get multiple indicators at once
  async getMultipleIndicators(indicatorCodes: string[]): Promise<Record<string, any>> {
    const results: Record<string, any> = {};
    
    for (const code of indicatorCodes) {
      try {
        results[code] = await this.getIndicator(code);
      } catch (error) {
        console.error(`Failed to fetch indicator ${code}:`, error);
        results[code] = null;
      }
    }

    return results;
  }
}

export const worldBankService = new WorldBankService();