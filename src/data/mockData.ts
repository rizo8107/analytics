import { addDays, format } from 'date-fns';
import type { Campaign, MetricCard, TrendData } from '../types/dashboard';

export const metricCards: MetricCard[] = [
  { title: 'Total Spend', value: 15234.56, change: 12.3, format: 'currency' },
  { title: 'Impressions', value: 1234567, change: -5.2, format: 'number' },
  { title: 'Clicks', value: 45678, change: 8.7, format: 'number' },
  { title: 'Conversion Rate', value: 2.34, change: 0.5, format: 'percentage' },
];

export const campaigns: Campaign[] = [
  {
    id: '1',
    name: 'Summer Sale 2024',
    platform: 'facebook',
    impressions: 523456,
    clicks: 12345,
    spend: 4567.89,
    conversions: 234,
    ctr: 2.36,
    cpc: 0.37,
  },
  {
    id: '2',
    name: 'Product Launch',
    platform: 'google',
    impressions: 345678,
    clicks: 8901,
    spend: 3456.78,
    conversions: 167,
    ctr: 2.58,
    cpc: 0.39,
  },
  {
    id: '3',
    name: 'Brand Awareness',
    platform: 'facebook',
    impressions: 234567,
    clicks: 6789,
    spend: 2345.67,
    conversions: 123,
    ctr: 2.89,
    cpc: 0.35,
  },
  {
    id: '4',
    name: 'Retargeting',
    platform: 'google',
    impressions: 123456,
    clicks: 4567,
    spend: 1234.56,
    conversions: 89,
    ctr: 3.70,
    cpc: 0.27,
  },
];

export const generateTrendData = (): TrendData[] => {
  const data: TrendData[] = [];
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);

  for (let i = 0; i < 30; i++) {
    const currentDate = addDays(startDate, i);
    data.push({
      date: format(currentDate, 'yyyy-MM-dd'),
      impressions: Math.floor(Math.random() * 50000) + 30000,
      clicks: Math.floor(Math.random() * 2000) + 1000,
      conversions: Math.floor(Math.random() * 100) + 50,
    });
  }

  return data;
}