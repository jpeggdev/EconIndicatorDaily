import axios from 'axios';
import { BlsApiResponse, BlsApiRequest, ProcessedBlsData, BlsSeries } from '../types/bls';

export class BlsService {
  private apiKey: string;
  private baseUrl = 'https://api.bls.gov/publicAPI/v2/timeseries/data/';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async getSeriesData(
    seriesIds: string[],
    startYear?: string,
    endYear?: string,
    options?: {
      catalog?: boolean;
      calculations?: boolean;
      annualaverage?: boolean;
    }
  ): Promise<ProcessedBlsData[]> {
    const currentYear = new Date().getFullYear();
    const requestData: BlsApiRequest = {
      seriesid: seriesIds,
      startyear: startYear || (currentYear - 5).toString(),
      endyear: endYear || currentYear.toString(),
      registrationkey: this.apiKey,
      ...options
    };

    try {
      const response = await axios.post<BlsApiResponse>(this.baseUrl, requestData, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.data.status !== 'REQUEST_SUCCEEDED') {
        throw new Error(`BLS API Error: ${response.data.message.join(', ')}`);
      }

      return this.processSeriesData(response.data.Results.series);
    } catch (error) {
      console.error('BLS API request failed:', error);
      throw error;
    }
  }

  private processSeriesData(series: BlsSeries[]): ProcessedBlsData[] {
    const processedData: ProcessedBlsData[] = [];

    for (const serie of series) {
      for (const dataPoint of serie.data) {
        // Skip invalid data points
        if (!dataPoint.value || dataPoint.value === '-' || dataPoint.value === '.' || dataPoint.value === '') {
          continue;
        }

        // Convert BLS period format to date
        const date = this.convertBlsPeriodToDate(dataPoint.year, dataPoint.period);
        const parsedValue = parseFloat(dataPoint.value);
        
        if (isNaN(parsedValue)) {
          continue;
        }
        
        processedData.push({
          seriesId: serie.seriesID,
          title: '', // Will be filled in by calling service
          date: date.toISOString().split('T')[0], // YYYY-MM-DD format
          value: parsedValue,
          period: dataPoint.period,
          periodName: dataPoint.periodName,
          footnotes: dataPoint.footnotes?.map(fn => fn.text).filter(text => text !== undefined) || []
        });
      }
    }

    // Sort by date descending (most recent first)
    return processedData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  private convertBlsPeriodToDate(year: string, period: string): Date {
    // Handle different BLS period formats
    // M01-M12 = January-December
    // Q01-Q04 = Quarters
    // A01 = Annual
    // S01-S03 = Semi-annual

    if (period.startsWith('M')) {
      // Monthly data: M01 = January, M02 = February, etc.
      const month = parseInt(period.substring(1)) - 1; // JavaScript months are 0-indexed
      return new Date(parseInt(year), month, 1);
    } else if (period.startsWith('Q')) {
      // Quarterly data: Q01 = Q1, Q02 = Q2, etc.
      const quarter = parseInt(period.substring(1));
      const month = (quarter - 1) * 3; // Q1=0, Q2=3, Q3=6, Q4=9
      return new Date(parseInt(year), month, 1);
    } else if (period === 'A01') {
      // Annual data
      return new Date(parseInt(year), 0, 1); // January 1st
    } else if (period.startsWith('S')) {
      // Semi-annual data
      const semiAnnual = parseInt(period.substring(1));
      const month = semiAnnual === 1 ? 0 : 6; // S01 = January, S02 = July
      return new Date(parseInt(year), month, 1);
    } else {
      // Default to January 1st for unknown periods
      console.warn(`Unknown BLS period format: ${period}, defaulting to January`);
      return new Date(parseInt(year), 0, 1);
    }
  }

  // Convenience methods for common data series
  async getUnemploymentRate(startYear?: string, endYear?: string): Promise<ProcessedBlsData[]> {
    return this.getSeriesData(['LNS14000000'], startYear, endYear);
  }

  async getCPI(startYear?: string, endYear?: string): Promise<ProcessedBlsData[]> {
    return this.getSeriesData(['CUUR0000SA0'], startYear, endYear);
  }

  async getCoreCPI(startYear?: string, endYear?: string): Promise<ProcessedBlsData[]> {
    return this.getSeriesData(['CUUR0000SA0L1E'], startYear, endYear);
  }

  async getCPIComponents(startYear?: string, endYear?: string): Promise<ProcessedBlsData[]> {
    // Get CPI for all items, core, food, and energy
    return this.getSeriesData([
      'CUUR0000SA0',    // All items
      'CUUR0000SA0L1E', // Core (ex food & energy)
      'CUUR0000SAF',    // Food
      'CUUR0000SAE'     // Energy
    ], startYear, endYear);
  }

  async getEmploymentData(startYear?: string, endYear?: string): Promise<ProcessedBlsData[]> {
    return this.getSeriesData([
      'LNS14000000', // Unemployment Rate
      'LNS11300000', // Labor Force Participation Rate
      'LNS12300000'  // Employment-Population Ratio
    ], startYear, endYear);
  }

  async getProducerPriceIndex(startYear?: string, endYear?: string): Promise<ProcessedBlsData[]> {
    return this.getSeriesData(['WPUFD49207'], startYear, endYear);
  }

  async getRealEarnings(startYear?: string, endYear?: string): Promise<ProcessedBlsData[]> {
    return this.getSeriesData(['CES0500000049'], startYear, endYear);
  }

  // Get multiple series with rate of change calculations
  async getSeriesWithCalculations(
    seriesIds: string[],
    startYear?: string,
    endYear?: string
  ): Promise<ProcessedBlsData[]> {
    return this.getSeriesData(seriesIds, startYear, endYear, {
      calculations: true // This enables month-over-month and year-over-year calculations
    });
  }
}

// Core BLS indicators for our analytics
export const coreBlsIndicators = [
  {
    seriesId: 'LNS14000000',
    name: 'Unemployment Rate',
    category: 'employment',
    frequency: 'monthly',
    description: 'Unemployment Rate - 16 years and over'
  },
  {
    seriesId: 'CUUR0000SA0',
    name: 'Consumer Price Index',
    category: 'inflation',
    frequency: 'monthly',
    description: 'Consumer Price Index for All Urban Consumers: All Items'
  },
  {
    seriesId: 'CUUR0000SA0L1E',
    name: 'Core Consumer Price Index',
    category: 'inflation',
    frequency: 'monthly',
    description: 'Consumer Price Index for All Urban Consumers: All Items Less Food and Energy'
  },
  {
    seriesId: 'CUUR0000SAF',
    name: 'Food CPI',
    category: 'inflation',
    frequency: 'monthly',
    description: 'Consumer Price Index for All Urban Consumers: Food'
  },
  {
    seriesId: 'CUUR0000SAE',
    name: 'Energy CPI',
    category: 'inflation',
    frequency: 'monthly',
    description: 'Consumer Price Index for All Urban Consumers: Energy'
  },
  {
    seriesId: 'LNS11300000',
    name: 'Labor Force Participation Rate',
    category: 'employment',
    frequency: 'monthly',
    description: 'Labor Force Participation Rate - 16 years and over'
  },
  {
    seriesId: 'LNS12300000',
    name: 'Employment Population Ratio',
    category: 'employment',
    frequency: 'monthly',
    description: 'Employment-Population Ratio - 16 years and over'
  },
  {
    seriesId: 'WPUFD49207',
    name: 'Producer Price Index',
    category: 'inflation',
    frequency: 'monthly',
    description: 'Producer Price Index by Commodity: Final Demand'
  },
  {
    seriesId: 'CES0500000049',
    name: 'Real Average Hourly Earnings',
    category: 'employment',
    frequency: 'monthly',
    description: 'Real Average Hourly Earnings of Production and Nonsupervisory Employees'
  }
];