export interface Sample {
  id: number;
  sample_id: string;
  date: string | null;
  city: string | null;
  state: string | null;
  assumed_substance: string | null;
  fentanyl: number;
  heroin: number;
  xylazine: number;
  medetomidine: number;
  acetaminophen: number;
  has_other: number;
  num_other: number;
  total_substances: number;
  appearance: string | null;
  method: string | null;
  spectra_url: string | null;
}

export interface DetectedSubstance {
  substance: string;
  abundance: string | null;
  peak: number | null;
}

export interface SampleDetail extends Sample {
  substances: DetectedSubstance[];
}

export interface ChartSpec {
  type: 'line' | 'bar' | 'heatmap';
  title: string;
  data: Record<string, unknown>[];
  xKey: string;
  yKeys: string[];
  labels?: Record<string, string>;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  chartSpecs?: ChartSpec[];
  sql?: string[];
}

export interface StatsResponse {
  totalSamples: number;
  fentanylPercent: number;
  topSubstances: { name: string; count: number }[];
  stateCount: number;
  cityCount: number;
  dateRange: { min: string; max: string };
  recentSamples: number;
}

export interface SubstanceInfo {
  substance: string;
  description: string | null;
  frequency_pct: number;
  sample_count: number;
  total_samples: number;
  co_occurrences: { substance: string; count: number }[];
}

export interface CityInfo {
  city: string;
  sample_count: number;
  top_substances: { substance: string; count: number }[];
  fentanyl_pct: number;
  overall_fentanyl_pct: number;
}

export interface SamplesResponse {
  samples: Sample[];
  total: number;
  page: number;
  pages: number;
}
