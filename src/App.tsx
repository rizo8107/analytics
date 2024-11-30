import React, { useState, useEffect } from 'react';
import { ApiKeySettings } from './components/Settings/ApiKeySettings';
import ModernDashboard from './components/Dashboard/ModernDashboard';
import PaymentAnalytics from './components/Dashboard/PaymentAnalytics';
import { MarketingApiService } from './utils/apiService';
import { ApiKeys, MarketingData } from './types/api';
import { Bell, Settings, Search, Filter } from 'lucide-react';

const App: React.FC = () => {
  const [marketingData, setMarketingData] = useState<MarketingData[]>([]);
  const [showApiConfig, setShowApiConfig] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const apiService = MarketingApiService.getInstance();

  const handleApiKeysSave = (keys: ApiKeys) => {
    apiService.setApiKeys(keys);
    fetchData();
  };

  const fetchData = async () => {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - 30);

      const [facebookData, googleData] = await Promise.all([
        apiService.fetchFacebookData(startDate, endDate),
        apiService.fetchGoogleAdsData(startDate, endDate)
      ]);

      setMarketingData([...facebookData, ...googleData]);
    } catch (error) {
      console.error('Error fetching marketing data:', error);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const toggleFilters = () => {
    setShowFilters(!showFilters);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="sticky top-0 z-50 bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <h1 className="text-xl font-bold text-gray-900">Marketing Dashboard</h1>
              </div>
            </div>
            <div className="flex items-center">
              <button
                onClick={() => setShowApiConfig(!showApiConfig)}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <Settings className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">API Settings</span>
              </button>
              <button
                onClick={toggleFilters}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <Filter className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Filters</span>
              </button>
              <button className="p-2 rounded-lg hover:bg-gray-100 relative">
                <Bell className="h-5 w-5 text-gray-600" />
                <span className="absolute top-0 right-0 h-2 w-2 bg-red-500 rounded-full"></span>
              </button>
              <div className="h-9 w-9 rounded-full bg-blue-500 flex items-center justify-center text-white font-medium">
                JD
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {showApiConfig && (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <ApiKeySettings onSave={handleApiKeysSave} />
            </div>
          )}
          {showFilters && (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              {/* AdvancedFilters component is not defined in the provided code */}
              {/* <AdvancedFilters
                filters={filters}
                onFiltersChange={handleFiltersChange}
                isLoading={isLoading}
              /> */}
            </div>
          )}

          <div className="grid grid-cols-1 gap-6">
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <ModernDashboard data={marketingData} />
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden">
              <PaymentAnalytics />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;