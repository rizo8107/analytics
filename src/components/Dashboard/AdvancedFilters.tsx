import React, { useState, useEffect, useRef } from 'react';
import { FilterOptions, AdAccount, Campaign, KPIMetrics } from '../../types/api';
import { MarketingApiService } from '../../utils/apiService';
import DatePicker from 'react-datepicker';
import { ChevronDown, Filter, X, Search, Calendar, RefreshCw } from 'lucide-react';
import "react-datepicker/dist/react-datepicker.css";
import { format } from 'date-fns';

interface AdvancedFiltersProps {
  filters: FilterOptions;
  onFiltersChange: (filters: FilterOptions) => void;
  isLoading?: boolean;
}

const metricRanges = {
  impressions: { min: 0, max: 1000000 },
  clicks: { min: 0, max: 10000 },
  ctr: { min: 0, max: 100 },
  conversions: { min: 0, max: 1000 },
  spend: { min: 0, max: 10000 },
  revenue: { min: 0, max: 50000 },
  roas: { min: 0, max: 20 },
};

export const AdvancedFilters: React.FC<AdvancedFiltersProps> = ({
  filters,
  onFiltersChange,
  isLoading = false,
}) => {
  // State for existing filters
  const [adAccounts, setAdAccounts] = useState<AdAccount[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [showAccountDropdown, setShowAccountDropdown] = useState(false);
  const [showCampaignDropdown, setShowCampaignDropdown] = useState(false);
  const [searchAccount, setSearchAccount] = useState('');
  const [searchCampaign, setSearchCampaign] = useState('');

  // Refs for click outside handling
  const accountDropdownRef = useRef<HTMLDivElement>(null);
  const campaignDropdownRef = useRef<HTMLDivElement>(null);

  // Date range state
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [tempDateRange, setTempDateRange] = useState<[Date | null, Date | null]>([
    filters.dateRange?.startDate || null, 
    filters.dateRange?.endDate || null
  ]);

  // New state for metric filters
  const [showMetricFilters, setShowMetricFilters] = useState(false);
  const [metricFilters, setMetricFilters] = useState<Partial<Record<keyof KPIMetrics, { min?: number; max?: number }>>>({});
  
  const apiService = MarketingApiService.getInstance();

  useEffect(() => {
    loadAdAccounts();
  }, []);

  useEffect(() => {
    if (filters.accounts?.length) {
      loadCampaigns(filters.accounts);
    }
  }, [filters.accounts]);

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (accountDropdownRef.current && !accountDropdownRef.current.contains(event.target as Node)) {
        setShowAccountDropdown(false);
      }
      if (campaignDropdownRef.current && !campaignDropdownRef.current.contains(event.target as Node)) {
        setShowCampaignDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const loadAdAccounts = async () => {
    try {
      const accounts = await apiService.getAdAccounts();
      setAdAccounts(accounts);
    } catch (error) {
      console.error('Error loading ad accounts:', error);
    }
  };

  const loadCampaigns = async (accountIds: string[]) => {
    try {
      const allCampaigns: Campaign[] = [];
      for (const accountId of accountIds) {
        console.log('Loading campaigns for account:', accountId);
        const campaigns = await apiService.getCampaigns(accountId);
        console.log('Loaded campaigns:', campaigns);
        const campaignsWithAccount = campaigns.map(campaign => ({
          ...campaign,
          account_id: accountId
        }));
        allCampaigns.push(...campaignsWithAccount);
      }
      setCampaigns(allCampaigns);
    } catch (error) {
      console.error('Error loading campaigns:', error);
    }
  };

  const handleAccountSelect = async (accountId: string, checked: boolean) => {
    let newAccounts: string[];
    if (checked) {
      newAccounts = [...(filters.accounts || []), accountId];
    } else {
      newAccounts = (filters.accounts || []).filter(id => id !== accountId);
      const remainingCampaigns = campaigns.filter(campaign => 
        campaign.account_id !== accountId
      );
      setCampaigns(remainingCampaigns);
      
      onFiltersChange({
        ...filters,
        accounts: newAccounts,
        campaigns: (filters.campaigns || []).filter(campaignId => {
          const campaign = campaigns.find(c => c.id === campaignId);
          return campaign && campaign.account_id !== accountId;
        })
      });
      return;
    }

    onFiltersChange({
      ...filters,
      accounts: newAccounts
    });

    if (checked) {
      try {
        console.log('Loading campaigns for account:', accountId);
        const newCampaigns = await apiService.getCampaigns(accountId);
        console.log('Loaded campaigns:', newCampaigns);
        const campaignsWithAccount = newCampaigns.map(campaign => ({
          ...campaign,
          account_id: accountId
        }));
        setCampaigns(prev => [...prev, ...campaignsWithAccount]);
      } catch (error) {
        console.error('Error loading campaigns for account:', accountId, error);
      }
    }
  };

  const handleCampaignSelect = async (campaignId: string, checked: boolean) => {
    console.log('Selecting campaign:', campaignId, checked);
    let newCampaigns = checked
      ? [...(filters.campaigns || []), campaignId]
      : (filters.campaigns || []).filter(id => id !== campaignId);

    onFiltersChange({
      ...filters,
      campaigns: newCampaigns
    });
  };

  const handleDateChange = (dates: [Date | null, Date | null]) => {
    const [start, end] = dates;
    setTempDateRange(dates);

    if (start && end) {
      onFiltersChange({
        ...filters,
        dateRange: { startDate: start, endDate: end }
      });
      setDatePickerOpen(false);
    }
  };

  const handleStatusChange = (status: string) => {
    const newStatus = filters.status?.includes(status)
      ? filters.status.filter(s => s !== status)
      : [...(filters.status || []), status];

    if (newStatus.length === 0) {
      newStatus.push('ALL');
    } else if (newStatus.includes('ALL') && newStatus.length > 1) {
      newStatus.splice(newStatus.indexOf('ALL'), 1);
    }

    onFiltersChange({
      ...filters,
      status: newStatus
    });
  };

  const handleMetricFilterChange = (metric: keyof KPIMetrics, type: 'min' | 'max', value: string) => {
    const numValue = value === '' ? undefined : Number(value);
    setMetricFilters(prev => ({
      ...prev,
      [metric]: {
        ...prev[metric],
        [type]: numValue
      }
    }));

    onFiltersChange({
      ...filters,
      metricFilters: {
        ...filters.metricFilters,
        [metric]: {
          ...(filters.metricFilters?.[metric] || {}),
          [type]: numValue
        }
      }
    });
  };

  const filteredAccounts = adAccounts.filter(account =>
    account.name.toLowerCase().includes(searchAccount.toLowerCase())
  );

  const filteredCampaigns = campaigns.filter(campaign => {
    const matchesSearch = !searchCampaign || campaign.name.toLowerCase().includes(searchCampaign.toLowerCase());
    const belongsToSelectedAccount = filters.accounts?.includes(campaign.account_id);
    return matchesSearch && belongsToSelectedAccount;
  });

  return (
    <div className="p-4 bg-white rounded-lg shadow-sm">
      <div className="flex flex-wrap gap-4 items-center mb-4">
        {/* Date Range Picker */}
        <div className="relative">
          <button 
            onClick={() => setDatePickerOpen(!datePickerOpen)}
            className="flex items-center gap-2 px-3 py-2 border rounded-lg"
          >
            <Calendar className="h-5 w-5 text-gray-400" />
            <span>
              {tempDateRange[0] && tempDateRange[1] 
                ? `${format(tempDateRange[0], 'MMM dd')} - ${format(tempDateRange[1], 'MMM dd')}`
                : 'Select Date Range'}
            </span>
          </button>
          {datePickerOpen && (
            <div className="absolute z-10 mt-2 bg-white border rounded-lg shadow-lg p-4">
              <DatePicker
                selected={tempDateRange[0]}
                onChange={handleDateChange}
                startDate={tempDateRange[0]}
                endDate={tempDateRange[1]}
                selectsRange
                inline
                monthsShown={2}
                maxDate={new Date()}
              />
            </div>
          )}
        </div>

        {/* Status Filter */}
        <div className="flex gap-2">
          {['ACTIVE', 'PAUSED', 'ARCHIVED'].map(status => (
            <button
              key={status}
              onClick={() => handleStatusChange(status)}
              className={`px-3 py-1 rounded-full text-sm ${
                filters.status?.includes(status)
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              {status}
            </button>
          ))}
        </div>

        {/* Account and Campaign Filters */}
        <div className="flex gap-4">
          <div className="relative w-64" ref={accountDropdownRef}>
            <button
              onClick={() => setShowAccountDropdown(!showAccountDropdown)}
              className="w-full px-4 py-2 text-left border rounded-lg flex justify-between items-center"
            >
              <span>{filters.accounts?.length ? `${filters.accounts.length} Accounts` : 'Select Accounts'}</span>
              <ChevronDown className="h-4 w-4" />
            </button>
            {showAccountDropdown && (
              <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg">
                <div className="p-2">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search accounts..."
                      value={searchAccount}
                      onChange={(e) => setSearchAccount(e.target.value)}
                      className="w-full px-8 py-2 border rounded"
                    />
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                  </div>
                </div>
                <div className="max-h-60 overflow-y-auto">
                  {filteredAccounts.map(account => (
                    <label
                      key={account.id}
                      className="flex items-center p-2 hover:bg-gray-50 rounded cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={filters.accounts?.includes(account.id)}
                        onChange={(e) => handleAccountSelect(account.id, e.target.checked)}
                        className="mr-2"
                      />
                      {account.name}
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="relative w-64" ref={campaignDropdownRef}>
            <button
              onClick={() => setShowCampaignDropdown(!showCampaignDropdown)}
              className="w-full px-4 py-2 text-left border rounded-lg flex justify-between items-center"
            >
              <span>{filters.campaigns?.length ? `${filters.campaigns.length} Campaigns` : 'Select Campaigns'}</span>
              <ChevronDown className="h-4 w-4" />
            </button>
            {showCampaignDropdown && (
              <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg">
                <div className="p-2">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search campaigns..."
                      value={searchCampaign}
                      onChange={(e) => setSearchCampaign(e.target.value)}
                      className="w-full px-8 py-2 border rounded"
                    />
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                  </div>
                </div>
                <div className="max-h-60 overflow-y-auto">
                  {filteredCampaigns.map(campaign => (
                    <label
                      key={campaign.id}
                      className="flex items-center p-2 hover:bg-gray-50 rounded cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={filters.campaigns?.includes(campaign.id)}
                        onChange={(e) => handleCampaignSelect(campaign.id, e.target.checked)}
                        className="mr-2"
                      />
                      {campaign.name}
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Metric Filters */}
        <div>
          <button
            onClick={() => setShowMetricFilters(!showMetricFilters)}
            className="flex items-center gap-2 text-sm text-gray-600"
          >
            <Filter className="h-4 w-4" />
            {showMetricFilters ? 'Hide Metric Filters' : 'Show Metric Filters'}
          </button>
          
          {showMetricFilters && (
            <div className="grid grid-cols-3 gap-4 mt-4">
              {Object.keys(metricRanges).map(metric => (
                <div key={metric} className="flex flex-col gap-2 p-2">
                  <label className="text-sm font-medium text-gray-700">{metric}</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      placeholder="Min"
                      className="w-24 px-2 py-1 border rounded"
                      value={metricFilters[metric as keyof KPIMetrics]?.min || ''}
                      onChange={(e) => handleMetricFilterChange(metric as keyof KPIMetrics, 'min', e.target.value)}
                      min={metricRanges[metric as keyof KPIMetrics].min}
                      max={metricRanges[metric as keyof KPIMetrics].max}
                    />
                    <input
                      type="number"
                      placeholder="Max"
                      className="w-24 px-2 py-1 border rounded"
                      value={metricFilters[metric as keyof KPIMetrics]?.max || ''}
                      onChange={(e) => handleMetricFilterChange(metric as keyof KPIMetrics, 'max', e.target.value)}
                      min={metricRanges[metric as keyof KPIMetrics].min}
                      max={metricRanges[metric as keyof KPIMetrics].max}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Clear Filters & Apply Button */}
        <div className="flex justify-end gap-4 mt-4">
          <button
            onClick={() => {
              setMetricFilters({});
              onFiltersChange({
                dateRange: filters.dateRange,
                accounts: [],
                campaigns: [],
                status: [],
                metricFilters: {}
              });
            }}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
          >
            Clear Filters
          </button>
          <button
            onClick={loadAdAccounts}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 flex items-center gap-2"
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>
    </div>
  );
};
