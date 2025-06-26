export interface ECBDataResponse {
  dataSets: ECBDataSet[];
  structure: ECBStructure;
}

export interface ECBDataSet {
  series: { [key: string]: ECBSeries };
}

export interface ECBSeries {
  observations: { [key: string]: [number] };
}

export interface ECBStructure {
  dimensions: {
    series: ECBDimension[];
    observation: ECBDimension[];
  };
}

export interface ECBDimension {
  id: string;
  name: string;
  values: ECBDimensionValue[];
}

export interface ECBDimensionValue {
  id: string;
  name: string;
}

export interface ProcessedECBData {
  date: string;
  value: number;
  symbol: string;
  name: string;
}

// ECB Statistical Data Warehouse (SDW) series codes - Updated to valid codes
export const ECB_INDICATORS = {
  // Interest Rates - Use simpler codes that work
  MAIN_REFINANCING_RATE: 'MRR_FR', // Main refinancing operations rate
  DEPOSIT_FACILITY_RATE: 'DFR', // Deposit facility rate
  MARGINAL_LENDING_RATE: 'MLF_RT', // Marginal lending facility rate
  
  // Exchange Rates - Use simplified format
  EUR_USD_RATE: 'D.USD.EUR.SP00.A', // EUR/USD daily exchange rate
  EUR_GBP_RATE: 'D.GBP.EUR.SP00.A', // EUR/GBP daily exchange rate
  EUR_JPY_RATE: 'D.JPY.EUR.SP00.A', // EUR/JPY daily exchange rate
  EUR_CHF_RATE: 'D.CHF.EUR.SP00.A', // EUR/CHF daily exchange rate
  
  // Money Supply - Use simplified codes
  M1_MONEY_SUPPLY: 'M.U2.Y.V.M10.X.1.U2.2300.Z01.E', // M1 Money Supply
  M3_MONEY_SUPPLY: 'M.U2.Y.V.M30.X.1.U2.2300.Z01.E', // M3 Money Supply
  
  // Economic Indicators - Use simplified codes
  HICP_INFLATION: 'M.U2.N.000000.4.ANR', // Harmonised Index of Consumer Prices (annual rate)
  UNEMPLOYMENT_RATE: 'M.I8.S.UNEHRT.TOTAL0.15_74.T', // Unemployment rate
};

export const coreECBIndicators = [
  {
    name: 'ECB Main Refinancing Rate',
    code: ECB_INDICATORS.MAIN_REFINANCING_RATE,
    category: 'monetary_policy',
    frequency: 'monthly',
    description: 'European Central Bank main refinancing operations rate',
    unit: '%'
  },
  {
    name: 'ECB Deposit Facility Rate',
    code: ECB_INDICATORS.DEPOSIT_FACILITY_RATE,
    category: 'monetary_policy',
    frequency: 'monthly',
    description: 'European Central Bank deposit facility rate',
    unit: '%'
  },
  {
    name: 'EUR/USD Exchange Rate',
    code: ECB_INDICATORS.EUR_USD_RATE,
    category: 'forex',
    frequency: 'daily',
    description: 'Euro to US Dollar exchange rate',
    unit: 'Exchange Rate'
  },
  {
    name: 'EUR/GBP Exchange Rate',
    code: ECB_INDICATORS.EUR_GBP_RATE,
    category: 'forex',
    frequency: 'daily',
    description: 'Euro to British Pound exchange rate',
    unit: 'Exchange Rate'
  },
  {
    name: 'Eurozone M3 Money Supply',
    code: ECB_INDICATORS.M3_MONEY_SUPPLY,
    category: 'monetary_policy',
    frequency: 'monthly',
    description: 'Eurozone M3 money supply aggregate',
    unit: 'EUR'
  },
  {
    name: 'Eurozone HICP Inflation',
    code: ECB_INDICATORS.HICP_INFLATION,
    category: 'inflation',
    frequency: 'monthly',
    description: 'Harmonised Index of Consumer Prices annual inflation rate',
    unit: '%'
  },
  {
    name: 'Eurozone Unemployment Rate',
    code: ECB_INDICATORS.UNEMPLOYMENT_RATE,
    category: 'employment',
    frequency: 'monthly',
    description: 'Eurozone unemployment rate (seasonally adjusted)',
    unit: '%'
  }
];