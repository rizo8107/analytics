import React from 'react';
import { TrendingUp } from 'lucide-react';
import { useDateRange } from '../contexts/DateRangeContext';
import { format } from 'date-fns';

export function ExportButton() {
  const { startDate, endDate } = useDateRange();

  const handleExport = () => {
    const filename = `marketing-report-${format(startDate, 'yyyy-MM-dd')}-to-${format(
      endDate,
      'yyyy-MM-dd'
    )}.csv`;
    
    // In a real application, this would trigger an API call to generate
    // and download the report for the selected date range
    console.log(`Exporting report: ${filename}`);
  };

  return (
    <button
      onClick={handleExport}
      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
    >
      <TrendingUp className="h-4 w-4 mr-2" />
      Export Report
    </button>
  );
}