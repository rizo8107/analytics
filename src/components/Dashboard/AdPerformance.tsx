import React, { useState, useEffect } from 'react';
import { Ad } from '../../types/api';
import { MarketingApiService } from '../../utils/apiService';
import { Eye, BarChart2, DollarSign, MousePointer } from 'lucide-react';

interface AdPerformanceProps {
  adSetId?: string;
  dateRange: {
    startDate: Date;
    endDate: Date;
  };
}

export const AdPerformance: React.FC<AdPerformanceProps> = ({
  adSetId,
  dateRange,
}) => {
  const [ads, setAds] = useState<Ad[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const apiService = MarketingApiService.getInstance();

  useEffect(() => {
    if (adSetId) {
      loadAds();
    }
  }, [adSetId, dateRange]);

  const loadAds = async () => {
    if (!adSetId) return;
    setIsLoading(true);
    try {
      const adsData = await apiService.getAds(adSetId, dateRange);
      setAds(adsData);
    } catch (error) {
      console.error('Error loading ads:', error);
    }
    setIsLoading(false);
  };

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);

  const formatNumber = (value: number) =>
    new Intl.NumberFormat('en-US').format(value);

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <h3 className="text-lg font-medium mb-6">Ad Performance</h3>
      
      {isLoading ? (
        <div className="flex justify-center items-center h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      ) : ads.length === 0 ? (
        <div className="text-center text-gray-500 py-8">
          {adSetId ? 'No ads found' : 'Select an ad set to view performance'}
        </div>
      ) : (
        <div className="grid gap-6">
          {ads.map((ad) => (
            <div
              key={ad.id}
              className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start gap-4">
                {/* Ad Preview */}
                {ad.creative?.thumbnail_url && (
                  <div className="w-24 h-24 rounded-lg overflow-hidden flex-shrink-0">
                    <img
                      src={ad.creative.thumbnail_url}
                      alt={ad.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                <div className="flex-grow">
                  {/* Ad Header */}
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h4 className="font-medium text-gray-900">{ad.name}</h4>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        ad.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {ad.status.toUpperCase()}
                      </span>
                    </div>
                    {ad.preview_url && (
                      <a
                        href={ad.preview_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <Eye className="w-5 h-5" />
                      </a>
                    )}
                  </div>

                  {/* Metrics Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="flex items-center gap-2">
                      <BarChart2 className="w-4 h-4 text-gray-400" />
                      <div>
                        <div className="text-sm font-medium">
                          {formatNumber(ad.metrics.impressions)}
                        </div>
                        <div className="text-xs text-gray-500">Impressions</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <MousePointer className="w-4 h-4 text-gray-400" />
                      <div>
                        <div className="text-sm font-medium">
                          {formatNumber(ad.metrics.clicks)}
                        </div>
                        <div className="text-xs text-gray-500">Clicks</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-gray-400" />
                      <div>
                        <div className="text-sm font-medium">
                          {formatCurrency(ad.metrics.spend)}
                        </div>
                        <div className="text-xs text-gray-500">Spend</div>
                      </div>
                    </div>

                    <div>
                      <div className="text-sm font-medium">
                        {ad.metrics.ctr.toFixed(2)}%
                      </div>
                      <div className="text-xs text-gray-500">CTR</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
