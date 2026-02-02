import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { FaCaretDown } from "react-icons/fa";
import { FaCaretUp } from "react-icons/fa6";
import { Team, League } from "../types";
import { getMarketInfo } from "../lib/marketInfo";
import type { SeasonDates } from "../lib/api";

interface TickerProps {
  onNavigate: (league: League) => void;
  onViewAsset?: (asset: Team) => void;
  teams: Team[];
  seasonDatesMap?: Map<string, SeasonDates>;
}

const Ticker: React.FC<TickerProps> = ({ onNavigate, onViewAsset, teams, seasonDatesMap }) => {
  const navigate = useNavigate();
  const tickerItems = useMemo(() => {
    // Filter out teams from closed markets using dynamic season data
    const activeTeams = teams.filter((t) => {
      const market = t.market || t.index_token;
      if (!market) return false;

      const seasonData = seasonDatesMap?.get(market);
      const marketInfo = getMarketInfo(
        market,
        seasonData?.start_date,
        seasonData?.end_date,
        seasonData?.stage || undefined,
        t.index_name
      );
      return marketInfo.isOpen;
    });

    // Group teams by market
    const marketGroups: { [key: string]: Team[] } = {};
    activeTeams.forEach((t) => {
      const m = t.market || t.index_token || "Unknown";
      if (!marketGroups[m]) marketGroups[m] = [];
      marketGroups[m].push(t);
    });

    // Shuffle within groups
    Object.keys(marketGroups).forEach((k) => {
      marketGroups[k] = marketGroups[k].sort(() => 0.5 - Math.random());
    });

    const result: Team[] = [];
    const markets = Object.keys(marketGroups);
    let active = true;

    // Round robin selection to avoid consecutive same-market items
    while (result.length < 20 && active) {
      active = false;
      for (const m of markets) {
        if (marketGroups[m].length > 0) {
          result.push(marketGroups[m].pop()!);
          active = true;
          if (result.length >= 20) break;
        }
      }
    }

    return result.map((t) => ({
      team: t,
      action: Math.random() > 0.5 ? "buy" : ("sell" as "buy" | "sell"),
    }));
  }, [teams, seasonDatesMap]);

  const handleItemClick = (team: Team) => {
    if (onViewAsset) {
      onViewAsset(team);
      return;
    }

    // Use market token from database - no ID-based fallback needed
    const market = team.market || team.index_token;
    if (market) {
      navigate(`/market/${market}`);
      onNavigate?.(market as League);
    }
  };

  return (
    <div className="bg-gray-900 border-t border-gray-800 h-10 flex items-center overflow-x-auto overflow-y-hidden whitespace-nowrap relative z-10 scrollbar-hide">
      <div className="animate-ticker flex items-center gap-8 px-4">
        {[...tickerItems, ...tickerItems].map(
          (
            { team, action },
            index, // Duplicate for seamless loop
          ) => (
            <div
              key={`${team.id}-${index}`}
              className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-800 px-2 py-1 rounded transition-colors flex-shrink-0"
              onClick={() => handleItemClick(team)}
            >
              {team.logo_url && (
                <img
                  src={team.logo_url}
                  alt={team.name}
                  className="w-6 h-6 object-contain"
                />
              )}
              <span className="font-bold text-gray-300">{team.name}</span>
              {action === "buy" ? (
                <>
                  <span className="text-gray-400 font-medium text-xs text-emerald-500">
                    Buy
                  </span>
                  <span className="text-gray-400">
                    ${team.offer.toFixed(1)}
                  </span>
                  <FaCaretUp className="w-3 h-3 text-emerald-500" />
                </>
              ) : (
                <>
                  <span className="text-gray-400 font-medium text-xs text-red-500">
                    Sell
                  </span>
                  <span className="text-gray-400">${team.bid.toFixed(1)}</span>
                  <FaCaretDown className="w-3 h-3 text-red-500" />
                </>
              )}
            </div>
          ),
        )}
      </div>
      <style>{`
        @keyframes ticker {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-ticker {
          animation: ticker 60s linear infinite;
        }
        .animate-ticker:hover {
          animation-play-state: paused;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
};

export default Ticker;
