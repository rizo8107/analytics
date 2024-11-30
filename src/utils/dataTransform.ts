import { MarketingData, KPIMetrics } from '../types/api';
import { format, parseISO } from 'date-fns';

export interface Metrics {
  impressions: number;
  clicks: number;
  spend: number;
  conversions: number;
  trend: number;
}

export const aggregateDataByDate = (data: MarketingData[]): MarketingData[] => {
  const aggregatedData = new Map<string, MarketingData>();

  data.forEach((item) => {
    const date = item.date;
    if (aggregatedData.has(date)) {
      const existing = aggregatedData.get(date)!;
      aggregatedData.set(date, {
        date,
        impressions: existing.impressions + item.impressions,
        clicks: existing.clicks + item.clicks,
        spend: existing.spend + item.spend,
        conversions: existing.conversions + item.conversions,
        platform: 'combined'
      });
    } else {
      aggregatedData.set(date, { ...item });
    }
  });

  return Array.from(aggregatedData.values())
    .sort((a, b) => format(parseISO(a.date), 'yyyyMMdd') - format(parseISO(b.date), 'yyyyMMdd'));
};

export const calculateMetrics = (data: MarketingData[]): KPIMetrics => {
  const totals = data.reduce((acc, curr) => {
    return {
      impressions: acc.impressions + (curr.impressions || 0),
      clicks: acc.clicks + (curr.clicks || 0),
      spend: acc.spend + (curr.spend || 0),
      conversions: acc.conversions + (curr.conversions || 0),
      revenue: acc.revenue + (curr.revenue || 0)
    };
  }, {
    impressions: 0,
    clicks: 0,
    spend: 0,
    conversions: 0,
    revenue: 0
  });

  // Calculate derived metrics using Facebook's exact formulas
  const metrics: KPIMetrics = {
    impressions: totals.impressions,
    clicks: totals.clicks,
    spend: totals.spend,
    conversions: totals.conversions,
    revenue: totals.revenue,
    // CTR = (clicks / impressions) * 100
    ctr: totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0,
    // CPC = spend / clicks
    cpc: totals.clicks > 0 ? totals.spend / totals.clicks : 0,
    // CPM = (spend / impressions) * 1000
    cpm: totals.impressions > 0 ? (totals.spend / totals.impressions) * 1000 : 0,
    // Cost per conversion = spend / conversions
    costPerConversion: totals.conversions > 0 ? totals.spend / totals.conversions : 0,
    // ROAS = (revenue / spend) * 100 (as percentage)
    roas: totals.spend > 0 ? (totals.revenue / totals.spend) * 100 : 0
  };

  return metrics;
};

export const formatMetricValue = (value: number, metric: keyof KPIMetrics): string => {
  if (typeof value !== 'number' || isNaN(value)) return '0';

  switch (metric) {
    case 'impressions':
    case 'clicks':
    case 'conversions':
      return Math.round(value).toLocaleString();
    case 'spend':
    case 'revenue':
    case 'cpc':
    case 'cpm':
    case 'costPerConversion':
      return value.toLocaleString('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
    case 'ctr':
    case 'roas':
      return value.toFixed(2) + '%';
    default:
      return value.toString();
  }
};

export const getMetricPrefix = (metric: keyof KPIMetrics): string => {
  switch (metric) {
    case 'spend':
    case 'revenue':
    case 'cpc':
    case 'cpm':
    case 'costPerConversion':
      return '₹';
    default:
      return '';
  }
};

export const getMetricSuffix = (metric: keyof KPIMetrics): string => {
  switch (metric) {
    case 'ctr':
    case 'roas':
      return '%';
    default:
      return '';
  }
};

export const calculateTrend = (current: number, previous: number): number => {
  if (previous === 0) return 0;
  return ((current - previous) / previous) * 100;
};

export const formatTrendValue = (value: number): string => {
  if (isNaN(value) || !isFinite(value)) return '0%';
  return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
};

export const getMetricColor = (metric: keyof KPIMetrics, value: number): string => {
  switch (metric) {
    case 'ctr':
      return value >= 1 ? 'text-green-500' : 'text-red-500';
    case 'roas':
      return value >= 100 ? 'text-green-500' : 'text-red-500';
    case 'costPerConversion':
      return value <= 50 ? 'text-green-500' : 'text-red-500';
    default:
      return value >= 0 ? 'text-green-500' : 'text-red-500';
  }
};

export const calculatePlatformDistribution = (data: MarketingData[]) => {
  if (!data?.length) {
    return [{
      platform: 'facebook',
      value: 0,
      color: '#4318FF'
    }];
  }

  const platforms = new Map<string, { spend: number; color: string }>();
  
  // Define colors for each platform
  const platformColors: Record<string, string> = {
    facebook: '#4318FF',
    instagram: '#E44D26',
    google: '#34A853',
    linkedin: '#0077B5'
  };

  // Aggregate spend by platform
  data.forEach(item => {
    if (!item?.platform) return;
    
    const platform = item.platform.toLowerCase();
    const current = platforms.get(platform) || { 
      spend: 0, 
      color: platformColors[platform] || '#808080' 
    };
    
    platforms.set(platform, {
      ...current,
      spend: current.spend + (item.spend || 0)
    });
  });

  // Convert to array format needed for chart
  return Array.from(platforms.entries()).map(([platform, data]) => ({
    platform,
    value: data.spend,
    color: data.color
  }));
};
