export interface EconomicIndicator {
  id: string;
  name: string;
  description: string;
  category: string;
  frequency: string;
  unit: string | null;
  source: string;
  latestValue: number | null;
  latestDate: string | null;
  isFavorite?: boolean;
}

export interface IndicatorData {
  date: string;
  value: number;
}

export interface DetailedIndicator extends EconomicIndicator {
  data: IndicatorData[];
}