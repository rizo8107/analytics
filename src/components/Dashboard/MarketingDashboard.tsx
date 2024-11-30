import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { MarketingData, DateRange } from '../../types/api';

interface DashboardProps {
  data: MarketingData[];
}

export const MarketingDashboard: React.FC<DashboardProps> = ({ data }) => {
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: new Date(new Date().setDate(new Date().getDate() - 30)),
    endDate: new Date(),
  });

  const filteredData = data.filter((item) => {
    const itemDate = new Date(item.date);
    return itemDate >= dateRange.startDate && itemDate <= dateRange.endDate;
  });

  return (
    <div className="p-6 bg-white rounded-lg shadow-sm">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold">Marketing Performance</h2>
        <div className="flex gap-4">
          <DatePicker
            selected={dateRange.startDate}
            onChange={(date) => date && setDateRange({ ...dateRange, startDate: date })}
            className="px-3 py-2 border border-gray-300 rounded-md"
            dateFormat="yyyy-MM-dd"
          />
          <DatePicker
            selected={dateRange.endDate}
            onChange={(date) => date && setDateRange({ ...dateRange, endDate: date })}
            className="px-3 py-2 border border-gray-300 rounded-md"
            dateFormat="yyyy-MM-dd"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Impressions Chart */}
        <div className="h-[400px]">
          <h3 className="text-lg font-medium mb-4">Impressions Over Time</h3>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={filteredData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="impressions"
                stroke="#8884d8"
                name="Impressions"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Clicks Chart */}
        <div className="h-[400px]">
          <h3 className="text-lg font-medium mb-4">Clicks Over Time</h3>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={filteredData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="clicks"
                stroke="#82ca9d"
                name="Clicks"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Spend Chart */}
        <div className="h-[400px]">
          <h3 className="text-lg font-medium mb-4">Spend Over Time</h3>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={filteredData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="spend"
                stroke="#ffc658"
                name="Spend"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Conversions Chart */}
        <div className="h-[400px]">
          <h3 className="text-lg font-medium mb-4">Conversions Over Time</h3>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={filteredData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="conversions"
                stroke="#ff7300"
                name="Conversions"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
