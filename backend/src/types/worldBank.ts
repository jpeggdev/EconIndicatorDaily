export interface WorldBankMetadata {
  page: number;
  pages: number;
  per_page: number;
  total: number;
}

export interface WorldBankDataPoint {
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
}

export interface WorldBankResponse {
  [0]: WorldBankMetadata;
  [1]: WorldBankDataPoint[];
}

export interface WorldBankIndicatorResult {
  indicator: {
    id: string;
    name: string;
  };
  country: string;
  date: string;
  value: number;
  unit: string;
  metadata: {
    total_records: number;
    page: number;
    pages: number;
  };
  all_data: WorldBankDataPoint[];
}

export interface WorldBankIndicators {
  GDP: string; // 'NY.GDP.MKTP.CD'
  GDP_PER_CAPITA: string; // 'NY.GDP.PCAP.CD'
  INFLATION: string; // 'FP.CPI.TOTL.ZG'
  POPULATION: string; // 'SP.POP.TOTL'
  UNEMPLOYMENT: string; // 'SL.UEM.TOTL.ZS'
  FDI: string; // 'BX.KLT.DINV.CD.WD'
  GOVERNMENT_DEBT: string; // 'GC.DOD.TOTL.GD.ZS'
  TRADE_BALANCE: string; // 'NE.RSB.GNFS.CD'
}

export const WORLD_BANK_INDICATORS: WorldBankIndicators = {
  GDP: 'NY.GDP.MKTP.CD',
  GDP_PER_CAPITA: 'NY.GDP.PCAP.CD',
  INFLATION: 'FP.CPI.TOTL.ZG',
  POPULATION: 'SP.POP.TOTL',
  UNEMPLOYMENT: 'SL.UEM.TOTL.ZS',
  FDI: 'BX.KLT.DINV.CD.WD',
  GOVERNMENT_DEBT: 'GC.DOD.TOTL.GD.ZS',
  TRADE_BALANCE: 'NE.RSB.GNFS.CD'
};