import React from 'react';
import NewsFeed from './NewsFeed';
import HotQuestions from './HotQuestions';
import type { Team, League } from '../types';

interface HomeDashboardProps {
    onNavigate: (league: League) => void;
    teams: Team[];
    onViewAsset?: (asset: Team) => void;
}

const HomeDashboard: React.FC<HomeDashboardProps> = ({ onNavigate, teams, onViewAsset }) => {
    return (
        <div className="flex flex-col gap-8 h-full overflow-y-auto pb-8 scrollbar-hide">
            {/* Top Section: Hot Questions */}
            <div className="flex-shrink-0">
                <HotQuestions teams={teams} onNavigate={onNavigate} />
            </div>

            {/* Bottom Section: News Feed */}
            <div className="flex-shrink-0">
                <div className="mb-4">
                    <h2 className="text-xl font-bold text-gray-200">ShareMatch News Wire</h2>
                </div>
                <NewsFeed topic="Global" showHeader={false} />
            </div>
        </div>
    );
};

export default HomeDashboard;
