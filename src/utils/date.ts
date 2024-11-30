import { subDays, startOfDay, endOfDay, parseISO } from 'date-fns';

export function getDateRange(days: number): { start: Date; end: Date } {
  const end = endOfDay(new Date());
  const start = startOfDay(subDays(end, days - 1));
  return { start, end };
}

export function filterDataByDateRange<T extends { date: string }>(
  data: T[],
  startDate: Date,
  endDate: Date
): T[] {
  return data.filter((item) => {
    const itemDate = parseISO(item.date);
    const start = startOfDay(startDate);
    const end = endOfDay(endDate);
    return itemDate >= start && itemDate <= end;
  });
}