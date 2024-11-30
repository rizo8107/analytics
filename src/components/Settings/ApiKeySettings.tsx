import React, { useState } from 'react';
import { Save } from 'lucide-react';
import { ApiKeys } from '../../types/api';

interface ApiKeySettingsProps {
  onSave: (keys: ApiKeys) => void;
  initialKeys?: ApiKeys;
}

export const ApiKeySettings: React.FC<ApiKeySettingsProps> = ({ onSave, initialKeys }) => {
  const [keys, setKeys] = useState<ApiKeys>(initialKeys || {
    facebookToken: '',
    googleAdsToken: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(keys);
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-sm">
      <h2 className="text-2xl font-semibold mb-6">API Configuration</h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Facebook API Token
          </label>
          <input
            type="password"
            value={keys.facebookToken}
            onChange={(e) => setKeys({ ...keys, facebookToken: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter Facebook API Token"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Google Ads API Token
          </label>
          <input
            type="password"
            value={keys.googleAdsToken}
            onChange={(e) => setKeys({ ...keys, googleAdsToken: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter Google Ads API Token"
          />
        </div>

        <button
          type="submit"
          className="flex items-center justify-center w-full px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <Save className="w-4 h-4 mr-2" />
          Save API Keys
        </button>
      </form>
    </div>
  );
};
