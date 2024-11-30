export interface ApiKeys {
  facebookToken: string;
  googleAdsToken: string;
}

export interface MarketingData {
  date: string;
  campaign_id: string;
  campaign_name: string;
  platform: 'facebook' | 'google';
  status: string;
  impressions: number;
  clicks: number;
  spend: number;
  cpc: number;
  cpm: number;
  ctr: number;
  total_clicks: number;
  total_ctr: number;
  conversions: number;
  revenue: number;
  roas: number;
  objective: string;
  platform_breakdown?: {
    device: string;
    publisher: string;
  };
}

export interface MetricRange {
  min?: number;
  max?: number;
}

export interface MetricFilters {
  impressions?: MetricRange;
  clicks?: MetricRange;
  spend?: MetricRange;
  cpc?: MetricRange;
  cpm?: MetricRange;
  ctr?: MetricRange;
  conversions?: MetricRange;
  revenue?: MetricRange;
  roas?: MetricRange;
}

export interface AdAccount {
  id: string;
  name: string;
  status: string;
  currency: string;
  timezone: string;
}

export interface Campaign {
  id: string;
  account_id: string;
  name: string;
  status: string;
  objective: string;
  daily_budget: number;
  lifetime_budget?: number;
  start_time: string;
  stop_time?: string;
  insights?: {
    impressions: number;
    clicks: number;
    spend: number;
    ctr: number;
    cpc: number;
  };
}

export interface AdSet {
  id: string;
  name: string;
  campaignId: string;
  status: string;
  dailyBudget?: number;
  lifetimeBudget?: number;
  bidAmount?: number;
  billingEvent?: string;
  optimizationGoal?: string;
}

export interface Ad {
  id: string;
  name: string;
  status: string;
  campaignId: string;
  adSetId: string;
  creativeId?: string;
  creativeName?: string;
  thumbnailUrl?: string;
}

export interface KPIMetrics {
  impressions: number;
  clicks: number;
  ctr: number;
  conversions: number;
  cpc: number;
  costPerConversion: number;
  roas: number;
  spend: number;
  revenue: number;
}

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

export interface MetricCardData {
  value: string;
  label: string;
  trend: number;
  color: string;
  prefix?: string;
  suffix?: string;
}

export interface RegionData {
  region: string;
  value: number;
}

export interface PlatformData {
  platform: string;
  value: number;
  color: string;
}

export interface FilterOptions {
  accounts?: string[];
  campaigns?: string[];
  adSets?: string[];
  ads?: string[];
  dateRange?: {
    startDate: Date;
    endDate: Date;
  };
  status?: string[];
  metrics?: {
    [key: string]: {
      min?: number;
      max?: number;
    };
  };
}
