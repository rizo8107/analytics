import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  XAxis, 
  YAxis, 
  Tooltip,
  CartesianGrid
} from 'recharts';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { MarketingData, KPIMetrics, FilterOptions } from '../../types/api';
import { calculateMetrics, formatMetricValue, getMetricPrefix, getMetricSuffix, calculatePlatformDistribution } from '../../utils/dataTransform';
import { format } from 'date-fns';
import { AdvancedFilters } from './AdvancedFilters';
import { AdPerformance } from './AdPerformance';
import { MarketingApiService } from '../../utils/apiService';

interface DashboardProps {
  data: MarketingData[];
}

const kpiDefinitions = [
  { key: 'impressions', label: 'Impressions', description: 'Number of times ads were displayed' },
  { key: 'clicks', label: 'Clicks', description: 'Number of times ads were clicked' },
  { key: 'ctr', label: 'CTR', description: 'Click-Through Rate' },
  { key: 'conversions', label: 'Conversions', description: 'Number of completed actions' },
  { key: 'cpc', label: 'CPC', description: 'Cost Per Click' },
  { key: 'costPerConversion', label: 'CPConv', description: 'Cost Per Conversion' },
  { key: 'roas', label: 'ROAS', description: 'Return on Ad Spend' },
  { key: 'spend', label: 'Spend', description: 'Total amount spent' },
  { key: 'revenue', label: 'Revenue', description: 'Total revenue generated' },
] as const;

const ModernDashboard: React.FC<DashboardProps> = ({ data: initialData }) => {
  const [filters, setFilters] = useState<FilterOptions>({
    accounts: [],
    campaigns: [],
    adsets: [],
    ads: [],
    dateRange: {
      startDate: new Date(new Date().setDate(new Date().getDate() - 30)),
      endDate: new Date(),
    },
    status: ['ALL'],
  });

  const [selectedMetrics, setSelectedMetrics] = useState({
    areaChart: 'spend',
    lineChart: 'conversions'
  });

  const [dashboardData, setDashboardData] = useState<MarketingData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const apiService = MarketingApiService.getInstance();

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      let allData: MarketingData[] = [];
      console.log('Fetching data with filters:', filters);

      // If ad sets are selected, fetch data for each ad set individually
      if (filters.adsets?.length) {
        console.log('Fetching data for selected adsets:', filters.adsets);
        for (const adsetId of filters.adsets) {
          const adsetData = await apiService.getAdSetInsights(
            [adsetId], // Pass single ad set ID
            filters.dateRange!
          );
          allData.push(...adsetData);
        }
        console.log('Fetched adset data:', allData);
      }
      // If ads are selected, show ad-level data
      else if (filters.ads?.length) {
        console.log('Fetching data for selected ads:', filters.ads);
        const adData = await apiService.getAdInsights(
          filters.ads,
          filters.dateRange!
        );
        allData = adData;
      }
      // If campaigns are selected but no ad sets or ads, show campaign data
      else if (filters.campaigns?.length) {
        // Group campaigns by account
        const campaignsByAccount = new Map<string, string[]>();
        filters.campaigns.forEach(campaignId => {
          const [accountId] = campaignId.split('_');
          if (!campaignsByAccount.has(accountId)) {
            campaignsByAccount.set(accountId, []);
          }
          campaignsByAccount.get(accountId)!.push(campaignId);
        });

        // Fetch data for each account's campaigns
        for (const [accountId, campaigns] of campaignsByAccount.entries()) {
          const accountData = await apiService.getAccountInsights(
            accountId,
            filters.dateRange!,
            { ...filters, campaigns }
          );
          allData.push(...accountData);
        }
      }
      // If only accounts are selected, show account data
      else if (filters.accounts?.length) {
        for (const accountId of filters.accounts) {
          const accountData = await apiService.getAccountInsights(
            accountId,
            filters.dateRange!
          );
          allData.push(...accountData);
        }
      }
      // If nothing is selected, show data for the first account
      else {
        const accounts = await apiService.getAdAccounts();
        if (accounts.length > 0) {
          const accountData = await apiService.getAccountInsights(
            accounts[0].id,
            filters.dateRange!
          );
          allData = accountData;
        }
      }

      console.log('Final fetched data:', allData);
      setDashboardData(allData);
    } catch (error) {
      console.error('Error fetching data:', error);
      setError(error instanceof Error ? error.message : 'An error occurred while fetching data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFiltersChange = useCallback(async (newFilters: FilterOptions) => {
    setFilters(newFilters);
  }, []);

  const metrics = useMemo(() => calculateMetrics(dashboardData), [dashboardData]);
  const platformData = useMemo(() => calculatePlatformDistribution(dashboardData), [dashboardData]);

  const renderMetricCard = useCallback((metric: keyof KPIMetrics) => {
    const definition = kpiDefinitions.find(d => d.key === metric);
    const value = metrics[metric];
    const formattedValue = formatMetricValue(value, metric);
    const prefix = getMetricPrefix(metric);
    const suffix = getMetricSuffix(metric);
    
    return (
      <div
        key={metric}
        className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
      >
        <div className="flex justify-between items-start mb-2">
          <div>
            <h3 className="text-sm font-medium text-gray-500">{definition?.label}</h3>
            <p className="text-2xl font-semibold mt-1">
              {prefix}{formattedValue}{suffix}
            </p>
          </div>
          <div className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-800">
            <span className="flex items-center">
              <ArrowUpRight className="w-3 h-3 mr-1" />
              24%
            </span>
          </div>
        </div>
        <p className="text-xs text-gray-500">{definition?.description}</p>
      </div>
    );
  }, [metrics]);

  const renderPlatformDistribution = () => {
    if (!platformData?.length) return null;

    return (
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-800">Platform Distribution</h3>
            <p className="text-sm text-gray-500 mt-1">Spend by platform</p>
          </div>
        </div>
        <div className="h-[300px] relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={platformData}
                innerRadius={80}
                outerRadius={120}
                paddingAngle={5}
                dataKey="value"
              >
                {platformData.map((entry, index) => (
                  <Cell 
                    key={index} 
                    fill={entry.color || '#808080'} 
                    stroke="white"
                    strokeWidth={2}
                  />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  padding: '12px'
                }}
                formatter={(value: any) => [`$${(value || 0).toFixed(2)}`, 'Spend']}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute bottom-0 left-0 right-0">
            <div className="flex justify-center gap-6">
              {platformData.map((platform, index) => (
                platform?.platform && (
                  <div key={index} className="flex items-center">
                    <div 
                      className="w-3 h-3 rounded-full mr-2"
                      style={{ backgroundColor: platform.color || '#808080' }}
                    />
                    <span className="text-sm font-medium text-gray-600">
                      {platform.platform.charAt(0).toUpperCase() + platform.platform.slice(1)}
                    </span>
                  </div>
                )
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  useEffect(() => {
    fetchData();
  }, [filters]);

  return (
    <div className="space-y-6">
      <AdvancedFilters 
        filters={filters}
        onFiltersChange={handleFiltersChange}
      />

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      ) : error ? (
        <div className="text-red-500 text-center p-4">{error}</div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm p-6">
          {/* Header with Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {kpiDefinitions.map(({ key }) => renderMetricCard(key as keyof KPIMetrics))}
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Area Chart */}
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">Metrics Over Time</h3>
                  <p className="text-sm text-gray-500 mt-1">Daily performance tracking</p>
                </div>
                <div className="flex items-center space-x-4">
                  <select
                    className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    value={selectedMetrics.areaChart}
                    onChange={(e) => setSelectedMetrics(prev => ({ ...prev, areaChart: e.target.value }))}
                  >
                    {kpiDefinitions.map(({ key, label }) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dashboardData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorMetric" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4318FF" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#4318FF" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(date) => {
                        try {
                          const dateObj = new Date(date);
                          return isNaN(dateObj.getTime()) ? '' : format(dateObj, 'MMM dd');
                        } catch {
                          return '';
                        }
                      }}
                      stroke="#94a3b8"
                      fontSize={12}
                    />
                    <YAxis 
                      stroke="#94a3b8"
                      fontSize={12}
                      tickFormatter={(value) => {
                        const metric = selectedMetrics.areaChart as keyof KPIMetrics;
                        return `${getMetricPrefix(metric)}${formatMetricValue(value, metric)}${getMetricSuffix(metric)}`;
                      }}
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                        padding: '12px'
                      }}
                      labelFormatter={(date) => {
                        try {
                          const dateObj = new Date(date);
                          return isNaN(dateObj.getTime()) ? '' : format(dateObj, 'MMM dd, yyyy');
                        } catch {
                          return '';
                        }
                      }}
                      formatter={(value: any) => {
                        const metric = kpiDefinitions.find(m => m.key === selectedMetrics.areaChart);
                        return [
                          `${getMetricPrefix(selectedMetrics.areaChart as keyof KPIMetrics)}${formatMetricValue(value, selectedMetrics.areaChart as keyof KPIMetrics)}${getMetricSuffix(selectedMetrics.areaChart as keyof KPIMetrics)}`,
                          metric?.label || ''
                        ];
                      }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey={selectedMetrics.areaChart}
                      stroke="#4318FF" 
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorMetric)"
                      dot={false}
                      activeDot={{ r: 6, fill: "#4318FF", stroke: "white", strokeWidth: 2 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Platform Distribution */}
            {renderPlatformDistribution()}
          </div>

          {/* Line Chart */}
          <div className="mt-6 bg-white rounded-xl p-6 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-800">Trend Analysis</h3>
                <p className="text-sm text-gray-500 mt-1">Performance metrics comparison</p>
              </div>
              <div className="flex items-center space-x-4">
                <select
                  className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  value={selectedMetrics.lineChart}
                  onChange={(e) => setSelectedMetrics(prev => ({ ...prev, lineChart: e.target.value }))}
                >
                  {kpiDefinitions.map(({ key, label }) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dashboardData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="date"
                    tickFormatter={(date) => {
                      try {
                        const dateObj = new Date(date);
                        return isNaN(dateObj.getTime()) ? '' : format(dateObj, 'MMM dd');
                      } catch {
                        return '';
                      }
                    }}
                    stroke="#94a3b8"
                    fontSize={12}
                  />
                  <YAxis 
                    stroke="#94a3b8"
                    fontSize={12}
                    tickFormatter={(value) => {
                      const metric = selectedMetrics.lineChart as keyof KPIMetrics;
                      return `${getMetricPrefix(metric)}${formatMetricValue(value, metric)}${getMetricSuffix(metric)}`;
                    }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                      padding: '12px'
                    }}
                    labelFormatter={(date) => {
                      try {
                        const dateObj = new Date(date);
                        return isNaN(dateObj.getTime()) ? '' : format(dateObj, 'MMM dd, yyyy');
                      } catch {
                        return '';
                      }
                    }}
                    formatter={(value: any) => {
                      const metric = kpiDefinitions.find(m => m.key === selectedMetrics.lineChart);
                      return [
                        `${getMetricPrefix(selectedMetrics.lineChart as keyof KPIMetrics)}${formatMetricValue(value, selectedMetrics.lineChart as keyof KPIMetrics)}${getMetricSuffix(selectedMetrics.lineChart as keyof KPIMetrics)}`,
                        metric?.label || ''
                      ];
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey={selectedMetrics.lineChart}
                    stroke="#4318FF" 
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 6, fill: "#4318FF", stroke: "white", strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ModernDashboard;
