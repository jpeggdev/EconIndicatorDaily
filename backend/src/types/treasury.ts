export interface TreasuryDataResponse {
  data: TreasuryDataPoint[];
  meta: {
    count: number;
    labels: {
      [key: string]: string;
    };
    dataTypes: {
      [key: string]: string;
    };
    dataFormats: {
      [key: string]: string;
    };
    total_count: number;
    total_pages: number;
  };
  links: {
    self: string;
    first: string;
    prev?: string;
    next?: string;
    last: string;
  };
}

export interface TreasuryDataPoint {
  record_date: string;
  record_fiscal_year: string;
  record_fiscal_quarter: string;
  record_calendar_year: string;
  record_calendar_quarter: string;
  record_calendar_month: string;
  [key: string]: string | number; // Dynamic fields based on dataset
}

export interface ProcessedTreasuryData {
  date: string;
  value: number;
  symbol: string;
  name: string;
  fiscalYear?: string;
  fiscalQuarter?: string;
}

// Treasury Fiscal Data API endpoints and indicators
export const TREASURY_ENDPOINTS = {
  // Monthly Treasury Statement (MTS)
  MTS_RECEIPTS: '/v1/accounting/mts/mts_table_4',
  MTS_OUTLAYS: '/v1/accounting/mts/mts_table_5', 
  MTS_BALANCE: '/v1/accounting/mts/mts_table_1',
  
  // Daily Treasury Statement (DTS)
  DTS_CASH_BALANCE: '/v1/accounting/dts/dts_table_1',
  DTS_DEPOSITS_WITHDRAWALS: '/v1/accounting/dts/dts_table_2',
  
  // Monthly Statement of Public Debt (MSPD)
  DEBT_OUTSTANDING: '/v1/accounting/mspd/mspd_table_1',
  
  // Historical Debt Outstanding
  HISTORICAL_DEBT: '/v1/accounting/od/debt_to_penny',
  
  // Treasury Reporting Rates of Exchange
  EXCHANGE_RATES: '/v1/accounting/od/rates_of_exchange'
};

export const TREASURY_INDICATORS = {
  FEDERAL_RECEIPTS: 'total_receipts_mtd',
  FEDERAL_OUTLAYS: 'total_outlays_mtd', 
  BUDGET_BALANCE: 'total_surplus_deficit_mtd',
  CASH_BALANCE: 'close_today_bal',
  DEBT_OUTSTANDING: 'debt_held_public_amt',
  TOTAL_DEBT: 'tot_pub_debt_out_amt'
};

export const coreTreasuryIndicators = [
  {
    name: 'Federal Budget Balance',
    code: TREASURY_INDICATORS.BUDGET_BALANCE,
    endpoint: TREASURY_ENDPOINTS.MTS_BALANCE,
    category: 'fiscal_policy',
    frequency: 'monthly',
    description: 'Monthly federal budget surplus or deficit',
    unit: 'USD'
  },
  {
    name: 'Federal Revenue',
    code: TREASURY_INDICATORS.FEDERAL_RECEIPTS,
    endpoint: TREASURY_ENDPOINTS.MTS_RECEIPTS,
    category: 'fiscal_policy',
    frequency: 'monthly',
    description: 'Total federal government receipts (revenue)',
    unit: 'USD'
  },
  {
    name: 'Federal Spending',
    code: TREASURY_INDICATORS.FEDERAL_OUTLAYS,
    endpoint: TREASURY_ENDPOINTS.MTS_OUTLAYS,
    category: 'fiscal_policy',
    frequency: 'monthly',
    description: 'Total federal government outlays (spending)',
    unit: 'USD'
  },
  {
    name: 'Treasury Cash Balance',
    code: TREASURY_INDICATORS.CASH_BALANCE,
    endpoint: TREASURY_ENDPOINTS.DTS_CASH_BALANCE,
    category: 'fiscal_policy',
    frequency: 'daily',
    description: 'Daily Treasury operating cash balance',
    unit: 'USD'
  },
  {
    name: 'Total Public Debt',
    code: TREASURY_INDICATORS.TOTAL_DEBT,
    endpoint: TREASURY_ENDPOINTS.DEBT_OUTSTANDING,
    category: 'fiscal_policy',
    frequency: 'monthly',
    description: 'Total public debt outstanding',
    unit: 'USD'
  },
  {
    name: 'Debt Held by Public',
    code: TREASURY_INDICATORS.DEBT_OUTSTANDING,
    endpoint: TREASURY_ENDPOINTS.DEBT_OUTSTANDING,
    category: 'fiscal_policy',
    frequency: 'monthly',
    description: 'Federal debt held by the public (excludes intragovernmental holdings)',
    unit: 'USD'
  }
];