import React, { useState } from 'react';
import { CalendarDays, ChevronDown } from 'lucide-react';
import { format } from 'date-fns';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { useDateRange } from '../contexts/DateRangeContext';
import { getDateRange } from '../utils/date';

const PRESET_RANGES = [
  { label: 'Last 7 Days', days: 7 },
  { label: 'Last 30 Days', days: 30 },
  { label: 'Last 90 Days', days: 90 },
];

export function DateRangeSelector() {
  const { startDate, endDate, setDateRange } = useDateRange();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <div className="flex items-center space-x-4">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center bg-white rounded-md shadow-sm border border-gray-300 px-3 py-2 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
          <CalendarDays className="h-5 w-5 text-gray-400 mr-2" />
          <span className="text-sm text-gray-600">
            {format(startDate, 'MMM d, yyyy')} - {format(endDate, 'MMM d, yyyy')}
          </span>
          <ChevronDown className="h-4 w-4 text-gray-400 ml-2" />
        </button>

        <div className="flex space-x-2">
          {PRESET_RANGES.map(({ label, days }) => (
            <button
              key={label}
              className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              onClick={() => {
                const { start, end } = getDateRange(days);
                setDateRange(start, end);
                setIsOpen(false);
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 p-4 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          <div className="flex gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <DatePicker
                selected={startDate}
                onChange={(date) => date && setDateRange(date, endDate)}
                selectsStart
                startDate={startDate}
                endDate={endDate}
                maxDate={endDate}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                dateFormat="MMM d, yyyy"
                inline
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date
              </label>
              <DatePicker
                selected={endDate}
                onChange={(date) => date && setDateRange(startDate, date)}
                selectsEnd
                startDate={startDate}
                endDate={endDate}
                minDate={startDate}
                maxDate={new Date()}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                dateFormat="MMM d, yyyy"
                inline
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}