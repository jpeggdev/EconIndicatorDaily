import axios, { AxiosInstance } from 'axios';
import {
  SECCompanySubmissions,
  SECCompanyFacts,
  SECFrameData,
  ProcessedSECData,
  SECEconomicIndicator,
  coreSECIndicators,
  majorCompanyCIKs,
  SEC_API_BASE,
  SEC_ENDPOINTS
} from '../types/sec';

export { coreSECIndicators } from '../types/sec';

export class SECService {
  private apiClient: AxiosInstance;
  private readonly rateLimitDelay = 110; // 100ms + buffer to stay under 10 req/sec
  private lastRequestTime = 0;

  constructor() {
    this.apiClient = axios.create({
      baseURL: SEC_API_BASE,
      timeout: 30000,
      headers: {
        'User-Agent': 'EconIndicatorDaily/1.0 (https://econindicatordaily.com)', // Required by SEC
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
      },
    });

    // Add rate limiting interceptor
    this.apiClient.interceptors.request.use(async (config) => {
      const now = Date.now();
      const timeSinceLastRequest = now - this.lastRequestTime;
      
      if (timeSinceLastRequest < this.rateLimitDelay) {
        const delay = this.rateLimitDelay - timeSinceLastRequest;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      
      this.lastRequestTime = Date.now();
      return config;
    });
  }

  // Format CIK to 10-digit string with leading zeros
  private formatCIK(cik: string): string {
    return cik.padStart(10, '0');
  }

  // Get company submissions (filing history)
  async getCompanySubmissions(cik: string): Promise<SECCompanySubmissions | null> {
    try {
      const formattedCIK = this.formatCIK(cik);
      const url = SEC_ENDPOINTS.COMPANY_SUBMISSIONS.replace('{cik}', formattedCIK);
      
      console.log(`🏢 Fetching SEC submissions for CIK: ${formattedCIK}`);
      const response = await this.apiClient.get<SECCompanySubmissions>(url);
      
      return response.data;
    } catch (error) {
      console.error(`Failed to fetch submissions for CIK ${cik}:`, error);
      return null;
    }
  }

  // Get company facts (XBRL financial data)
  async getCompanyFacts(cik: string): Promise<SECCompanyFacts | null> {
    try {
      const formattedCIK = this.formatCIK(cik);
      const url = SEC_ENDPOINTS.COMPANY_FACTS.replace('{cik}', formattedCIK);
      
      console.log(`📊 Fetching SEC facts for CIK: ${formattedCIK}`);
      const response = await this.apiClient.get<SECCompanyFacts>(url);
      
      return response.data;
    } catch (error) {
      console.error(`Failed to fetch facts for CIK ${cik}:`, error);
      return null;
    }
  }

  // Get frames data (cross-company comparison for specific metric)
  async getFrameData(taxonomy: string, tag: string, unit: string, frame: string): Promise<SECFrameData | null> {
    try {
      const url = SEC_ENDPOINTS.FRAMES
        .replace('{taxonomy}', taxonomy)
        .replace('{tag}', tag)
        .replace('{unit}', unit)
        .replace('{frame}', frame);
      
      console.log(`🔍 Fetching SEC frame data: ${taxonomy}/${tag}/${unit}/${frame}`);
      const response = await this.apiClient.get<SECFrameData>(url);
      
      return response.data;
    } catch (error) {
      console.error(`Failed to fetch frame data for ${taxonomy}/${tag}:`, error);
      return null;
    }
  }

  // Extract specific financial metric from company facts
  private extractFinancialMetric(
    facts: SECCompanyFacts,
    taxonomyTag: string,
    preferredUnit: string = 'USD'
  ): Array<{ date: Date; value: number; period: string; form: string }> {
    const results: Array<{ date: Date; value: number; period: string; form: string }> = [];
    
    try {
      // Split taxonomy and tag (e.g., 'us-gaap:Revenues' -> ['us-gaap', 'Revenues'])
      const [taxonomy, tag] = taxonomyTag.split(':');
      
      if (!facts.facts[taxonomy] || !facts.facts[taxonomy][tag]) {
        console.warn(`Tag ${taxonomyTag} not found for ${facts.entityName}`);
        return results;
      }
      
      const tagData = facts.facts[taxonomy][tag];
      
      // Find the best unit (prefer USD, then any available unit)
      let unit = preferredUnit;
      if (!tagData.units[unit]) {
        unit = Object.keys(tagData.units)[0];
        if (!unit) return results;
      }
      
      const unitData = tagData.units[unit];
      
      // Process data points
      for (const dataPoint of unitData) {
        if (dataPoint.val && dataPoint.end && dataPoint.fp) {
          results.push({
            date: new Date(dataPoint.end),
            value: dataPoint.val,
            period: dataPoint.fp,
            form: dataPoint.form,
          });
        }
      }
      
      // Sort by date (newest first)
      results.sort((a, b) => b.date.getTime() - a.date.getTime());
      
    } catch (error) {
      console.error(`Error extracting metric ${taxonomyTag} for ${facts.entityName}:`, error);
    }
    
    return results;
  }

  // Process SEC indicator for multiple companies
  async processIndicator(indicator: SECEconomicIndicator): Promise<ProcessedSECData[]> {
    const results: ProcessedSECData[] = [];
    const companiesToProcess = indicator.companies?.length ? indicator.companies : majorCompanyCIKs;
    
    console.log(`📈 Processing SEC indicator: ${indicator.name}`);
    console.log(`🏭 Processing ${companiesToProcess.length} companies`);
    
    const companyData: Array<{
      cik: string;
      name: string;
      data: Array<{ date: Date; value: number; period: string; form: string }>;
    }> = [];
    
    // Fetch data for each company
    for (const cik of companiesToProcess) {
      try {
        const facts = await this.getCompanyFacts(cik);
        if (!facts) continue;
        
        const metricData = this.extractFinancialMetric(facts, indicator.taxonomyTag);
        if (metricData.length > 0) {
          companyData.push({
            cik,
            name: facts.entityName,
            data: metricData,
          });
        }
        
        // Small delay to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 50));
        
      } catch (error) {
        console.error(`Error processing company ${cik}:`, error);
      }
    }
    
    if (companyData.length === 0) {
      console.warn(`No data found for indicator: ${indicator.name}`);
      return results;
    }
    
    // Group data by reporting periods
    const periodMap = new Map<string, Array<{ cik: string; name: string; value: number; filingDate: string }>>();
    
    for (const company of companyData) {
      for (const dataPoint of company.data) {
        const periodKey = `${dataPoint.date.getFullYear()}-${dataPoint.period}`;
        
        if (!periodMap.has(periodKey)) {
          periodMap.set(periodKey, []);
        }
        
        periodMap.get(periodKey)!.push({
          cik: company.cik,
          name: company.name,
          value: dataPoint.value,
          filingDate: dataPoint.date.toISOString(),
        });
      }
    }
    
    // Calculate aggregated values for each period
    for (const [periodKey, companies] of periodMap.entries()) {
      if (companies.length < 3) continue; // Need at least 3 companies for meaningful data
      
      let aggregatedValue: number;
      const values = companies.map(c => c.value);
      
      switch (indicator.calculationMethod) {
        case 'aggregate':
          aggregatedValue = values.reduce((sum, val) => sum + val, 0);
          break;
        case 'median':
          const sorted = [...values].sort((a, b) => a - b);
          const mid = Math.floor(sorted.length / 2);
          aggregatedValue = sorted.length % 2 === 0 
            ? (sorted[mid - 1] + sorted[mid]) / 2 
            : sorted[mid];
          break;
        case 'weighted_average':
          // Simple average for now (could weight by market cap in future)
          aggregatedValue = values.reduce((sum, val) => sum + val, 0) / values.length;
          break;
        case 'growth_rate':
          // Calculate YoY growth rate (needs historical data)
          aggregatedValue = values.reduce((sum, val) => sum + val, 0) / values.length;
          break;
        default:
          aggregatedValue = values.reduce((sum, val) => sum + val, 0) / values.length;
      }
      
      // Convert to appropriate units
      if (indicator.unit === 'USD_BILLIONS') {
        aggregatedValue = aggregatedValue / 1_000_000_000;
      } else if (indicator.unit === 'USD_MILLIONS') {
        aggregatedValue = aggregatedValue / 1_000_000;
      }
      
      const [year, period] = periodKey.split('-');
      const quarterDate = this.getPeriodDate(parseInt(year), period);
      
      results.push({
        indicatorCode: indicator.code,
        date: quarterDate,
        value: aggregatedValue,
        period,
        companies,
        metadata: {
          totalCompanies: companies.length,
          taxonomyTag: indicator.taxonomyTag,
          calculationMethod: indicator.calculationMethod,
          dataQuality: companies.length >= 10 ? 'high' : companies.length >= 5 ? 'medium' : 'low',
        },
      });
    }
    
    // Sort by date (newest first)
    results.sort((a, b) => b.date.getTime() - a.date.getTime());
    
    console.log(`✅ Processed ${results.length} data points for ${indicator.name}`);
    return results;
  }

  // Convert fiscal period to approximate date
  private getPeriodDate(year: number, period: string): Date {
    switch (period) {
      case 'Q1':
        return new Date(year, 2, 31); // March 31
      case 'Q2':
        return new Date(year, 5, 30); // June 30
      case 'Q3':
        return new Date(year, 8, 30); // September 30
      case 'Q4':
      case 'FY':
        return new Date(year, 11, 31); // December 31
      default:
        return new Date(year, 11, 31); // Default to year end
    }
  }

  // Get all processed indicator data
  async getAllProcessedIndicators(): Promise<Map<string, ProcessedSECData[]>> {
    const results = new Map<string, ProcessedSECData[]>();
    
    console.log(`🚀 Processing ${coreSECIndicators.length} SEC indicators`);
    
    for (const indicator of coreSECIndicators) {
      try {
        const data = await this.processIndicator(indicator);
        results.set(indicator.code, data);
        
        // Delay between indicators to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 200));
        
      } catch (error) {
        console.error(`Failed to process indicator ${indicator.name}:`, error);
        results.set(indicator.code, []);
      }
    }
    
    console.log(`✅ Completed processing SEC indicators`);
    return results;
  }

  // Get latest data for a specific indicator
  async getLatestIndicatorData(indicatorCode: string): Promise<ProcessedSECData | null> {
    const indicator = coreSECIndicators.find(ind => ind.code === indicatorCode);
    if (!indicator) {
      console.error(`Indicator ${indicatorCode} not found`);
      return null;
    }
    
    const data = await this.processIndicator(indicator);
    return data.length > 0 ? data[0] : null;
  }

  // Test connection to SEC API
  async testConnection(): Promise<boolean> {
    try {
      // Test with Apple's CIK
      const submissions = await this.getCompanySubmissions('0000320193');
      return submissions !== null;
    } catch (error) {
      console.error('SEC API connection test failed:', error);
      return false;
    }
  }
}