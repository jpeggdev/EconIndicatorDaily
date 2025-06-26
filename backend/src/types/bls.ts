export interface BlsApiResponse {
  status: string;
  responseTime: number;
  message: string[];
  Results: {
    series: BlsSeries[];
  };
}

export interface BlsSeries {
  seriesID: string;
  data: BlsDataPoint[];
}

export interface BlsDataPoint {
  year: string;
  period: string;
  periodName: string;
  latest: string;
  value: string;
  footnotes: BlsFootnote[];
}

export interface BlsFootnote {
  code: string;
  text: string;
}

export interface BlsApiRequest {
  seriesid: string[];
  startyear?: string;
  endyear?: string;
  catalog?: boolean;
  calculations?: boolean;
  annualaverage?: boolean;
  registrationkey?: string;
}

export interface BlsSeriesInfo {
  seriesID: string;
  title: string;
  catalog?: {
    series_title?: string;
    series_id?: string;
    seasonally_adjusted?: string;
    survey_name?: string;
    measure_data_type?: string;
    commerce_industry?: string;
    data_type?: string;
    sector?: string;
    text?: string;
  };
}

// Standard BLS data format after processing
export interface ProcessedBlsData {
  seriesId: string;
  title: string;
  date: string;
  value: number;
  period: string;
  periodName: string;
  footnotes?: string[];
}