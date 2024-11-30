import React, { createContext, useContext, useState } from 'react';
import { subDays, startOfDay, endOfDay } from 'date-fns';

interface DateRangeContextType {
  startDate: Date;
  endDate: Date;
  setDateRange: (start: Date, end: Date) => void;
}

const DateRangeContext = createContext<DateRangeContextType | undefined>(undefined);

export function DateRangeProvider({ children }: { children: React.ReactNode }) {
  const [startDate, setStartDate] = useState(() => startOfDay(subDays(new Date(), 29)));
  const [endDate, setEndDate] = useState(() => endOfDay(new Date()));

  const setDateRange = (start: Date, end: Date) => {
    setStartDate(startOfDay(start));
    setEndDate(endOfDay(end));
  };

  return (
    <DateRangeContext.Provider value={{ startDate, endDate, setDateRange }}>
      {children}
    </DateRangeContext.Provider>
  );
}

export function useDateRange() {
  const context = useContext(DateRangeContext);
  if (context === undefined) {
    throw new Error('useDateRange must be used within a DateRangeProvider');
  }
  return context;
}