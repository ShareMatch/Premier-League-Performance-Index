import React, { useState, useEffect } from 'react';

interface LoginActivity {
  id: string;
  timestamp: string;
  location: string;
  countryCode?: string; // ISO country code for flag (e.g., 'ae' for UAE)
  ip: string;
  successful: boolean;
}

// Cache for IP to country code lookups
const ipCountryCache: Record<string, string> = {};

// Fetch country code from IP using free ip-api.com service
const getCountryCodeFromIP = async (ip: string): Promise<string | null> => {
  // Check cache first
  if (ipCountryCache[ip]) {
    return ipCountryCache[ip];
  }
  
  try {
    // ip-api.com is free for non-commercial use (limited to 45 requests/minute)
    const response = await fetch(`http://ip-api.com/json/${ip}?fields=countryCode`);
    if (response.ok) {
      const data = await response.json();
      if (data.countryCode) {
        const code = data.countryCode.toLowerCase();
        ipCountryCache[ip] = code; // Cache the result
        return code;
      }
    }
  } catch (error) {
    console.error('Failed to lookup country from IP:', error);
  }
  return null;
};

interface AccountActionsCardProps {
  loginHistory: LoginActivity[];
  onEdit?: () => void;
  onChangePassword?: () => void;
  onSignOut?: () => void;
  onDeleteAccount?: () => void;
}

const AccountActionsCard: React.FC<AccountActionsCardProps> = ({ 
  loginHistory,
  onChangePassword,
  onSignOut,
  onDeleteAccount,
}) => {
  const [countryFlags, setCountryFlags] = useState<Record<string, string>>({});

  // Fetch country codes from IPs on mount
  useEffect(() => {
    const fetchCountryCodes = async () => {
      const newFlags: Record<string, string> = {};
      
      for (const activity of loginHistory) {
        // Use provided countryCode first, then try IP lookup
        if (activity.countryCode) {
          newFlags[activity.id] = activity.countryCode.toLowerCase();
        } else if (activity.ip) {
          const code = await getCountryCodeFromIP(activity.ip);
          if (code) {
            newFlags[activity.id] = code;
          }
        }
      }
      
      setCountryFlags(newFlags);
    };

    fetchCountryCodes();
  }, [loginHistory]);

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl overflow-hidden flex flex-col h-full border border-gray-700">
      {/* Header */}
      <div className="px-4 py-3 flex justify-between items-center flex-shrink-0 bg-gray-800 border-b border-gray-700">
        <h3 className="text-base font-semibold text-white font-sans">Account Actions</h3>
      </div>

      {/* Content */}
      <div className="p-4 flex-1 flex flex-col">
        {/* Login History */}
        <div className="space-y-2 flex-1">
          {loginHistory.map((activity) => (
            <div 
              key={activity.id}
              className="flex items-start justify-between py-2"
            >
              <div className="space-y-1.5">
                <div className="text-white text-sm font-medium font-sans">{activity.timestamp}</div>
                <div className={`text-xs font-sans ${activity.successful ? 'text-brand-emerald500' : 'text-red-500'}`}>
                  {activity.successful ? 'Login successful' : 'Login failed'}
                </div>
                <div className="text-gray-500 text-xs font-sans">IP: {activity.ip}</div>
              </div>
              <div className="text-right">
                <div className="text-gray-400 text-xs flex items-center gap-1.5 font-sans">
                  {countryFlags[activity.id] ? (
                    <img
                      src={`https://flagcdn.com/w40/${countryFlags[activity.id]}.png`}
                      alt={activity.location}
                      className="w-6 h-auto rounded-sm flex-shrink-0"
                    />
                  ) : (
                    <div className="w-6 h-4 bg-gray-600 rounded-sm animate-pulse flex-shrink-0" />
                  )}
                  <span>{activity.location}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Action Buttons - Stacked Layout */}
        <div className="pt-3 mt-3 border-t border-gray-700 space-y-2">
          {/* Row 1: Change Password */}
          <button
            onClick={onChangePassword}
            className="w-full px-4 py-2.5 text-sm font-sans font-medium text-brand-emerald500 border border-brand-emerald500 rounded-full hover:bg-brand-emerald500/10 transition-colors"
          >
            Change Password
          </button>
          
          {/* Row 2: Sign Out */}
          <button
            onClick={onSignOut}
            className="w-full px-4 py-2.5 text-sm font-sans font-medium text-brand-emerald500 border border-brand-emerald500 rounded-full hover:bg-brand-emerald500/10 transition-colors"
          >
            Sign Out
          </button>
          
          {/* Row 3: Delete Account */}
          <button
            onClick={onDeleteAccount}
            className="w-full px-4 py-2.5 text-sm font-sans font-medium text-red-500 border border-red-500 rounded-full hover:bg-red-500/10 transition-colors"
          >
            Delete Account
          </button>
        </div>
      </div>
    </div>
  );
};

export default AccountActionsCard;
