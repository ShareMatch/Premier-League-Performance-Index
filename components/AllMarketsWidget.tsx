import React, { useMemo } from "react";
import { Team, League } from "../types";
import { ChevronRight, Globe } from "lucide-react";
import { FaCaretDown } from "react-icons/fa";
import { FaCaretUp } from "react-icons/fa6";
import { isMarketOpen } from "../utils/marketUtils";

interface AllMarketsWidgetProps {
  teams: Team[];
  onNavigate: (league: League) => void;
  onViewAsset?: (asset: Team) => void;
  onSelectOrder?: (team: Team, type: "buy" | "sell") => void;
}

// Active markets that should be shown (exclude coming soon / hidden markets)
// Derived dynamically from open markets below

const AllMarketsWidget: React.FC<AllMarketsWidgetProps> = ({
  teams,
  onNavigate,
  onViewAsset,
  onSelectOrder,
}) => {
  // Randomly select 3 teams to display from open/active markets only
  const displayTeams = useMemo(() => {
    // Filter to only active, non-settled assets from open markets
    const activeTeams = teams.filter(
      (team) =>
        !team.is_settled &&
        isMarketOpen(team).isOpen &&
        team.market &&
        team.market !== "Eurovision" &&
        team.category !== "global_events"
    );

    if (activeTeams.length <= 3) return activeTeams;

    // Fisher-Yates shuffle on a copy, then take first 3
    const shuffled = [...activeTeams];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled.slice(0, 3);
  }, [teams]);

  const handleViewAll = () => {
    onNavigate("ALL_MARKETS");
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Widget Header */}
      <div className="flex items-center justify-between px-1">
        <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
          <Globe className="w-4 h-4 sm:w-5 sm:h-5 text-green-500" />
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
            All Index Tokens
          </span>
        </h2>

        <button
          onClick={handleViewAll}
          className="text-xs font-medium text-brand-primary hover:text-brand-primary/80 transition-colors flex items-center gap-1 self-center mt-3"
        >
          View All <ChevronRight className="w-3 h-3" />
        </button>
      </div>

      {/* Rows */}
      <div className="flex flex-col gap-2">
        {teams.length === 0 ? (
          // Skeleton Loading for Widget
          [1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex items-center justify-between p-3 rounded-xl bg-gray-800/20 border border-gray-700/30 animate-pulse h-[66px]"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gray-800/50" />
                <div className="flex flex-col gap-2">
                  <div className="h-4 w-24 bg-gray-800/50 rounded" />
                  <div className="h-3 w-12 bg-gray-800/50 rounded" />
                </div>
              </div>
              <div className="flex gap-4">
                <div className="h-8 w-16 bg-gray-800/50 rounded" />
                <div className="h-8 w-16 bg-gray-800/50 rounded" />
              </div>
            </div>
          ))
        ) : (
          displayTeams.map((team) => {
            // Mock change data
            const isPositive = Math.random() > 0.5;

            return (
              <div
                key={team.id}
                onClick={() => onViewAsset && onViewAsset(team)}
                className="flex items-center justify-between p-3 rounded-xl bg-gray-800/40 border border-gray-700/50 hover:border-brand-primary/50 cursor-pointer backdrop-blur-sm transition-all group"
              >
                {/* Left: Asset Info */}
                <div className="flex items-center gap-3">
                  {/* Logo */}
                  <div className="w-10 h-10 rounded-lg bg-gray-900/50 p-1.5 flex items-center justify-center border border-gray-700/50 group-hover:border-brand-primary/30 transition-colors">
                    {team.logo_url ? (
                      <img
                        src={team.logo_url}
                        alt={team.name}
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <div className="text-xs font-bold text-gray-500">
                        {team.name.substring(0, 2)}
                      </div>
                    )}
                  </div>

                  {/* Name & Market */}
                  <div className="flex flex-col min-w-0">
                    <span className="text-[clamp(0.75rem,2.5vw,0.875rem)] font-bold text-gray-200 group-hover:text-brand-primary transition-colors leading-tight truncate">
                      {team.name}
                    </span>
                    <span className="text-[10px] text-gray-500 font-medium">
                      {team.market || "Unknown"}
                    </span>
                  </div>
                </div>

                {/* Right: Pricing (Ticker Style) - Responsive with clamp */}
                <div className="flex items-center gap-[clamp(0.4rem,2vw,1.5rem)] ml-1">
                  {/* Sell Section */}
                  <div className="flex items-center gap-[clamp(0.15rem,0.5vw,0.375rem)] w-[clamp(65px,14vw,120px)] justify-end">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onSelectOrder) onSelectOrder(team, "sell");
                      }}
                      className="bg-red-900/30 hover:bg-red-900/50 text-red-400 text-[clamp(0.55rem,0.8vw,0.75rem)] font-bold px-[clamp(0.25rem,0.6vw,0.625rem)] py-[clamp(0.125rem,0.3vw,0.375rem)] rounded transition-all uppercase tracking-wider shrink-0"
                    >
                      Sell
                    </button>
                    <span className="text-[clamp(0.7rem,1.1vw,0.875rem)] font-bold text-gray-200 min-w-[clamp(35px,8vw,65px)] text-right">
                      ${team.bid.toFixed(2)}
                    </span>
                  </div>

                  {/* Buy Section */}
                  <div className="flex items-center gap-[clamp(0.15rem,0.5vw,0.375rem)] w-[clamp(65px,14vw,120px)] justify-end">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onSelectOrder) onSelectOrder(team, "buy");
                      }}
                      className="bg-[#005430] hover:bg-[#006035] text-white text-[clamp(0.55rem,0.8vw,0.75rem)] font-bold px-[clamp(0.25rem,0.6vw,0.625rem)] py-[clamp(0.125rem,0.3vw,0.375rem)] rounded transition-all shadow-sm uppercase tracking-wider shrink-0"
                    >
                      Buy
                    </button>
                    <span className="text-[clamp(0.7rem,1.1vw,0.875rem)] font-bold text-gray-200 min-w-[clamp(35px,8vw,65px)] text-right">
                      ${team.offer.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default AllMarketsWidget;
