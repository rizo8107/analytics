import { ApiKeys, MarketingData, AdAccount, Campaign, AdSet, Ad, FilterOptions } from '../types/api';
import { format } from 'date-fns';

export class MarketingApiService {
  private static instance: MarketingApiService;
  private apiKeys: ApiKeys | null = null;
  private readonly FB_API_VERSION = 'v21.0';
  private readonly FB_API_TOKEN = 'EAAJS5ZBLZAxHYBOyVOlBc1ZBaXad6FsZA4ANw5ZAg5CZBLWSAKmZBHJP8mhm0JKMv87JZAkxIWVfGNQ8XcfM3aZCvV9Ek6bpUhBmOVAZANcdXZCoJFc3BZBJoYZCHXPZC6o5dOgZBLSLtB52LFfYZA4G1mTVDm6QpmV3VS7RqyE2Nk1fqjuvKAcwElZAMK0kKjV6EAPZBNtbO5';

  // Standard metrics for insights
  private readonly INSIGHT_FIELDS = [
    'campaign_name',
    'campaign_id',
    'impressions',
    'reach',
    'clicks',
    'spend',
    'cpc',
    'cpm',
    'ctr',
    'actions',
    'action_values',
    'inline_link_clicks',
    'inline_link_click_ctr',
    'cost_per_inline_link_click',
    'objective',
    'date_start',
    'date_stop'
  ].join(',');

  // Action types we're interested in
  private readonly CONVERSION_ACTION_TYPES = [
    'onsite_conversion.purchase',
    'offsite_conversion.fb_pixel_purchase',
    'onsite_conversion.lead',
    'offsite_conversion.fb_pixel_lead',
    'onsite_conversion.complete_registration',
    'offsite_conversion.fb_pixel_complete_registration'
  ];

  private constructor() {
    this.apiKeys = {
      facebookToken: this.FB_API_TOKEN,
      googleAdsToken: ''
    };
  }

  static getInstance(): MarketingApiService {
    if (!MarketingApiService.instance) {
      MarketingApiService.instance = new MarketingApiService();
    }
    return MarketingApiService.instance;
  }

  private async fbGet(endpoint: string, params: Record<string, any> = {}) {
    try {
      // Add access token
      const searchParams = new URLSearchParams();
      searchParams.append('access_token', this.FB_API_TOKEN);
      
      // Process and append all parameters
      Object.entries(params).forEach(([key, value]) => {
        if (value === null || value === undefined) {
          return;
        }
        searchParams.append(key, typeof value === 'object' ? JSON.stringify(value) : String(value));
      });
      
      const url = `https://graph.facebook.com/${this.FB_API_VERSION}/${endpoint}?${searchParams.toString()}`;
      console.log('Making Facebook API request to:', url);
      
      const response = await fetch(url);
      const data = await response.json();

      if (!response.ok) {
        console.error('Facebook API error:', data);
        throw new Error(`Facebook API request failed: ${data.error?.message || 'Unknown error'}`);
      }

      return data;
    } catch (error) {
      console.error('Error in fbGet:', error);
      throw error;
    }
  }

  async getAdAccounts(): Promise<AdAccount[]> {
    try {
      const response = await this.fbGet('me/adaccounts', {
        fields: 'id,name,currency,account_status'
      });

      return response.data.map((account: any) => ({
        id: account.id,
        name: account.name,
        currency: account.currency,
        status: this.mapAccountStatus(account.account_status)
      }));
    } catch (error) {
      console.error('Error fetching ad accounts:', error);
      return [];
    }
  }

  async getAccountInsights(accountId: string, dateRange: { startDate: Date; endDate: Date }, filters?: FilterOptions): Promise<MarketingData[]> {
    try {
      // Remove 'act_' prefix if it exists
      const fbAccountId = accountId.replace('act_', '');
      
      const params = {
        fields: this.INSIGHT_FIELDS,
        level: 'campaign',
        time_range: {
          since: format(dateRange.startDate, 'yyyy-MM-dd'),
          until: format(dateRange.endDate, 'yyyy-MM-dd')
        },
        time_increment: 1,
        limit: 500
      };

      if (filters?.campaigns?.length) {
        // Extract campaign IDs and ensure they are strings without the account prefix
        const campaignIds = filters.campaigns.map(id => {
          const parts = id.split('_');
          return parts.length > 1 ? parts[1] : id;
        });
        
        // Use the campaign endpoint directly if specific campaigns are selected
        const campaignInsights = await Promise.all(
          campaignIds.map(campaignId =>
            this.fbGet(`${campaignId}/insights`, {
              ...params,
              level: 'campaign'
            })
          )
        );

        return campaignInsights.flatMap(response => 
          this.processInsightsResponse(response.data)
        );
      }

      const response = await this.fbGet(`act_${fbAccountId}/insights`, params);
      return this.processInsightsResponse(response.data);
    } catch (error) {
      console.error('Error fetching account insights:', error);
      throw error;
    }
  }

  async getAdSetInsights(adSetIds: string[], dateRange: { startDate: Date; endDate: Date }): Promise<MarketingData[]> {
    try {
      const params = {
        fields: [
          'adset_name',
          'adset_id',
          'campaign_id',
          'campaign_name',
          'impressions',
          'reach',
          'clicks',
          'spend',
          'cpc',
          'cpm',
          'ctr',
          'actions',
          'action_values',
          'conversions',
          'conversion_values',
          'cost_per_action_type',
          'cost_per_conversion',
          'objective',
          'date_start',
          'date_stop'
        ].join(','),
        level: 'adset',
        time_range: {
          since: format(dateRange.startDate, 'yyyy-MM-dd'),
          until: format(dateRange.endDate, 'yyyy-MM-dd')
        },
        time_increment: 1,
        limit: 500
      };

      const allInsights: MarketingData[] = [];

      // Process each ad set individually
      for (const adSetId of adSetIds) {
        const cleanAdSetId = adSetId.includes('_') ? adSetId.split('_')[1] : adSetId;
        try {
          console.log(`Fetching insights for ad set ${cleanAdSetId}`);
          const response = await this.fbGet(`${cleanAdSetId}/insights`, params);
          
          if (!response.data || !response.data.length) {
            console.log(`No insights data for ad set ${cleanAdSetId}`);
            continue;
          }

          const adSetInsights = response.data.map((insight: any) => {
            const conversions = this.extractConversions(insight.actions);
            const revenue = this.extractRevenue(insight.action_values);
            const spend = this.safeParseFloat(insight.spend);
            const roas = this.calculateROAS(revenue, spend);

            return {
              id: insight.adset_id,
              name: insight.adset_name,
              campaignId: insight.campaign_id,
              campaignName: insight.campaign_name,
              date: new Date(insight.date_start),
              platform: 'facebook',
              status: 'ACTIVE',
              impressions: this.safeParseInt(insight.impressions),
              clicks: this.safeParseInt(insight.clicks),
              spend: spend,
              cpc: this.safeParseFloat(insight.cpc),
              cpm: this.safeParseFloat(insight.cpm),
              ctr: this.safeParseFloat(insight.ctr),
              conversions: conversions,
              revenue: revenue,
              roas: roas,
              objective: insight.objective?.toLowerCase() || 'unknown'
            };
          });

          console.log(`Processed ${adSetInsights.length} insights for ad set ${cleanAdSetId}`);
          allInsights.push(...adSetInsights);
        } catch (error) {
          console.error(`Error fetching insights for ad set ${cleanAdSetId}:`, error);
        }
      }

      console.log(`Total insights processed: ${allInsights.length}`);
      return allInsights;
    } catch (error) {
      console.error('Error in getAdSetInsights:', error);
      throw error;
    }
  }

  async getAdInsights(adIds: string[], dateRange: { startDate: Date; endDate: Date }): Promise<MarketingData[]> {
    try {
      const params = {
        fields: this.INSIGHT_FIELDS,
        level: 'ad',
        time_range: {
          since: format(dateRange.startDate, 'yyyy-MM-dd'),
          until: format(dateRange.endDate, 'yyyy-MM-dd')
        },
        time_increment: 1,
        limit: 500
      };

      // Use the ad endpoint directly for each ad
      const adInsights = await Promise.all(
        adIds.map(adId => {
          const fbAdId = adId.includes('_') ? adId.split('_')[1] : adId;
          return this.fbGet(`${fbAdId}/insights`, params);
        })
      );

      return adInsights.flatMap(response => 
        this.processInsightsResponse(response.data)
      );
    } catch (error) {
      console.error('Error fetching ad insights:', error);
      throw error;
    }
  }

  private processInsightsResponse(data: any[]): MarketingData[] {
    return data.map(insight => {
      // Parse numeric values safely
      const safeParseInt = (value: any) => (value ? parseInt(value) || 0 : 0);
      const safeParseFloat = (value: any) => (value ? parseFloat(value) || 0 : 0);

      // Get base metrics
      const impressions = safeParseInt(insight.impressions);
      const clicks = safeParseInt(insight.inline_link_clicks);
      const spend = safeParseFloat(insight.spend);
      
      // Calculate derived metrics
      const ctr = clicks > 0 && impressions > 0 ? (clicks / impressions) * 100 : 0;
      const cpc = clicks > 0 ? spend / clicks : 0;
      const cpm = impressions > 0 ? (spend / impressions) * 1000 : 0;

      // Process conversions and revenue
      const conversions = (insight.actions || []).reduce((total: number, action: any) => {
        if (this.CONVERSION_ACTION_TYPES.includes(action.action_type)) {
          return total + safeParseInt(action.value);
        }
        return total;
      }, 0);

      const revenue = (insight.action_values || []).reduce((total: number, action: any) => {
        if (this.CONVERSION_ACTION_TYPES.includes(action.action_type)) {
          return total + safeParseFloat(action.value);
        }
        return total;
      }, 0);

      const roas = spend > 0 ? (revenue / spend) * 100 : 0;

      return {
        date: format(new Date(insight.date_start), 'yyyy-MM-dd'),
        campaign_id: insight.campaign_id,
        campaign_name: insight.campaign_name,
        platform: 'facebook',
        status: 'ACTIVE',
        impressions,
        clicks,
        spend,
        cpc,
        cpm,
        ctr,
        conversions,
        revenue,
        roas,
        objective: insight.objective?.toLowerCase() || 'unknown'
      };
    });
  }

  private buildInsightFilters(filters?: FilterOptions): any[] {
    const insightFilters = [];

    if (filters?.status && filters.status.length > 0 && !filters.status.includes('ALL')) {
      insightFilters.push({
        field: "campaign.delivery_status",
        operator: "IN",
        value: filters.status
      });
    }

    if (filters?.metricFilters) {
      Object.entries(filters.metricFilters).forEach(([metric, range]) => {
        if (range?.min !== undefined) {
          insightFilters.push({
            field: metric,
            operator: "GREATER_THAN",
            value: range.min
          });
        }
        if (range?.max !== undefined) {
          insightFilters.push({
            field: metric,
            operator: "LESS_THAN",
            value: range.max
          });
        }
      });
    }

    return insightFilters;
  }

  private mapAccountStatus(status: number): string {
    switch (status) {
      case 1:
        return 'ACTIVE';
      case 2:
        return 'DISABLED';
      case 3:
        return 'UNSETTLED';
      case 7:
        return 'PENDING_RISK_REVIEW';
      case 8:
        return 'PENDING_SETTLEMENT';
      case 9:
        return 'IN_GRACE_PERIOD';
      case 100:
        return 'PENDING_CLOSURE';
      case 101:
        return 'CLOSED';
      case 201:
        return 'ANY_ACTIVE';
      case 202:
        return 'ANY_CLOSED';
      default:
        return 'UNKNOWN';
    }
  }

  async fetchFacebookData(startDate: Date, endDate: Date): Promise<MarketingData[]> {
    try {
      const accounts = await this.getAdAccounts();
      const allData: MarketingData[] = [];

      for (const account of accounts) {
        const insights = await this.getAccountInsights(account.id, { startDate, endDate });
        allData.push(...insights);
      }

      return allData;
    } catch (error) {
      console.error('Error fetching Facebook data:', error);
      return [];
    }
  }

  async fetchGoogleAdsData(startDate: Date, endDate: Date): Promise<MarketingData[]> {
    // TODO: Implement Google Ads data fetching
    return [];
  }

  async getCampaigns(accountId: string): Promise<Campaign[]> {
    try {
      // Remove 'act_' prefix if it exists
      const fbAccountId = accountId.replace('act_', '');
      
      const params = {
        fields: 'id,name,status,objective,daily_budget,start_time,stop_time,insights.time_range({"since":"2024-01-01","until":"2024-12-31"}){spend}',
        limit: 500
      };

      const response = await this.fbGet(`act_${fbAccountId}/campaigns`, params);
      
      return response.data.map((campaign: any): Campaign => ({
        id: campaign.id,
        account_id: `act_${fbAccountId}`,
        name: campaign.name,
        status: campaign.status?.toLowerCase() || 'unknown',
        objective: campaign.objective?.toLowerCase() || 'unknown',
        spend: campaign.insights?.data?.[0]?.spend || 0,
        startDate: campaign.start_time ? format(new Date(campaign.start_time), 'yyyy-MM-dd') : undefined,
        endDate: campaign.stop_time ? format(new Date(campaign.stop_time), 'yyyy-MM-dd') : undefined
      }));
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      return [];
    }
  }

  async getAdSets(accountId: string, campaignId?: string): Promise<AdSet[]> {
    try {
      const cleanAccountId = accountId.replace('act_', '');
      const endpoint = `act_${cleanAccountId}/adsets`;
      console.log('Getting ad sets for account:', cleanAccountId);

      const params: any = {
        fields: [
          'id',
          'name',
          'campaign_id',
          'campaign{id,name}',
          'status',
          'daily_budget',
          'lifetime_budget',
          'bid_amount',
          'billing_event',
          'optimization_goal'
        ].join(','),
        limit: 500
      };

      if (campaignId) {
        const cleanCampaignId = campaignId.includes('_') ? campaignId.split('_')[1] : campaignId;
        console.log('Adding campaign filter for:', cleanCampaignId);
        params.filtering = JSON.stringify([{
          field: 'campaign.id',
          operator: 'EQUAL',
          value: cleanCampaignId
        }]);
      }

      console.log('Making API request to:', endpoint);
      console.log('With params:', JSON.stringify(params, null, 2));

      const response = await this.fbGet(endpoint, params);
      console.log('Ad sets API response:', JSON.stringify(response, null, 2));

      if (!response.data) {
        console.error('No data in response:', response);
        return [];
      }

      const adSets = response.data.map((adset: any) => {
        console.log('Processing ad set:', adset);
        return {
          id: adset.id,
          name: adset.name,
          campaignId: adset.campaign?.id || adset.campaign_id,
          campaignName: adset.campaign?.name,
          status: adset.status?.toLowerCase() || 'unknown',
          dailyBudget: adset.daily_budget,
          lifetimeBudget: adset.lifetime_budget,
          bidAmount: adset.bid_amount,
          billingEvent: adset.billing_event,
          optimizationGoal: adset.optimization_goal
        };
      });

      console.log('Processed ad sets:', adSets);
      return adSets;

    } catch (error) {
      console.error('Error in getAdSets:', error);
      if (error.response) {
        console.error('Error response:', {
          status: error.response.status,
          data: error.response.data
        });
      }
      throw error;
    }
  }

  async getAds(accountId: string, campaignId?: string, adSetId?: string): Promise<Ad[]> {
    try {
      const params: any = {
        fields: 'id,name,status,campaign_id,adset_id,creative{id,name,thumbnail_url}'
      };

      // Add filtering based on campaign or ad set
      const filters = [];
      if (campaignId) {
        filters.push({
          field: 'campaign.id',
          operator: 'EQUAL',
          value: campaignId.includes('_') ? campaignId.split('_')[1] : campaignId
        });
      }
      if (adSetId) {
        filters.push({
          field: 'adset.id',
          operator: 'EQUAL',
          value: adSetId.includes('_') ? adSetId.split('_')[1] : adSetId
        });
      }
      if (filters.length > 0) {
        params.filtering = filters;
      }

      const response = await this.fbGet(`act_${accountId.replace('act_', '')}/ads`, params);

      return response.data.map((ad: any) => ({
        id: ad.id,
        name: ad.name,
        status: ad.status.toLowerCase(),
        campaignId: ad.campaign_id,
        adSetId: ad.adset_id,
        creativeId: ad.creative?.id,
        creativeName: ad.creative?.name,
        thumbnailUrl: ad.creative?.thumbnail_url
      }));
    } catch (error) {
      console.error('Error fetching ads:', error);
      return [];
    }
  }

  private extractConversions(actions: any[] = []): number {
    return actions?.reduce((total, action) => {
      if (this.CONVERSION_ACTION_TYPES.includes(action.action_type)) {
        return total + (parseInt(action.value) || 0);
      }
      return total;
    }, 0) || 0;
  }

  private extractRevenue(actionValues: any[] = []): number {
    return actionValues?.reduce((total, action) => {
      if (this.CONVERSION_ACTION_TYPES.includes(action.action_type)) {
        return total + (parseFloat(action.value) || 0);
      }
      return total;
    }, 0) || 0;
  }

  private calculateROAS(revenue: number, spend: number): number {
    return spend > 0 ? revenue / spend : 0;
  }

  private safeParseInt(value: any): number {
    return value ? parseInt(value) || 0 : 0;
  }

  private safeParseFloat(value: any): number {
    return value ? parseFloat(value) || 0 : 0;
  }
}
