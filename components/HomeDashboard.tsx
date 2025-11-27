import React from 'react';
import NewsFeed from './NewsFeed';
import HotQuestions from './HotQuestions';
import type { Team } from '../types';

interface HomeDashboardProps {
    onNavigate: (league: 'EPL' | 'UCL' | 'WC' | 'SPL' | 'F1') => void;
    teams: Team[];
}

const HomeDashboard: React.FC<HomeDashboardProps> = ({ onNavigate, teams }) => {
    return (
        <div className="flex flex-col gap-8 h-full">
            {/* Top Section: Hot Questions */}
            <div className="flex-shrink-0">
                <HotQuestions teams={teams} onNavigate={onNavigate} />
            </div>

            {/* Bottom Section: News Feed */}
            <div className="flex-1 min-h-0 flex flex-col">
                <div className="mb-4">
                    <h2 className="text-xl font-bold text-gray-200">Global Sports Wire</h2>
                </div>
                <div className="flex-1 overflow-hidden">
                    <NewsFeed topic="Global" />
                </div>
            </div>
        </div>
    );
};

export default HomeDashboard;
