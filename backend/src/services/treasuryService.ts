import axios from 'axios';
import { TreasuryDataResponse, ProcessedTreasuryData, coreTreasuryIndicators } from '../types/treasury';

export class TreasuryService {
  private baseUrl = 'https://api.fiscaldata.treasury.gov/services/api/fiscal_service';

  constructor() {
    // Treasury Fiscal Data API is free and doesn't require an API key
  }

  async getProcessedIndicatorData(endpoint: string, indicatorCode: string, limit: number = 50): Promise<ProcessedTreasuryData[]> {
    try {
      // Build API URL with filters and sorting
      const currentDate = new Date();
      const twoYearsAgo = new Date(currentDate.getFullYear() - 2, currentDate.getMonth(), currentDate.getDate());
      
      const params = new URLSearchParams({
        format: 'json',
        sort: '-record_date', // Sort by most recent first
        page_size: limit.toString(),
        filter: `record_date:gte:${twoYearsAgo.toISOString().split('T')[0]}` // Last 2 years
      });

      const url = `${this.baseUrl}${endpoint}?${params}`;
      
      const response = await axios.get<TreasuryDataResponse>(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'EconIndicatorDaily/1.0'
        },
        timeout: 15000
      });

      return this.processTreasuryResponse(response.data, indicatorCode);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error(`Treasury API request failed for ${endpoint}:`, error.response?.status, error.response?.statusText);
        if (error.response?.status === 404) {
          console.warn(`Treasury endpoint ${endpoint} not found`);
          return [];
        }
      }
      console.error(`Failed to process Treasury data for ${endpoint}:`, error);
      throw error;
    }
  }

  private processTreasuryResponse(data: TreasuryDataResponse, indicatorCode: string): ProcessedTreasuryData[] {
    try {
      if (!data.data || !Array.isArray(data.data)) {
        console.warn(`No data array found for indicator ${indicatorCode}`);
        return [];
      }

      const processedData: ProcessedTreasuryData[] = [];

      data.data.forEach(record => {
        // Try to find the indicator value in the record
        const value = this.extractIndicatorValue(record, indicatorCode);
        
        if (value !== null && !isNaN(value) && record.record_date) {
          processedData.push({
            date: record.record_date,
            value: value,
            symbol: indicatorCode,
            name: this.getIndicatorName(indicatorCode),
            fiscalYear: record.record_fiscal_year,
            fiscalQuarter: record.record_fiscal_quarter
          });
        }
      });

      // Sort by date (most recent first)
      return processedData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    } catch (error) {
      console.error(`Error processing Treasury response for ${indicatorCode}:`, error);
      return [];
    }
  }

  private extractIndicatorValue(record: any, indicatorCode: string): number | null {
    // Treasury data often has multiple formats and field names
    // Try different possible field names based on the indicator code
    const possibleFields = [
      indicatorCode,
      indicatorCode.toLowerCase(),
      indicatorCode.replace(/_/g, ''),
      // Common Treasury field patterns
      'current_month_amount',
      'month_to_date_amount', 
      'fiscal_year_to_date_amount',
      'close_today_bal',
      'total_receipts_mtd',
      'total_outlays_mtd',
      'total_surplus_deficit_mtd',
      'debt_held_public_amt',
      'tot_pub_debt_out_amt'
    ];

    for (const field of possibleFields) {
      if (record[field] !== undefined && record[field] !== null && record[field] !== '') {
        const numValue = parseFloat(String(record[field]).replace(/,/g, ''));
        if (!isNaN(numValue)) {
          // Convert millions to actual dollars for consistency
          // Treasury data is often in millions
          return numValue * 1000000;
        }
      }
    }

    return null;
  }

  private getIndicatorName(indicatorCode: string): string {
    const indicator = coreTreasuryIndicators.find(ind => ind.code === indicatorCode);
    return indicator ? indicator.name : `Treasury Indicator ${indicatorCode}`;
  }

  // Get data for specific Treasury indicators
  async getProcessedReceiptsData(): Promise<ProcessedTreasuryData[]> {
    return this.getProcessedIndicatorData('/v1/accounting/mts/mts_table_4', 'total_receipts_mtd');
  }

  async getProcessedOutlaysData(): Promise<ProcessedTreasuryData[]> {
    return this.getProcessedIndicatorData('/v1/accounting/mts/mts_table_5', 'total_outlays_mtd');
  }

  async getProcessedBudgetBalanceData(): Promise<ProcessedTreasuryData[]> {
    return this.getProcessedIndicatorData('/v1/accounting/mts/mts_table_1', 'total_surplus_deficit_mtd');
  }

  async getProcessedCashBalanceData(): Promise<ProcessedTreasuryData[]> {
    return this.getProcessedIndicatorData('/v1/accounting/dts/dts_table_1', 'close_today_bal');
  }

  async getProcessedDebtData(): Promise<ProcessedTreasuryData[]> {
    return this.getProcessedIndicatorData('/v1/accounting/mspd/mspd_table_1', 'tot_pub_debt_out_amt');
  }

  async getProcessedPublicDebtData(): Promise<ProcessedTreasuryData[]> {
    return this.getProcessedIndicatorData('/v1/accounting/mspd/mspd_table_1', 'debt_held_public_amt');
  }

  // Test connection to Treasury API
  async testConnection(): Promise<boolean> {
    try {
      // Test with a simple endpoint - Daily Treasury Statement
      const url = `${this.baseUrl}/v1/accounting/dts/dts_table_1?format=json&page_size=1`;
      
      const response = await axios.get(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'EconIndicatorDaily/1.0'
        },
        timeout: 10000
      });

      return response.status === 200;
    } catch (error) {
      console.error('Treasury API connection test failed:', error);
      return false;
    }
  }
}

export { coreTreasuryIndicators };