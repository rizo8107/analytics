import { useMemo } from 'react';
import { useDateRange } from '../contexts/DateRangeContext';
import { filterDataByDateRange } from '../utils/date';
import type { TrendData } from '../types/dashboard';

export function useFilteredData(data: TrendData[]) {
  const { startDate, endDate } = useDateRange();

  return useMemo(
    () => filterDataByDateRange(data, startDate, endDate),
    [data, startDate, endDate]
  );
}