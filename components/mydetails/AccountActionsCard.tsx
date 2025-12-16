import React, { useState, useEffect } from "react";

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
    const response = await fetch(
      `http://ip-api.com/json/${ip}?fields=countryCode`
    );
    if (response.ok) {
      const data = await response.json();
      if (data.countryCode) {
        const code = data.countryCode.toLowerCase();
        ipCountryCache[ip] = code; // Cache the result
        return code;
      }
    }
  } catch (error) {
    console.error("Failed to lookup country from IP:", error);
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
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-md sm:rounded-xl overflow-hidden flex flex-col md:h-full border border-gray-700">
      {/* Header - Compact on mobile */}
      <div className="px-2 sm:px-4 py-1 sm:py-3 flex items-center justify-between flex-shrink-0 bg-gray-800 border-b border-gray-700">
        <h3 className="text-[10px] sm:text-base font-semibold text-white font-sans">
          Account & Security
        </h3>
      </div>

      {/* Content - Compact on mobile */}
      <div className="p-2 sm:p-4 flex-1 flex flex-col">
        {/* Last Login Section */}
        <div className="space-y-1 sm:space-y-2 flex-1">
          {loginHistory.length > 0 ? (
            loginHistory.map((activity) => (
              <div key={activity.id} className="py-1 sm:py-2">
                <div className="text-white text-[9px] sm:text-sm font-medium font-sans mb-0.5 sm:mb-1.5">
                  {activity.timestamp}
                </div>
                <div className="flex items-center justify-between gap-1">
                  <div
                    className={`text-[9px] sm:text-xs font-sans ${
                      activity.successful
                        ? "text-brand-primary"
                        : "text-red-500"
                    }`}
                  >
                    {activity.successful ? "Login successful" : "Login failed"}
                  </div>
                  <div className="text-gray-400 text-[9px] sm:text-xs flex items-center gap-1 sm:gap-1.5 font-sans">
                    {countryFlags[activity.id] ? (
                      <img
                        src={`https://flagcdn.com/w40/${
                          countryFlags[activity.id]
                        }.png`}
                        alt={activity.location}
                        className="w-4 sm:w-6 h-auto rounded-sm flex-shrink-0"
                      />
                    ) : (
                      <div className="w-4 sm:w-6 h-2.5 sm:h-4 bg-gray-600 rounded-sm animate-pulse flex-shrink-0" />
                    )}
                    <span className="truncate">{activity.location}</span>
                  </div>
                </div>
                <div className="text-gray-500 text-[8px] sm:text-xs font-sans mt-0.5 sm:mt-1.5 truncate">
                  IP: {activity.ip}
                </div>
              </div>
            ))
          ) : (
            <div className="text-gray-500 text-[9px] sm:text-xs font-sans py-2">
              No login history available
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="pt-1.5 sm:pt-3 mt-1.5 sm:mt-3 border-t border-gray-700">
          <div className="flex flex-col gap-2 mt-3">
            <button
              onClick={onChangePassword}
              className="w-full px-3 sm:px-4 py-2 sm:py-2.5 text-sm font-sans font-medium rounded-full shadow-lg transition-colors whitespace-nowrap text-white bg-gradient-primary hover:opacity-90"
            >
              Change Password
            </button>
            <button
              onClick={onSignOut}
              className="w-full px-3 sm:px-4 py-2 sm:py-2.5 text-sm font-sans font-medium rounded-full shadow-lg transition-colors whitespace-nowrap text-white bg-gradient-primary hover:opacity-90"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountActionsCard;
