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

// Fetch country code from IP using ipapi.co (HTTPS, free tier: 1000 requests/day)
const getCountryCodeFromIP = async (ip: string): Promise<string | null> => {
  // Check cache first
  if (ipCountryCache[ip]) {
    return ipCountryCache[ip];
  }

  try {
    // ipapi.co supports HTTPS and works in production
    const response = await fetch(`https://ipapi.co/${ip}/country_code/`);
    if (response.ok) {
      const countryCode = await response.text();
      if (countryCode && countryCode.length === 2) {
        const code = countryCode.toLowerCase();
        ipCountryCache[ip] = code; // Cache the result
        return code;
      }
    }
  } catch (error) {
    // console.error("Failed to lookup country from IP:", error);
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
                <div className="flex items-center justify-between font-sans">
                  {/* Left side - Login status and time */}
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <span
                      className={`text-[9px] sm:text-sm font-medium ${activity.successful ? "text-white" : "text-red-500"}`}
                    >
                      {activity.successful ? "Last Login" : "Failed"}
                    </span>
                    <span className="text-gray-400 text-[9px] sm:text-xs">
                      {activity.timestamp}
                    </span>
                  </div>
                  {/* Right side - IP and flag */}
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <span className="text-gray-500 text-[8px] sm:text-xs">
                      IP: {activity.ip}
                    </span>
                    {countryFlags[activity.id] ? (
                      <img
                        src={`https://flagcdn.com/w40/${countryFlags[activity.id]}.png`}
                        alt={activity.location}
                        className="w-4 sm:w-5 h-auto rounded-sm flex-shrink-0"
                      />
                    ) : (
                      <div className="w-4 sm:w-5 h-2.5 sm:h-3 bg-gray-600 rounded-sm animate-pulse flex-shrink-0" />
                    )}
                  </div>
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
          <div className="flex gap-2 mt-3">
            <button
              onClick={onChangePassword}
              className="flex-1 px-3 sm:px-4 py-2 sm:py-2.5 text-[10px] sm:text-sm font-sans font-medium rounded-full shadow-lg transition-colors whitespace-nowrap text-white bg-gradient-primary hover:opacity-90"
            >
              Change Password
            </button>
            <button
              onClick={onSignOut}
              className="flex-1 px-3 sm:px-4 py-2 sm:py-2.5 text-[10px] sm:text-sm font-sans font-medium rounded-full shadow-lg transition-colors whitespace-nowrap text-white bg-gradient-primary hover:opacity-90"
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
