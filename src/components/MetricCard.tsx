import React from 'react';
import { ArrowDownIcon, ArrowUpIcon } from 'lucide-react';
import { formatMetricValue } from '../utils/formatters';
import type { MetricCard as MetricCardType } from '../types/dashboard';

export function MetricCard({ title, value, change, format }: MetricCardType) {
  const isPositive = change >= 0;

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-sm font-medium text-gray-500">{title}</h3>
      <div className="mt-2 flex items-baseline">
        <p className="text-2xl font-semibold text-gray-900">
          {formatMetricValue(value, format)}
        </p>
        <span
          className={`ml-2 flex items-center text-sm font-medium ${
            isPositive ? 'text-green-600' : 'text-red-600'
          }`}
        >
          {isPositive ? (
            <ArrowUpIcon className="h-4 w-4 mr-1" />
          ) : (
            <ArrowDownIcon className="h-4 w-4 mr-1" />
          )}
          {Math.abs(change)}%
        </span>
      </div>
    </div>
  );
}