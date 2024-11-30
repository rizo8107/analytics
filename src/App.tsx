import React, { useState, useEffect } from 'react';
import { ApiKeySettings } from './components/Settings/ApiKeySettings';
import ModernDashboard from './components/Dashboard/ModernDashboard';
import PaymentAnalytics from './components/Dashboard/PaymentAnalytics';
import { MarketingApiService } from './utils/apiService';
import { ApiKeys, MarketingData } from './types/api';
import { Bell, Settings, Search } from 'lucide-react';

const App: React.FC = () => {
  const [marketingData, setMarketingData] = useState<MarketingData[]>([]);
  const [showApiConfig, setShowApiConfig] = useState(false);
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

  return (
    <div className="min-h-screen bg-[#F4F7FE]">
      {/* Navigation */}
      <nav className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-[1800px] mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-6">
              <h1 className="text-xl font-bold text-gray-900">Marketing Dashboard</h1>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search..."
                  className="pl-10 pr-4 py-2 rounded-lg bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
                />
                <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
              </div>
            </div>
            <div className="flex items-center space-x-6">
              <button className="p-2 rounded-lg hover:bg-gray-100 relative">
                <Bell className="h-5 w-5 text-gray-600" />
                <span className="absolute top-0 right-0 h-2 w-2 bg-red-500 rounded-full"></span>
              </button>
              <button className="p-2 rounded-lg hover:bg-gray-100">
                <Settings className="h-5 w-5 text-gray-600" />
              </button>
              <div className="h-9 w-9 rounded-full bg-blue-500 flex items-center justify-center text-white font-medium">
                JD
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-[1800px] mx-auto px-6 py-6">
        {/* API Settings Button */}
        <div className="mb-6">
          {showApiConfig && (
            <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-800">API Configuration</h2>
                <button
                  onClick={() => setShowApiConfig(false)}
                  className="text-gray-500 hover:text-gray-700 p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <ApiKeySettings onSave={handleApiKeysSave} />
            </div>
          )}
          {!showApiConfig && (
            <button
              onClick={() => setShowApiConfig(true)}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-sm transition-colors"
            >
              <Settings className="h-4 w-4 mr-2" />
              API Settings
            </button>
          )}
        </div>

        {/* Analytics Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Marketing Analytics */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-6 text-gray-800">Marketing Analytics</h2>
            <div className="overflow-hidden">
              <ModernDashboard data={marketingData} />
            </div>
          </div>
          
          {/* Payment Analytics */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-6 text-gray-800">Payment Analytics</h2>
            <div className="overflow-hidden">
              <PaymentAnalytics />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;