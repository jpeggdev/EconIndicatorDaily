export interface IMFDataResponse {
  CompactData: {
    DataSet: {
      Series?: IMFSeries | IMFSeries[];
    };
  };
}

export interface IMFSeries {
  '@attributes': {
    REF_AREA: string;
    INDICATOR: string;
    FREQ: string;
  };
  Obs?: IMFObservation | IMFObservation[];
}

export interface IMFObservation {
  '@attributes': {
    TIME_PERIOD: string;
    OBS_VALUE: string;
  };
}

export interface ProcessedIMFData {
  date: string;
  value: number;
  symbol: string;
  name: string;
  country: string;
}

// IMF World Economic Outlook (WEO) and International Financial Statistics (IFS) indicators
export const IMF_INDICATORS = {
  // Global Economic Indicators
  WORLD_GDP_GROWTH: 'NGDP_RPCH', // Real GDP growth, annual percent change
  WORLD_INFLATION: 'PCPIPCH', // Inflation, average consumer prices, annual percent change
  WORLD_UNEMPLOYMENT: 'LUR', // Unemployment rate, percent of total labor force
  
  // Advanced Economies
  US_GDP_GROWTH: 'NGDP_RPCH.US',
  US_INFLATION: 'PCPIPCH.US', 
  US_UNEMPLOYMENT: 'LUR.US',
  
  // Eurozone
  EUROZONE_GDP_GROWTH: 'NGDP_RPCH.U2',
  EUROZONE_INFLATION: 'PCPIPCH.U2',
  EUROZONE_UNEMPLOYMENT: 'LUR.U2',
  
  // Major Economies
  CHINA_GDP_GROWTH: 'NGDP_RPCH.CN',
  JAPAN_GDP_GROWTH: 'NGDP_RPCH.JP',
  UK_GDP_GROWTH: 'NGDP_RPCH.GB',
  
  // Financial Indicators
  GLOBAL_CURRENT_ACCOUNT: 'BCA_NGDPD', // Current account balance, percent of GDP
  GLOBAL_FISCAL_BALANCE: 'GGR_NGDP', // General government revenue, percent of GDP
};

export const coreIMFIndicators = [
  {
    name: 'World GDP Growth Rate',
    code: IMF_INDICATORS.WORLD_GDP_GROWTH,
    category: 'economic_growth',
    frequency: 'annual',
    description: 'Global real GDP growth rate, annual percent change',
    unit: '%',
    country: 'World'
  },
  {
    name: 'World Inflation Rate',
    code: IMF_INDICATORS.WORLD_INFLATION,
    category: 'inflation',
    frequency: 'annual',
    description: 'Global inflation rate based on consumer prices',
    unit: '%',
    country: 'World'
  },
  {
    name: 'World Unemployment Rate',
    code: IMF_INDICATORS.WORLD_UNEMPLOYMENT,
    category: 'employment',
    frequency: 'annual',
    description: 'Global unemployment rate, percent of total labor force',
    unit: '%',
    country: 'World'
  },
  {
    name: 'US GDP Growth (IMF)',
    code: IMF_INDICATORS.US_GDP_GROWTH,
    category: 'economic_growth',
    frequency: 'annual',
    description: 'United States real GDP growth rate from IMF data',
    unit: '%',
    country: 'United States'
  },
  {
    name: 'Eurozone GDP Growth (IMF)',
    code: IMF_INDICATORS.EUROZONE_GDP_GROWTH,
    category: 'economic_growth',
    frequency: 'annual',
    description: 'Eurozone real GDP growth rate from IMF data',
    unit: '%',
    country: 'Eurozone'
  },
  {
    name: 'China GDP Growth (IMF)',
    code: IMF_INDICATORS.CHINA_GDP_GROWTH,
    category: 'economic_growth',
    frequency: 'annual',
    description: 'China real GDP growth rate from IMF data',
    unit: '%',
    country: 'China'
  },
  {
    name: 'Japan GDP Growth (IMF)',
    code: IMF_INDICATORS.JAPAN_GDP_GROWTH,
    category: 'economic_growth',
    frequency: 'annual',
    description: 'Japan real GDP growth rate from IMF data',
    unit: '%',
    country: 'Japan'
  },
  {
    name: 'UK GDP Growth (IMF)',
    code: IMF_INDICATORS.UK_GDP_GROWTH,
    category: 'economic_growth',
    frequency: 'annual',
    description: 'United Kingdom real GDP growth rate from IMF data',
    unit: '%',
    country: 'United Kingdom'
  }
];