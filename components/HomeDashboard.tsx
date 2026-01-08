import React from "react";
import NewsFeed from "./NewsFeed";
import HotQuestions from "./HotQuestions";
import type { Team, League } from "../types";
import type { SeasonDates } from "../lib/api";
// import LiveActivity from "./LiveActivity";
import TopPerformers from "./TopPerformers";
import TrendingCarousel from "./TrendingCarousel";
import RecentlyViewed from "./RecentlyViewed";
import AllMarketsWidget from "./AllMarketsWidget";


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
      {/* Top Section: Trending Markets */}
      <div className="flex-shrink-0">
        <TrendingCarousel teams={teams} seasonDatesMap={seasonDatesMap} />
      </div>

      <div className="flex-shrink-0">
        <HotQuestions
          teams={teams}
          onNavigate={onNavigate}
          seasonDatesMap={seasonDatesMap}
        />
      </div>

      <div className="flex-shrink-0">
        <RecentlyViewed onNavigate={onNavigate} onViewAsset={onViewAsset} />
      </div>

      <div className="flex-shrink-0">
        <AllMarketsWidget
          teams={teams}
          onNavigate={onNavigate}
          onViewAsset={onViewAsset}
        />
      </div>

      {/* LiveActivity replaced by RecentlyViewed as per user request */}
      {/* <div className="flex-shrink-0">
        <LiveActivity />
      </div> */}

      {/* <div className="flex-shrink-0">
        <TopPerformers onNavigate={onNavigate} />
      </div> */}
    </div>
  );
};

export default HomeDashboard;
