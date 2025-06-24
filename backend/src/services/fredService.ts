import axios from 'axios';
import { FredApiResponse, FredSeriesInfo } from '../types/fred';

export class FredService {
  private apiKey: string;
  private baseUrl = 'https://api.stlouisfed.org/fred';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async getSeriesObservations(seriesId: string, limit = 100): Promise<FredApiResponse> {
    const response = await axios.get(`${this.baseUrl}/series/observations`, {
      params: {
        series_id: seriesId,
        api_key: this.apiKey,
        file_type: 'json',
        limit,
        sort_order: 'desc'
      }
    });
    return response.data;
  }

  async getSeriesInfo(seriesId: string): Promise<FredSeriesInfo> {
    const response = await axios.get(`${this.baseUrl}/series`, {
      params: {
        series_id: seriesId,
        api_key: this.apiKey,
        file_type: 'json'
      }
    });
    return response.data.seriess[0];
  }

  async searchSeries(searchText: string, limit = 10): Promise<any> {
    const response = await axios.get(`${this.baseUrl}/series/search`, {
      params: {
        search_text: searchText,
        api_key: this.apiKey,
        file_type: 'json',
        limit
      }
    });
    return response.data;
  }
}

export const coreIndicators = [
  {
    seriesId: 'GDP',
    name: 'Gross Domestic Product',
    category: 'economic_growth',
    frequency: 'quarterly'
  },
  {
    seriesId: 'UNRATE',
    name: 'Unemployment Rate',
    category: 'employment',
    frequency: 'monthly'
  },
  {
    seriesId: 'CPIAUCSL',
    name: 'Consumer Price Index',
    category: 'inflation',
    frequency: 'monthly'
  },
  {
    seriesId: 'FEDFUNDS',
    name: 'Federal Funds Rate',
    category: 'monetary_policy',
    frequency: 'monthly'
  },
  {
    seriesId: 'PAYEMS',
    name: 'Nonfarm Payrolls',
    category: 'employment',
    frequency: 'monthly'
  }
];