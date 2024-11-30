export interface MetricCard {
  title: string;
  value: number;
  change: number;
  format: 'number' | 'currency' | 'percentage';
}

export interface Campaign {
  id: string;
  name: string;
  platform: 'facebook' | 'google';
  impressions: number;
  clicks: number;
  spend: number;
  conversions: number;
  ctr: number;
  cpc: number;
}

export interface TrendData {
  date: string;
  impressions: number;
  clicks: number;
  conversions: number;
}