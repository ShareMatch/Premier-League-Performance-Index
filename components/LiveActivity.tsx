import React, { useState } from "react";
import { Zap } from "lucide-react";
import { getLogoUrl } from "../lib/logoHelper";

interface ActivityItem {
  id?: string;
  asset: string;
  index: string;
  action: "bought" | "sold";
  amount: number;
  market: string;
}

const LiveActivity: React.FC = () => {
  // Mock data - in real app, this could come from props or API
  const activities: ActivityItem[] = [
    {
      id: "fc930f1a-e696-4c80-9dbc-c533e4931139",
      asset: "Man City",
      index: "EPL",
      action: "bought",
      amount: 450,
      market: "EPL",
    },
    {
      id: "f2c44ef3-bc93-47f3-920a-73e1a4532a7e",
      asset: "Max Verstappen",
      index: "F1",
      action: "sold",
      amount: 320,
      market: "F1",
    },
    {
      id: "0f806aba-7f39-4c99-9985-2fe1eb41d0a3",
      asset: "Liverpool",
      index: "EPL",
      action: "bought",
      amount: 280,
      market: "EPL",
    },
    {
      id: "a477278d-9472-409d-a70e-f50c62cbea96",
      asset: "Lando Norris",
      index: "F1",
      action: "bought",
      amount: 195,
      market: "F1",
    },
    {
      id: "b4fb76da-527d-4e90-a407-8f2d933e599d",
      asset: "Real Madrid",
      index: "UCL",
      action: "sold",
      amount: 510,
      market: "UCL",
    },
    {
      id: "13ee2ab2-2134-40bf-82e2-9a33e33affe1",
      asset: "Arsenal",
      index: "EPL",
      action: "bought",
      amount: 340,
      market: "EPL",
    },
    {
      id: "d897be8a-2792-4d02-9725-1b6b29c3d446",
      asset: "Al-Nassr",
      index: "SPL",
      action: "bought",
      amount: 220,
      market: "SPL",
    },
    {
      id: "15a18ded-c77c-468f-bb8a-18a483118dce",
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
          const logoUrl = getLogoUrl(activity.asset, activity.market, activity.id) || null;
          return (
            <div
              key={i}
              className="px-4 py-3 hover:bg-gray-800/50 transition-colors cursor-pointer group"
            >
              <div className="flex items-start gap-3">
                {/* Asset Logo/Avatar */}
                <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center mt-0.5">
                  {logoUrl ? (
                    <img
                      src={logoUrl}
                      alt={`${activity.asset} logo`}
                      className="w-full h-full object-contain rounded-full"
                    />
                  ) : (
                    <div className="w-full h-full rounded-full bg-gray-700/50 flex items-center justify-center border border-gray-600/30">
                      <span className="text-xs font-bold text-gray-400">
                        {activity.asset.charAt(0)}
                      </span>
                    </div>
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
          className="text-xs text-gray-400 hover:text-white transition-colors w-full flex items-center justify-center gap-1.5 font-medium group"
        >
          <span>{expanded ? "View Less" : "View All Activity"}</span>
          <svg
            className={`w-3 h-3 transition-transform duration-300 ${expanded ? "rotate-180" : ""
              }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default LiveActivity;
