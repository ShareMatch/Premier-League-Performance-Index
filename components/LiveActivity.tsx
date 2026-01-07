import React, { useState } from "react";
import { Zap } from "lucide-react";
import { getLogoUrl } from "../lib/logoHelper"; // Assuming path to logoHelper

interface ActivityItem {
  asset: string;
  index: string;
  action: "bought" | "sold";
  amount: number;
  market: string; // Added for getLogoUrl
}

const LiveActivity: React.FC = () => {
  // Mock data - in real app, this could come from props or API
  const activities: ActivityItem[] = [
    {
      asset: "Man City",
      index: "EPL",
      action: "bought",
      amount: 450,
      market: "EPL",
    },
    {
      asset: "Max Verstappen",
      index: "F1",
      action: "sold",
      amount: 320,
      market: "F1",
    },
    {
      asset: "Liverpool",
      index: "EPL",
      action: "bought",
      amount: 280,
      market: "EPL",
    },
    {
      asset: "Lewis Hamilton",
      index: "F1",
      action: "bought",
      amount: 195,
      market: "F1",
    },
    {
      asset: "Real Madrid",
      index: "UCL",
      action: "sold",
      amount: 510,
      market: "UCL",
    },
    {
      asset: "Arsenal",
      index: "EPL",
      action: "bought",
      amount: 340,
      market: "EPL",
    },
    {
      asset: "Al-Nassr",
      index: "SPL",
      action: "bought",
      amount: 220,
      market: "SPL",
    },
    {
      asset: "Chelsea",
      index: "EPL",
      action: "sold",
      amount: 175,
      market: "EPL",
    },
  ];

  const [expanded, setExpanded] = useState(false);

  const displayedActivities = expanded ? activities : activities.slice(0, 3);

  return (
    <div className="bg-gray-800/50 rounded-xl border border-gray-700 overflow-hidden">
      <div className="bg-gray-800 border-b border-gray-700 px-4 py-3 flex items-center justify-between">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Zap className="w-4 h-4 text-[#00A651]" />
          Live Activity
        </h3>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 bg-[#00A651] rounded-full animate-pulse" />
          <span className="text-[10px] text-gray-400 uppercase font-medium">
            Live
          </span>
        </div>
      </div>
      <div className="divide-y divide-gray-700">
        {displayedActivities.map((activity, i) => {
          const isBuy = activity.action === "bought";
          const timeAgo = Math.floor(Math.random() * 60) + 1;
          const logoUrl = getLogoUrl(activity.asset, activity.market) || null;
          return (
            <div
              key={i}
              className="px-4 py-3 hover:bg-gray-800/50 transition-colors cursor-pointer group"
            >
              <div className="flex items-start gap-3">
                {/* Asset Logo/Avatar */}
                <div className="w-8 h-8 rounded-full bg-gray-700/50 flex items-center justify-center border border-gray-600/30 flex-shrink-0 mt-0.5 overflow-hidden">
                  {logoUrl ? (
                    <img
                      src={logoUrl}
                      alt={`${activity.asset} logo`}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <span className="text-xs font-bold text-gray-400">
                      {activity.asset.charAt(0)}
                    </span>
                  )}
                </div>
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs text-gray-300 leading-relaxed">
                      <span className="text-white font-bold">
                        {activity.asset}
                      </span>{" "}
                      <span className="text-gray-500">from</span>{" "}
                      <span className="text-gray-400 font-medium">
                        {activity.index}
                      </span>{" "}
                      <span
                        className={
                          isBuy
                            ? "text-[#00A651] font-medium"
                            : "text-red-400 font-medium"
                        }
                      >
                        {activity.action}
                      </span>{" "}
                      <span className="text-white font-bold">
                        ${activity.amount}
                      </span>
                    </p>
                  </div>
                  <p className="text-[10px] text-gray-500 mt-1">
                    {timeAgo}s ago
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {/* View More/Less Footer */}
      <div className="bg-gray-800/30 border-t border-gray-700 px-4 py-2.5">
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-gray-400 hover:text-white transition-colors w-full text-center font-medium"
        >
          {expanded ? "View Less ↑" : "View All Activity →"}
        </button>
      </div>
    </div>
  );
};

export default LiveActivity;
