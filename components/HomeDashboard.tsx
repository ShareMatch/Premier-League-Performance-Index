import React, { useMemo } from 'react';
import { ArrowRight, TrendingUp, Shield, Car, Trophy } from 'lucide-react';
import { EPL_TEAMS, UCL_TEAMS, SPL_TEAMS, F1_TEAMS, WC_TEAMS } from '../data/marketData';
import NewsFeed from './NewsFeed';
import type { Team } from '../types';

interface HomeDashboardProps {
    onNavigate: (league: 'EPL' | 'UCL' | 'WC' | 'SPL' | 'F1') => void;
}

const HomeDashboard: React.FC<HomeDashboardProps> = ({ onNavigate }) => {

    const marketPreviews = useMemo(() => {
        const markets = [
            { id: 'EPL', name: 'Premier League', teams: EPL_TEAMS },
            { id: 'UCL', name: 'Champions League', teams: UCL_TEAMS },
            { id: 'SPL', name: 'Saudi Pro League', teams: SPL_TEAMS },
            { id: 'F1', name: 'Formula 1', teams: F1_TEAMS },
            { id: 'WC', name: 'World Cup', teams: WC_TEAMS },
        ];

        // Randomly select 3 markets
        const shuffled = [...markets].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, 3);
    }, []);

    const getIcon = (team: Team) => {
        switch (team.category) {
            case 'f1': return <Car className="w-4 h-4" style={{ color: team.color }} />;
            case 'football': return <Shield className="w-4 h-4" style={{ color: team.color }} />;
            default: return <Trophy className="w-4 h-4" style={{ color: team.color || '#6B7280' }} />;
        }
    };

    return (
        <div className="flex flex-col gap-6 h-full">
            {/* Top Section: News Feed */}
            <div className="flex-shrink-0">
                <NewsFeed topic="Global" />
            </div>

            {/* Bottom Section: Market Previews */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1 min-h-0">
                {marketPreviews.map((market) => (
                    <div
                        key={market.id}
                        onClick={() => onNavigate(market.id as any)}
                        className="bg-gray-800 rounded-xl border border-gray-700 p-4 cursor-pointer hover:border-[#3AA189] hover:shadow-lg hover:shadow-[#3AA189]/10 transition-all group flex flex-col h-full"
                    >
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-gray-200 group-hover:text-[#3AA189] transition-colors">
                                {market.name}
                            </h3>
                            <ArrowRight className="w-4 h-4 text-gray-500 group-hover:text-[#3AA189] transition-colors" />
                        </div>

                        <div className="space-y-3 flex-1 overflow-hidden">
                            {market.teams.slice(0, 3).map((team) => (
                                <div key={team.id} className="flex justify-between items-center bg-gray-900/50 p-2 rounded border border-gray-800">
                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                        {getIcon(team)}
                                        <span className="text-sm text-gray-300 truncate">{team.name}</span>
                                    </div>
                                    <div className="flex items-center gap-2 ml-2">
                                        <span className="text-xs font-mono text-[#3AA189]">{team.offer.toFixed(1)}%</span>
                                        <TrendingUp className="w-3 h-3 text-gray-600" />
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="mt-4 text-center">
                            <span className="text-xs text-gray-500 group-hover:text-gray-300 transition-colors">View Full Market</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default HomeDashboard;
