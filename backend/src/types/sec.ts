// SEC EDGAR API Types and Interfaces

export interface SECCompanyInfo {
  cik: string;
  entityType: string;
  sic: string;
  sicDescription: string;
  insiderTransactionForOwnerExists: number;
  insiderTransactionForIssuerExists: number;
  name: string;
  tickers: string[];
  exchanges: string[];
  ein: string;
  description: string;
  website: string;
  investorWebsite: string;
  category: string;
  fiscalYearEnd: string;
  stateOfIncorporation: string;
  stateOfIncorporationDescription: string;
  addresses: {
    mailing: SECAddress;
    business: SECAddress;
  };
  phone: string;
  flags: string;
  formerNames: Array<{
    name: string;
    from: string;
    to: string;
  }>;
}

export interface SECAddress {
  street1: string;
  street2?: string;
  city: string;
  stateOrCountry: string;
  zipCode: string;
  stateOrCountryDescription: string;
}

export interface SECSubmission {
  accessionNumber: string;
  filingDate: string;
  reportDate: string;
  acceptanceDateTime: string;
  act: string;
  form: string;
  fileNumber: string;
  filmNumber: string;
  items: string;
  size: number;
  isXBRL: number;
  isInlineXBRL: number;
  primaryDocument: string;
  primaryDocDescription: string;
}

export interface SECCompanySubmissions {
  cik: string;
  entityType: string;
  sic: string;
  sicDescription: string;
  insiderTransactionForOwnerExists: number;
  insiderTransactionForIssuerExists: number;
  name: string;
  tickers: string[];
  exchanges: string[];
  ein: string;
  description: string;
  website: string;
  investorWebsite: string;
  category: string;
  fiscalYearEnd: string;
  stateOfIncorporation: string;
  stateOfIncorporationDescription: string;
  addresses: {
    mailing: SECAddress;
    business: SECAddress;
  };
  phone: string;
  flags: string;
  formerNames: Array<{
    name: string;
    from: string;
    to: string;
  }>;
  filings: {
    recent: {
      accessionNumber: string[];
      filingDate: string[];
      reportDate: string[];
      acceptanceDateTime: string[];
      act: string[];
      form: string[];
      fileNumber: string[];
      filmNumber: string[];
      items: string[];
      size: number[];
      isXBRL: number[];
      isInlineXBRL: number[];
      primaryDocument: string[];
      primaryDocDescription: string[];
    };
    files: Array<{
      name: string;
      filingCount: number;
      filingFrom: string;
      filingTo: string;
    }>;
  };
}

// Company Facts (XBRL financial data)
export interface SECCompanyFacts {
  cik: string;
  entityName: string;
  facts: {
    [taxonomy: string]: {
      [tag: string]: {
        label: string;
        description: string;
        units: {
          [unit: string]: Array<{
            end: string;
            val: number;
            accn: string;
            fy: number;
            fp: string;
            form: string;
            filed: string;
            frame?: string;
          }>;
        };
      };
    };
  };
}

// Frames data (cross-company comparison)
export interface SECFrameData {
  taxonomy: string;
  tag: string;
  ccp: string;
  uom: string;
  label: string;
  description: string;
  pts: number;
  data: Array<{
    accn: string;
    cik: number;
    entityName: string;
    loc: string;
    end: string;
    val: number;
  }>;
}

// Economic indicators derived from SEC data
export interface SECEconomicIndicator {
  name: string;
  code: string;
  description: string;
  category: 'corporate_earnings' | 'revenue_trends' | 'debt_levels' | 'market_cap' | 'financial_health';
  frequency: 'quarterly' | 'annual';
  unit: string;
  source: 'SEC_EDGAR';
  calculationMethod: 'aggregate' | 'median' | 'weighted_average' | 'growth_rate';
  companies?: string[]; // CIKs of companies to include
  taxonomyTag: string; // XBRL tag to extract
  frames?: string[]; // Frame identifiers for cross-company data
}

// Processed SEC data for indicators
export interface ProcessedSECData {
  indicatorCode: string;
  date: Date;
  value: number;
  period: string; // 'Q1', 'Q2', etc. or 'FY'
  companies: Array<{
    cik: string;
    name: string;
    value: number;
    filingDate: string;
  }>;
  metadata: {
    totalCompanies: number;
    taxonomyTag: string;
    calculationMethod: string;
    dataQuality: 'high' | 'medium' | 'low';
  };
}

// Core SEC indicators we'll track
export const coreSECIndicators: SECEconomicIndicator[] = [
  {
    name: 'S&P 500 Aggregate Revenue',
    code: 'SEC_SP500_REVENUE',
    description: 'Quarterly aggregate revenue of S&P 500 companies',
    category: 'revenue_trends',
    frequency: 'quarterly',
    unit: 'USD_BILLIONS',
    source: 'SEC_EDGAR',
    calculationMethod: 'aggregate',
    taxonomyTag: 'us-gaap:Revenues',
    companies: [], // Will populate with S&P 500 CIKs
  },
  {
    name: 'Corporate Debt Levels',
    code: 'SEC_CORPORATE_DEBT',
    description: 'Aggregate long-term debt of major corporations',
    category: 'debt_levels',
    frequency: 'quarterly',
    unit: 'USD_BILLIONS',
    source: 'SEC_EDGAR',
    calculationMethod: 'aggregate',
    taxonomyTag: 'us-gaap:LongTermDebt',
  },
  {
    name: 'Corporate Cash Holdings',
    code: 'SEC_CASH_HOLDINGS',
    description: 'Aggregate cash and cash equivalents of major corporations',
    category: 'financial_health',
    frequency: 'quarterly',
    unit: 'USD_BILLIONS',
    source: 'SEC_EDGAR',
    calculationMethod: 'aggregate',
    taxonomyTag: 'us-gaap:CashAndCashEquivalentsAtCarryingValue',
  },
  {
    name: 'Net Income Growth Rate',
    code: 'SEC_NET_INCOME_GROWTH',
    description: 'Year-over-year net income growth rate for major corporations',
    category: 'corporate_earnings',
    frequency: 'quarterly',
    unit: 'PERCENT',
    source: 'SEC_EDGAR',
    calculationMethod: 'weighted_average',
    taxonomyTag: 'us-gaap:NetIncomeLoss',
  },
  {
    name: 'Return on Assets Median',
    code: 'SEC_ROA_MEDIAN',
    description: 'Median return on assets for large corporations',
    category: 'financial_health',
    frequency: 'quarterly',
    unit: 'PERCENT',
    source: 'SEC_EDGAR',
    calculationMethod: 'median',
    taxonomyTag: 'us-gaap:ReturnOnAssets',
  }
];

// Major companies to track (Fortune 500 representatives)
export const majorCompanyCIKs = [
  '0000051143', // IBM
  '0000789019', // Microsoft
  '0000320193', // Apple
  '0001018724', // Amazon
  '0001652044', // Alphabet (Google)
  '0000732712', // Exxon Mobil
  '0000019617', // JPMorgan Chase
  '0000886982', // Berkshire Hathaway
  '0000831001', // Walmart
  '0000064803', // Nike
  '0000200406', // Johnson & Johnson
  '0000078003', // Pfizer
  '0000034088', // Boeing
  '0000018230', // Caterpillar
  '0000021344', // General Electric
];

// API endpoints
export const SEC_API_BASE = 'https://data.sec.gov';

export const SEC_ENDPOINTS = {
  COMPANY_SUBMISSIONS: '/submissions/CIK{cik}.json',
  COMPANY_FACTS: '/api/xbrl/companyfacts/CIK{cik}.json',
  COMPANY_CONCEPT: '/api/xbrl/companyconcept/CIK{cik}/{taxonomy}/{tag}.json',
  FRAMES: '/api/xbrl/frames/{taxonomy}/{tag}/{unit}/{frame}.json',
  BULK_COMPANY_FACTS: '/zip/companyfacts.zip',
  BULK_SUBMISSIONS: '/zip/submissions.zip',
} as const;