import axios from 'axios';
import { ECBDataResponse, ProcessedECBData, coreECBIndicators } from '../types/ecb';

export class ECBService {
  private baseUrl = 'https://data-api.ecb.europa.eu/service/data';

  constructor() {
    // ECB API is free and doesn't require an API key
  }

  async getProcessedSeriesData(seriesCode: string): Promise<ProcessedECBData[]> {
    try {
      // ECB API endpoint format: /data/{dataflow}/{key}?{parameters}
      // We'll get the last 100 observations
      const url = `${this.baseUrl}/BSI/${seriesCode}?lastNObservations=100&format=jsondata`;
      
      const response = await axios.get<ECBDataResponse>(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'EconIndicatorDaily/1.0'
        },
        timeout: 10000
      });

      return this.processECBResponse(response.data, seriesCode);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error(`ECB API request failed for ${seriesCode}:`, error.response?.status, error.response?.statusText);
        if (error.response?.status === 404) {
          console.warn(`Series ${seriesCode} not found on ECB API`);
          return [];
        }
      }
      console.error(`Failed to process ECB data for ${seriesCode}:`, error);
      throw error;
    }
  }

  async getProcessedExchangeRateData(seriesCode: string): Promise<ProcessedECBData[]> {
    try {
      // Exchange rates use a different dataflow
      const url = `${this.baseUrl}/EXR/${seriesCode}?lastNObservations=100&format=jsondata`;
      
      const response = await axios.get<ECBDataResponse>(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'EconIndicatorDaily/1.0'
        },
        timeout: 10000
      });

      return this.processECBResponse(response.data, seriesCode);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error(`ECB Exchange Rate API request failed for ${seriesCode}:`, error.response?.status, error.response?.statusText);
        if (error.response?.status === 404) {
          console.warn(`Exchange rate series ${seriesCode} not found on ECB API`);
          return [];
        }
      }
      console.error(`Failed to process ECB exchange rate data for ${seriesCode}:`, error);
      throw error;
    }
  }

  async getProcessedInterestRateData(seriesCode: string): Promise<ProcessedECBData[]> {
    try {
      // Interest rates use FM dataflow
      const url = `${this.baseUrl}/FM/${seriesCode}?lastNObservations=100&format=jsondata`;
      
      const response = await axios.get<ECBDataResponse>(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'EconIndicatorDaily/1.0'
        },
        timeout: 10000
      });

      return this.processECBResponse(response.data, seriesCode);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error(`ECB Interest Rate API request failed for ${seriesCode}:`, error.response?.status, error.response?.statusText);
        if (error.response?.status === 404) {
          console.warn(`Interest rate series ${seriesCode} not found on ECB API`);
          return [];
        }
      }
      console.error(`Failed to process ECB interest rate data for ${seriesCode}:`, error);
      throw error;
    }
  }

  async getProcessedInflationData(seriesCode: string): Promise<ProcessedECBData[]> {
    try {
      // Inflation data uses ICP dataflow
      const url = `${this.baseUrl}/ICP/${seriesCode}?lastNObservations=100&format=jsondata`;
      
      const response = await axios.get<ECBDataResponse>(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'EconIndicatorDaily/1.0'
        },
        timeout: 10000
      });

      return this.processECBResponse(response.data, seriesCode);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error(`ECB Inflation API request failed for ${seriesCode}:`, error.response?.status, error.response?.statusText);
        if (error.response?.status === 404) {
          console.warn(`Inflation series ${seriesCode} not found on ECB API`);
          return [];
        }
      }
      console.error(`Failed to process ECB inflation data for ${seriesCode}:`, error);
      throw error;
    }
  }

  private processECBResponse(data: ECBDataResponse, seriesCode: string): ProcessedECBData[] {
    try {
      if (!data.dataSets || data.dataSets.length === 0) {
        console.warn(`No data sets found for series ${seriesCode}`);
        return [];
      }

      const dataSet = data.dataSets[0];
      if (!dataSet.series) {
        console.warn(`No series data found for ${seriesCode}`);
        return [];
      }

      const seriesKey = Object.keys(dataSet.series)[0];
      if (!seriesKey) {
        console.warn(`No series key found for ${seriesCode}`);
        return [];
      }

      const series = dataSet.series[seriesKey];
      if (!series.observations) {
        console.warn(`No observations found for ${seriesCode}`);
        return [];
      }

      // Get time dimension values
      const timeDimension = data.structure.dimensions.observation.find(d => d.id === 'TIME_PERIOD');
      if (!timeDimension) {
        console.warn(`No time dimension found for ${seriesCode}`);
        return [];
      }

      const processedData: ProcessedECBData[] = [];

      // Convert observations to processed data
      Object.entries(series.observations).forEach(([timeIndex, valueArray]) => {
        const timeValue = timeDimension.values[parseInt(timeIndex)];
        if (timeValue && valueArray && valueArray[0] !== null && valueArray[0] !== undefined) {
          // Convert ECB date format (YYYY-MM-DD or YYYY-MM or YYYY) to ISO format
          let isoDate: string;
          if (timeValue.id.length === 4) {
            // Yearly data - use January 1st
            isoDate = `${timeValue.id}-01-01`;
          } else if (timeValue.id.length === 7) {
            // Monthly data - use first day of month
            isoDate = `${timeValue.id}-01`;
          } else {
            // Daily data or other format
            isoDate = timeValue.id;
          }

          processedData.push({
            date: isoDate,
            value: valueArray[0],
            symbol: seriesCode,
            name: this.getIndicatorName(seriesCode)
          });
        }
      });

      // Sort by date (most recent first)
      return processedData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    } catch (error) {
      console.error(`Error processing ECB response for ${seriesCode}:`, error);
      return [];
    }
  }

  private getIndicatorName(seriesCode: string): string {
    const indicator = coreECBIndicators.find(ind => ind.code === seriesCode);
    return indicator ? indicator.name : `ECB Series ${seriesCode}`;
  }

  // Test connection to ECB API
  async testConnection(): Promise<boolean> {
    try {
      // Test with a simple series - ECB key interest rate
      const url = `${this.baseUrl}/FM/FM.B.U2.EUR.4F.KR.MRR_FR.LEV?lastNObservations=1&format=jsondata`;
      
      const response = await axios.get(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'EconIndicatorDaily/1.0'
        },
        timeout: 5000
      });

      return response.status === 200;
    } catch (error) {
      console.error('ECB API connection test failed:', error);
      return false;
    }
  }
}

export { coreECBIndicators };