import React from "react";
import { Team, League } from "../types";
import { ArrowLeft, TrendingUp, Zap } from "lucide-react";
import { SeasonDates } from "../lib/api";
import HotQuestions from "./HotQuestions";

interface NewMarketsPageProps {
  teams: Team[];
  onNavigate: (league: League) => void;
  onViewAsset: (asset: Team) => void;
  onSelectOrder?: (team: Team, type: "buy" | "sell") => void;
  seasonDatesMap?: Map<string, SeasonDates>;
}

const NewMarketsPage: React.FC<NewMarketsPageProps> = ({
  teams,
  onNavigate,
  onViewAsset,
  onSelectOrder,
  seasonDatesMap,
}) => {
  // No extra loading state needed, HotQuestions handles its own skeleton if needed via props or check
  // Actually, user wants no loader delay here, so we just remove the state logic that forced a delay.
  // If the data (teams) is not ready, HotQuestions will show partial or empty.
  // But usually App.tsx passes `allAssets` which might be waiting.
  // However, HotQuestions doesn't have internal loading logic unless we pass `isLoading`.
  // We will just pass `isLoading={false}` or let it derive.
  // Let's check `App.tsx`... `teams` are passed. Usually `App` handles initial data fetch loader.
  // The previous implementation added an artificial 600ms delay. We remove that.

  return (
    <div className="h-full flex flex-col bg-gray-900 text-white overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-800 flex items-center justify-between sticky top-0 bg-gray-900 z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate("HOME")}
            className="p-1 rounded-full hover:bg-gray-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-400" />
          </button>
          <div className="flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-green-500" />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                Trending Markets
              </span>
              <Zap
                className="w-3 h-3 text-yellow-400 animate-pulse ml-1"
                fill="currentColor"
              />
            </h2>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 scrollbar-hide">
        <HotQuestions
          teams={teams}
          onNavigate={onNavigate}
          onViewAsset={onViewAsset}
          onSelectOrder={onSelectOrder}
          seasonDatesMap={seasonDatesMap}
          limit={0} // Show all
          showHeader={false}
          enableAnimation={false}
          isLoading={false}
        />
      </div>
    </div>
  );
};

export default NewMarketsPage;
