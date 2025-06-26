import axios from 'axios';
import { IMFDataResponse, ProcessedIMFData, coreIMFIndicators, IMFSeries, IMFObservation } from '../types/imf';

export class IMFService {
  private baseUrl = 'https://dataservices.imf.org/REST/SDMX_JSON.svc';

  constructor() {
    // IMF API is free and doesn't require an API key
  }

  async getProcessedWEOData(indicatorCode: string, countryCode: string = 'W00'): Promise<ProcessedIMFData[]> {
    try {
      // World Economic Outlook database
      // Format: CompactData/{database}/{frequency}/{country}/{indicator}/{start-period}/{end-period}
      const currentYear = new Date().getFullYear();
      const startYear = currentYear - 10; // Get last 10 years of data
      
      const url = `${this.baseUrl}/CompactData/WEO/A/${countryCode}/${indicatorCode}/${startYear}/${currentYear}`;
      
      const response = await axios.get<IMFDataResponse>(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'EconIndicatorDaily/1.0'
        },
        timeout: 15000
      });

      return this.processIMFResponse(response.data, indicatorCode, countryCode);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error(`IMF WEO API request failed for ${indicatorCode}:`, error.response?.status, error.response?.statusText);
        if (error.response?.status === 404) {
          console.warn(`WEO series ${indicatorCode} not found for country ${countryCode}`);
          return [];
        }
      }
      console.error(`Failed to process IMF WEO data for ${indicatorCode}:`, error);
      throw error;
    }
  }

  async getProcessedIFSData(indicatorCode: string, countryCode: string = 'US'): Promise<ProcessedIMFData[]> {
    try {
      // International Financial Statistics
      const currentYear = new Date().getFullYear();
      const startYear = currentYear - 5; // Get last 5 years of data for more frequent updates
      
      const url = `${this.baseUrl}/CompactData/IFS/M/${countryCode}/${indicatorCode}/${startYear}/${currentYear}`;
      
      const response = await axios.get<IMFDataResponse>(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'EconIndicatorDaily/1.0'
        },
        timeout: 15000
      });

      return this.processIMFResponse(response.data, indicatorCode, countryCode);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error(`IMF IFS API request failed for ${indicatorCode}:`, error.response?.status, error.response?.statusText);
        if (error.response?.status === 404) {
          console.warn(`IFS series ${indicatorCode} not found for country ${countryCode}`);
          return [];
        }
      }
      console.error(`Failed to process IMF IFS data for ${indicatorCode}:`, error);
      throw error;
    }
  }

  private processIMFResponse(data: IMFDataResponse, indicatorCode: string, countryCode: string): ProcessedIMFData[] {
    try {
      if (!data.CompactData?.DataSet?.Series) {
        console.warn(`No series data found for ${indicatorCode}`);
        return [];
      }

      let seriesArray: IMFSeries[];
      
      // Handle both single series and array of series
      if (Array.isArray(data.CompactData.DataSet.Series)) {
        seriesArray = data.CompactData.DataSet.Series;
      } else {
        seriesArray = [data.CompactData.DataSet.Series];
      }

      const processedData: ProcessedIMFData[] = [];

      seriesArray.forEach(series => {
        if (!series.Obs) return;

        let observations: IMFObservation[];
        
        // Handle both single observation and array of observations
        if (Array.isArray(series.Obs)) {
          observations = series.Obs;
        } else {
          observations = [series.Obs];
        }

        observations.forEach(obs => {
          const value = parseFloat(obs['@attributes'].OBS_VALUE);
          const timePeriod = obs['@attributes'].TIME_PERIOD;
          
          if (!isNaN(value) && timePeriod) {
            // Convert IMF time period to ISO date
            let isoDate: string;
            if (timePeriod.length === 4) {
              // Annual data (YYYY)
              isoDate = `${timePeriod}-01-01`;
            } else if (timePeriod.includes('Q')) {
              // Quarterly data (YYYY-QN)
              const [year, quarter] = timePeriod.split('Q');
              const month = (parseInt(quarter) - 1) * 3 + 1;
              isoDate = `${year}-${month.toString().padStart(2, '0')}-01`;
            } else if (timePeriod.includes('M')) {
              // Monthly data (YYYY-MNN)
              const year = timePeriod.substring(0, 4);
              const month = timePeriod.substring(5);
              isoDate = `${year}-${month}-01`;
            } else {
              // Default to assuming it's a year
              isoDate = `${timePeriod}-01-01`;
            }

            processedData.push({
              date: isoDate,
              value: value,
              symbol: indicatorCode,
              name: this.getIndicatorName(indicatorCode),
              country: this.getCountryName(countryCode)
            });
          }
        });
      });

      // Sort by date (most recent first)
      return processedData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    } catch (error) {
      console.error(`Error processing IMF response for ${indicatorCode}:`, error);
      return [];
    }
  }

  private getIndicatorName(indicatorCode: string): string {
    const indicator = coreIMFIndicators.find(ind => ind.code.includes(indicatorCode));
    return indicator ? indicator.name : `IMF Indicator ${indicatorCode}`;
  }

  private getCountryName(countryCode: string): string {
    const countryMap: { [key: string]: string } = {
      'W00': 'World',
      'US': 'United States',
      'U2': 'Eurozone',
      'CN': 'China',
      'JP': 'Japan',
      'GB': 'United Kingdom',
      'DE': 'Germany',
      'FR': 'France',
      'IT': 'Italy',
      'CA': 'Canada',
      'AU': 'Australia'
    };
    
    return countryMap[countryCode] || countryCode;
  }

  // Test connection to IMF API
  async testConnection(): Promise<boolean> {
    try {
      // Test with a simple series - World GDP growth
      const currentYear = new Date().getFullYear();
      const url = `${this.baseUrl}/CompactData/WEO/A/W00/NGDP_RPCH/${currentYear - 1}/${currentYear}`;
      
      const response = await axios.get(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'EconIndicatorDaily/1.0'
        },
        timeout: 10000
      });

      return response.status === 200;
    } catch (error) {
      console.error('IMF API connection test failed:', error);
      return false;
    }
  }
}

export { coreIMFIndicators };