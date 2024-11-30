import React, { useState, useEffect } from 'react';
import PocketBase from 'pocketbase';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  ComposedChart,
  Line
} from 'recharts';
import { format, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { motion } from 'framer-motion';

interface PaymentData {
  amount: string | number;
  collectionId: string;
  collectionName: string;
  contact: string | number;
  created_at: string;
  currency: string;
  description: string;
  email: string;
  id: string;
  notes: string;
  status: string;
}

interface PaymentMetrics {
  totalAmount: { [key: string]: number };
  successRate: number;
  transactionCount: number;
  methodDistribution: { name: string; value: number }[];
  statusDistribution: { name: string; value: number }[];
  courseDistribution: { name: string; value: number; currency: string; count: number }[];
  timeDistribution: {
    date: string;
    amount: number;
    count: number;
    status: { [key: string]: number };
  }[];
}

interface MetricConfig {
  id: string;
  title: string;
  enabled: boolean;
  type: 'card' | 'chart';
  description: string;
}

const COLORS = {
  success: '#10B981',
  failed: '#EF4444',
  pending: '#F59E0B',
  chart: ['#6366F1', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'],
  background: '#F3F4F6'
};

const CURRENCY_SYMBOLS: { [key: string]: string } = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  INR: '₹',
};

const formatCurrency = (amount: number, currency: string): string => {
  const symbol = CURRENCY_SYMBOLS[currency] || currency;
  return `${symbol}${amount.toLocaleString()}`;
};

const isValidAmount = (amount: string | number): boolean => {
  if (typeof amount === 'number') return !isNaN(amount);
  return !isNaN(parseFloat(amount));
};

const parseAmount = (amount: string | number): number => {
  if (typeof amount === 'number') return amount;
  return parseFloat(amount) || 0;
};

const isValidCurrency = (currency: string): boolean => {
  // Add more currency codes as needed
  const validCurrencies = ['USD', 'EUR', 'GBP', 'INR', 'AUD', 'CAD'];
  return validCurrencies.includes(currency.toUpperCase());
};

const standardizeStatus = (status: string): string => {
  const statusLower = status.toLowerCase().trim();
  if (statusLower.includes('captured') || statusLower === 'success') return 'Captured';
  if (statusLower === 'failed' || statusLower.includes('fail')) return 'Failed';
  if (statusLower.includes('pend')) return 'Pending';
  return 'Other';
};

const MetricCard: React.FC<{
  title: string;
  value: string;
  subtitle: string;
  trend?: number;
  icon?: React.ReactNode;
}> = ({ title, value, subtitle, trend, icon }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl shadow-sm p-6"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {icon}
          <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
        </div>
      </div>
      <div className="mt-4">
        <p className="text-3xl font-bold text-gray-900">
          {value || '0'}
        </p>
        <p className="text-sm text-gray-500 mt-2">{subtitle}</p>
        {trend !== undefined && (
          <div className="flex items-center mt-4">
            <span className={`text-sm font-medium ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {trend >= 0 ? '+' : ''}{trend}%
            </span>
            <span className="text-sm text-gray-500 ml-2">vs last period</span>
          </div>
        )}
      </div>
    </motion.div>
  );
};

const PAYMENT_STATUSES = ['All', 'Captured', 'Failed', 'Pending'] as const;
type PaymentStatus = typeof PAYMENT_STATUSES[number];

const PaymentAnalytics: React.FC = () => {
  const [payments, setPayments] = useState<PaymentData[]>([]);
  const [filteredPayments, setFilteredPayments] = useState<PaymentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [showMetricsFilter, setShowMetricsFilter] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<PaymentStatus>('All');
  const [metrics, setMetrics] = useState<PaymentMetrics>({
    totalAmount: {},
    successRate: 0,
    transactionCount: 0,
    methodDistribution: [],
    statusDistribution: [],
    courseDistribution: [],
    timeDistribution: []
  });
  
  const [metricConfigs, setMetricConfigs] = useState<MetricConfig[]>([
    { 
      id: 'revenue', 
      title: 'Captured Revenue', 
      enabled: true, 
      type: 'card',
      description: 'Total revenue from captured payments'
    },
    { 
      id: 'successRate', 
      title: 'Capture Rate', 
      enabled: true, 
      type: 'card',
      description: 'Percentage of captured payments'
    },
    { 
      id: 'failedPayments', 
      title: 'Failed Payments', 
      enabled: true, 
      type: 'card',
      description: 'Number of failed transactions'
    },
    { 
      id: 'courseRevenue', 
      title: 'Course Revenue', 
      enabled: true, 
      type: 'chart',
      description: 'Top courses by captured revenue'
    },
    { 
      id: 'paymentStatus', 
      title: 'Payment Status', 
      enabled: true, 
      type: 'chart',
      description: 'Distribution of payment statuses'
    },
    { 
      id: 'timeAnalytics', 
      title: 'Payment Trends', 
      enabled: true, 
      type: 'chart',
      description: 'Payment trends over time'
    }
  ]);

  useEffect(() => {
    let isSubscribed = true;

    const fetchPayments = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const pbInstance = new PocketBase('https://app-pocketbase.9krcxo.easypanel.host');
        const records = await pbInstance.collection('payment_data').getFullList({
          sort: '-created_at',
        });

        if (isSubscribed) {
          setPayments(records);
          setFilteredPayments(records);
          calculateMetrics(records);
        }
      } catch (err) {
        if (isSubscribed) {
          console.error('Error fetching payments:', err);
          setError(err instanceof Error ? err.message : 'Failed to fetch payment data');
        }
      } finally {
        if (isSubscribed) {
          setLoading(false);
        }
      }
    };

    fetchPayments();

    return () => {
      isSubscribed = false;
    };
  }, []);

  useEffect(() => {
    const filterPayments = () => {
      let filtered = [...payments];

      if (startDate && endDate) {
        filtered = filtered.filter(payment => {
          const paymentDate = new Date(payment.created_at);
          return paymentDate >= startDate && paymentDate <= endDate;
        });
      }

      // Apply status filter
      if (selectedStatus !== 'All') {
        filtered = filtered.filter(payment => {
          const paymentStatus = standardizeStatus(payment.status);
          return paymentStatus === selectedStatus;
        });
      }

      setFilteredPayments(filtered);
      const newMetrics = calculateMetrics(filtered);
      setMetrics(newMetrics);

      // Log for debugging
      console.log('Filtered Payments:', {
        total: filtered.length,
        status: selectedStatus,
        statusCounts: newMetrics.statusDistribution
      });
    };

    filterPayments();
  }, [payments, startDate, endDate, selectedStatus]);

  const calculateMetrics = (payments: PaymentData[]) => {
    const totalAmount: { [key: string]: number } = {};
    const statusCounts: { [key: string]: number } = {};
    const courseCounts: { [key: string]: { amount: number; currency: string; count: number } } = {};
    const timeData: { [key: string]: { amount: number; count: number; status: { [key: string]: number } } } = {};

    // Initialize default currencies with 0
    totalAmount['USD'] = 0;

    // Sort payments by date
    const sortedPayments = [...payments].sort((a, b) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    sortedPayments.forEach(payment => {
      // Standardize and count status
      const standardizedStatus = standardizeStatus(payment.status);
      statusCounts[standardizedStatus] = (statusCounts[standardizedStatus] || 0) + 1;

      // Process date for time distribution
      const date = new Date(payment.created_at);
      const dateKey = format(date, 'yyyy-MM-dd');

      if (!timeData[dateKey]) {
        timeData[dateKey] = {
          amount: 0,
          count: 0,
          status: {}
        };
      }

      // Update time-based metrics
      if (isValidAmount(payment.amount)) {
        const amount = parseAmount(payment.amount);
        // Include amount in time data based on current status filter
        timeData[dateKey].amount += amount;
      }
      timeData[dateKey].count += 1;
      timeData[dateKey].status[standardizedStatus] = (timeData[dateKey].status[standardizedStatus] || 0) + 1;

      // Process amount and course data for all payments
      if (isValidAmount(payment.amount)) {
        const amount = parseAmount(payment.amount);
        const currency = isValidCurrency(payment.currency) ? payment.currency.toUpperCase() : 'USD';
        
        // Update total amount based on status
        if (standardizedStatus === 'Captured') {
          totalAmount[currency] = (totalAmount[currency] || 0) + amount;
        }

        // Process course data if description exists
        if (payment.description && payment.description !== 'test') {
          const courseName = payment.description.length > 30 
            ? payment.description.substring(0, 30) + '...' 
            : payment.description;

          if (!courseCounts[courseName]) {
            courseCounts[courseName] = { amount: 0, currency, count: 0 };
          }
          courseCounts[courseName].amount += amount;
          courseCounts[courseName].count += 1;
        }
      }
    });

    // Calculate capture rate based on filtered data
    const totalCount = payments.length;
    const capturedCount = statusCounts['Captured'] || 0;
    const successRate = totalCount > 0 ? Math.round((capturedCount / totalCount) * 100) : 0;

    // Format course distribution data
    const courseDistribution = Object.entries(courseCounts)
      .map(([name, { amount, currency, count }]) => ({
        name,
        value: Number(amount.toFixed(2)),
        count,
        currency
      }))
      .filter(item => item.value > 0 || item.count > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    // Format status distribution data
    const statusDistribution = Object.entries(statusCounts)
      .map(([name, value]) => ({
        name,
        value
      }))
      .sort((a, b) => b.value - a.value);

    // Convert timeData to array and sort by date
    const timeDistribution = Object.entries(timeData)
      .map(([date, data]) => ({
        date,
        amount: Number(data.amount.toFixed(2)),
        count: data.count,
        status: data.status
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      totalAmount,
      successRate,
      transactionCount: totalCount,
      methodDistribution: [],
      statusDistribution,
      courseDistribution,
      timeDistribution
    };
  };

  if (loading) {
    return <div className="p-4">Loading payment analytics...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-500">{error}</div>;
  }

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-gray-800">Payment Analytics</h1>
        <div className="flex items-center gap-4">
          <div className="relative">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as PaymentStatus)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {PAYMENT_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status} Payments
                </option>
              ))}
            </select>
          </div>
          <div className="text-sm text-gray-500">
            Last updated: {format(new Date(), 'MMM d, yyyy HH:mm')}
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowMetricsFilter(!showMetricsFilter)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              Customize Metrics
            </button>
            {showMetricsFilter && (
              <div className="absolute right-0 mt-2 w-72 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                <div className="p-4">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-sm font-medium text-gray-900">Show/Hide Metrics</h3>
                    <button
                      onClick={() => setShowMetricsFilter(false)}
                      className="text-gray-400 hover:text-gray-500"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="space-y-3">
                    {metricConfigs.map((config) => (
                      <div key={config.id} className="flex items-start">
                        <div className="flex items-center h-5">
                          <input
                            type="checkbox"
                            checked={config.enabled}
                            onChange={() => {
                              setMetricConfigs(configs =>
                                configs.map(c =>
                                  c.id === config.id ? { ...c, enabled: !c.enabled } : c
                                )
                              );
                            }}
                            className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                          />
                        </div>
                        <div className="ml-3">
                          <label className="text-sm font-medium text-gray-700">
                            {config.title}
                          </label>
                          <p className="text-xs text-gray-500">{config.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Date Range Picker */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <div className="flex flex-wrap gap-6 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
            <DatePicker
              selected={startDate}
              onChange={(date: Date) => setStartDate(date)}
              selectsStart
              startDate={startDate}
              endDate={endDate}
              maxDate={endDate || new Date()}
              className="border border-gray-300 rounded-lg p-2.5 w-44 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholderText="Select start date"
              dateFormat="yyyy-MM-dd"
              showTimeSelect={false}
              isClearable
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
            <DatePicker
              selected={endDate}
              onChange={(date: Date) => setEndDate(date)}
              selectsEnd
              startDate={startDate}
              endDate={endDate}
              minDate={startDate}
              maxDate={new Date()}
              className="border border-gray-300 rounded-lg p-2.5 w-44 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholderText="Select end date"
              dateFormat="yyyy-MM-dd"
              showTimeSelect={false}
              isClearable
            />
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">
              {filteredPayments.length} of {payments.length} transactions
            </span>
            {(startDate || endDate) && (
              <button
                onClick={() => {
                  setStartDate(null);
                  setEndDate(null);
                }}
                className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                Clear Dates
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {metricConfigs.filter(c => c.type === 'card' && c.enabled).map(config => {
          switch (config.id) {
            case 'revenue':
              return (
                <MetricCard
                  key={config.id}
                  title="Captured Revenue"
                  value={Object.entries(metrics.totalAmount)
                    .map(([currency, amount]) => formatCurrency(amount, currency))
                    .join(' + ')}
                  subtitle={`From ${metrics.statusDistribution.find(s => s.name === 'Captured')?.value || 0} captured transactions`}
                  trend={12}
                  icon={<span className="text-2xl">💰</span>}
                />
              );
            case 'successRate':
              return (
                <MetricCard
                  key={config.id}
                  title="Capture Rate"
                  value={`${metrics.successRate}%`}
                  subtitle={`${metrics.statusDistribution.find(s => s.name === 'Captured')?.value || 0} captured payments`}
                  trend={5}
                  icon={<span className="text-2xl">📈</span>}
                />
              );
            case 'failedPayments':
              return (
                <MetricCard
                  key={config.id}
                  title="Failed Payments"
                  value={`${metrics.statusDistribution.find(s => s.name === 'Failed')?.value || 0}`}
                  subtitle="Total failed transactions"
                  trend={-2}
                  icon={<span className="text-2xl">⚠️</span>}
                />
              );
            default:
              return null;
          }
        })}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6 mt-6">
        {/* Time Analytics Chart */}
        {metricConfigs.find(c => c.id === 'timeAnalytics')?.enabled && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-sm p-6"
          >
            <h3 className="text-lg font-semibold text-gray-800 mb-6">
              {selectedStatus === 'Failed' ? 'Failed Payment Trends' : 'Payment Trends'}
            </h3>
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={metrics.timeDistribution}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fill: '#4B5563', fontSize: 12 }}
                    tickFormatter={(value) => format(new Date(value), 'MMM d')}
                  />
                  <YAxis 
                    yAxisId="amount"
                    orientation="left"
                    tick={{ fill: '#4B5563', fontSize: 12 }}
                    tickFormatter={(value) => formatCurrency(value, 'USD')}
                  />
                  <YAxis 
                    yAxisId="count"
                    orientation="right"
                    tick={{ fill: '#4B5563', fontSize: 12 }}
                  />
                  <Tooltip
                    contentStyle={{ 
                      backgroundColor: '#FFF',
                      border: '1px solid #E5E7EB',
                      borderRadius: '8px',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                    }}
                    formatter={(value: number, name: string) => {
                      if (name === 'Amount') return [formatCurrency(value, 'USD'), name];
                      if (name === 'Count') return [value, 'Transactions'];
                      return [value, name];
                    }}
                    labelFormatter={(label) => format(new Date(label), 'MMM d, yyyy')}
                  />
                  <Legend />
                  <Bar 
                    yAxisId="count"
                    dataKey="count"
                    name="Count"
                    fill={selectedStatus === 'Failed' ? COLORS.failed : '#6366F1'}
                    radius={[4, 4, 0, 0]}
                    opacity={0.7}
                  />
                  <Line
                    yAxisId="amount"
                    type="monotone"
                    dataKey="amount"
                    name="Amount"
                    stroke={selectedStatus === 'Failed' ? COLORS.failed : '#10B981'}
                    strokeWidth={2}
                    dot={{ fill: selectedStatus === 'Failed' ? COLORS.failed : '#10B981', r: 4 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-3 gap-4 mt-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-500">Average Daily Revenue</h4>
                <p className="text-xl font-semibold mt-1">
                  {formatCurrency(
                    metrics.timeDistribution.reduce((acc, curr) => acc + curr.amount, 0) / 
                    Math.max(metrics.timeDistribution.length, 1),
                    'USD'
                  )}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-500">Average Daily Transactions</h4>
                <p className="text-xl font-semibold mt-1">
                  {Math.round(
                    metrics.timeDistribution.reduce((acc, curr) => acc + curr.count, 0) / 
                    Math.max(metrics.timeDistribution.length, 1)
                  )}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-500">Most Active Day</h4>
                <p className="text-xl font-semibold mt-1">
                  {metrics.timeDistribution.length > 0 
                    ? format(
                        new Date(
                          metrics.timeDistribution.reduce((max, curr) => 
                            curr.count > max.count ? curr : max
                          ).date
                        ),
                        'MMM d'
                      )
                    : 'N/A'
                  }
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Course Revenue Chart */}
        {metricConfigs.find(c => c.id === 'courseRevenue')?.enabled && (
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white rounded-xl shadow-sm p-6"
          >
            <h3 className="text-lg font-semibold text-gray-800 mb-6">
              {selectedStatus === 'Failed' ? 'Failed Payments by Course' : 'Course Revenue'}
            </h3>
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metrics.courseDistribution} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis type="number" />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    width={150}
                    tick={{ fill: '#4B5563', fontSize: 12 }}
                  />
                  <Tooltip
                    contentStyle={{ 
                      backgroundColor: '#FFF',
                      border: '1px solid #E5E7EB',
                      borderRadius: '8px',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                      padding: '8px 12px'
                    }}
                    formatter={(value: number, name: string, props: any) => {
                      const payload = props.payload;
                      return [
                        <div key="tooltip" className="space-y-1">
                          <div className="font-medium">
                            {selectedStatus === 'Failed' 
                              ? `${payload.count} Failed Transactions`
                              : formatCurrency(value, payload.currency)
                            }
                          </div>
                          <div className="text-sm text-gray-500">
                            {selectedStatus === 'Failed'
                              ? `Total Amount: ${formatCurrency(payload.value, payload.currency)}`
                              : `Transaction Count: ${payload.count}`
                            }
                          </div>
                        </div>,
                        ''
                      ];
                    }}
                  />
                  <Bar 
                    dataKey={selectedStatus === 'Failed' ? 'count' : 'value'}
                    fill={selectedStatus === 'Failed' ? COLORS.failed : '#6366F1'}
                    radius={[0, 4, 4, 0]}
                  >
                    {metrics.courseDistribution.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={selectedStatus === 'Failed' ? COLORS.failed : COLORS.chart[index % COLORS.chart.length]} 
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        )}

        {/* Payment Status Chart */}
        {metricConfigs.find(c => c.id === 'paymentStatus')?.enabled && (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white rounded-xl shadow-sm p-6"
          >
            <h3 className="text-lg font-semibold text-gray-800 mb-6">Payment Status</h3>
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={metrics.statusDistribution}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={150}
                    innerRadius={80}
                    label={({
                      cx,
                      cy,
                      midAngle,
                      innerRadius,
                      outerRadius,
                      value,
                      index
                    }) => {
                      const RADIAN = Math.PI / 180;
                      const radius = 25 + innerRadius + (outerRadius - innerRadius);
                      const x = cx + radius * Math.cos(-midAngle * RADIAN);
                      const y = cy + radius * Math.sin(-midAngle * RADIAN);

                      return (
                        <text
                          x={x}
                          y={y}
                          fill="#4B5563"
                          textAnchor={x > cx ? 'start' : 'end'}
                          dominantBaseline="central"
                        >
                          {`${metrics.statusDistribution[index].name} (${value})`}
                        </text>
                      );
                    }}
                  >
                    {metrics.statusDistribution.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={
                          entry.name === 'Captured' 
                            ? COLORS.success 
                            : entry.name === 'Failed' 
                              ? COLORS.failed 
                              : COLORS.pending
                        }
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ 
                      backgroundColor: '#FFF',
                      border: '1px solid #E5E7EB',
                      borderRadius: '8px',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default PaymentAnalytics;
