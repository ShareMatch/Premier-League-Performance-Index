import React from "react";
import NewsFeed from "./NewsFeed";
import HotQuestions from "./HotQuestions";
import type { Team, League } from "../types";
import type { SeasonDates } from "../lib/api";
import LiveActivity from "./LiveActivity";
import TopPerformers from "./TopPerformers";

interface HomeDashboardProps {
  onNavigate: (league: League) => void;
  teams: Team[];
  onViewAsset?: (asset: Team) => void;
  seasonDatesMap?: Map<string, SeasonDates>;
}

const HomeDashboard: React.FC<HomeDashboardProps> = ({
  onNavigate,
  teams,
  onViewAsset,
  seasonDatesMap,
}) => {
  return (
    <div
      data-testid="home-dashboard"
      className="flex flex-col gap-8 h-full overflow-y-auto pb-8 scrollbar-hide"
    >
      {/* Top Section: Hot Questions */}
      <div className="flex-shrink-0">
        <HotQuestions
          teams={teams}
          onNavigate={onNavigate}
          seasonDatesMap={seasonDatesMap}
        />
      </div>

      {/* Bottom Section: News Feed */}
      <div className="flex-shrink-0">
        <LiveActivity />
      </div>
      <div className="flex-shrink-0">
        <TopPerformers onNavigate={onNavigate} />
      </div>
    </div>
  );
};

export default HomeDashboard;
