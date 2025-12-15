import React, { useMemo } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Team, League } from '../types';
import { marketInfoData } from '../lib/marketInfo';

interface TickerProps {
    onNavigate: (league: League) => void;
    teams: Team[];
}

const Ticker: React.FC<TickerProps> = ({ onNavigate, teams }) => {
    const tickerItems = useMemo(() => {
        // Filter out teams from closed markets
        const activeTeams = teams.filter(t => {
            const marketInfo = marketInfoData[t.market || 'Unknown'];
            return marketInfo && marketInfo.isOpen;
        });

        // Group teams by market
        const marketGroups: { [key: string]: Team[] } = {};
        activeTeams.forEach(t => {
            const m = t.market || 'Unknown';
            if (!marketGroups[m]) marketGroups[m] = [];
            marketGroups[m].push(t);
        });

        // Shuffle within groups
        Object.keys(marketGroups).forEach(k => {
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

        return result;
    }, [teams]);

    const handleItemClick = (team: Team) => {
        // Determine league based on market field or ID ranges
        if (team.market) {
            onNavigate(team.market as any);
        } else {
            // Fallback to ID-based detection
            if (team.id >= 1 && team.id <= 100) onNavigate('EPL');
            else if (team.id >= 101 && team.id <= 200) onNavigate('UCL');
            else if (team.id >= 201 && team.id <= 300) onNavigate('WC');
            else if (team.id >= 301 && team.id <= 400) onNavigate('SPL');
            else if (team.id >= 401 && team.id <= 500) onNavigate('F1');
        }
    };

    return (
        <div className="bg-gray-900 border-t border-gray-800 h-10 flex items-center overflow-x-auto overflow-y-hidden whitespace-nowrap relative z-50 scrollbar-hide">
            <div className="animate-ticker flex items-center gap-8 px-4">
                {[...tickerItems, ...tickerItems].map((team, index) => ( // Duplicate for seamless loop
                    <div
                        key={`${team.id}-${index}`}
                        className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-800 px-2 py-1 rounded transition-colors flex-shrink-0"
                        onClick={() => handleItemClick(team)}
                    >
                        <span className="font-bold text-gray-300">{team.name}</span>
                        <span className="text-gray-400 font-medium text-xs text-emerald-500">Buy</span>
                        <span className="text-gray-400">${team.offer.toFixed(1)}</span>
                        {team.lastChange === 'up' ? (
                            <TrendingUp className="w-3 h-3 text-[#005430]" />
                        ) : team.lastChange === 'down' ? (
                            <TrendingDown className="w-3 h-3 text-red-500" />
                        ) : (
                            <Minus className="w-3 h-3 text-gray-600" />
                        )}
                    </div>
                ))}
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
