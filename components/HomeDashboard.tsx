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
import { ChevronRight } from "lucide-react";

interface HomeDashboardProps {
    onNavigate: (league: League) => void;
    teams: Team[];
    onViewAsset?: (asset: Team) => void;
    onSelectOrder?: (team: Team, type: 'buy' | 'sell') => void;
    seasonDatesMap?: Map<string, SeasonDates>;
}

const HomeDashboard: React.FC<HomeDashboardProps> = ({
    onNavigate,
    teams,
    onViewAsset,
    onSelectOrder,
    seasonDatesMap,
}) => {
    return (
        <div
            data-testid="home-dashboard"
            className="flex flex-col gap-8 h-full overflow-y-auto pb-8 scrollbar-hide"
        >
            {/* Main Content with Consistent Spacing */}
            <div className="flex-shrink-0 space-y-6">
                <TrendingCarousel
                    teams={teams}
                    seasonDatesMap={seasonDatesMap}
                    onViewAsset={onViewAsset}
                    onSelectOrder={onSelectOrder}
                    onNavigate={onNavigate}
                />

                <div className="space-y-2">
                    <HotQuestions
                        teams={teams}
                        onNavigate={onNavigate}
                        onViewAsset={onViewAsset}
                        onSelectOrder={onSelectOrder}
                        seasonDatesMap={seasonDatesMap}
                    />
                </div>

                <RecentlyViewed onNavigate={onNavigate} onViewAsset={onViewAsset} />

                <AllMarketsWidget
                    teams={teams}
                    onNavigate={onNavigate}
                    onViewAsset={onViewAsset}
                    onSelectOrder={onSelectOrder}
                />
            </div>
            <div className="flex-shrink-0"></div>

            <div className="flex-shrink-0"></div>

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
