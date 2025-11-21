import React, { useMemo } from 'react';
import { EPL_TEAMS, UCL_TEAMS, SPL_TEAMS, F1_TEAMS, WC_TEAMS } from '../data/marketData';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

const Ticker: React.FC = () => {
    const tickerItems = useMemo(() => {
        const allTeams = [...EPL_TEAMS, ...UCL_TEAMS, ...SPL_TEAMS, ...F1_TEAMS, ...WC_TEAMS];
        // Shuffle and pick 20 items
        return allTeams.sort(() => 0.5 - Math.random()).slice(0, 20);
    }, []);

    return (
        <div className="bg-gray-900 border-t border-gray-800 h-10 flex items-center overflow-hidden whitespace-nowrap relative z-50">
            <div className="animate-ticker flex items-center gap-8 px-4">
                {[...tickerItems, ...tickerItems].map((team, index) => ( // Duplicate for seamless loop
                    <div key={`${team.id}-${index}`} className="flex items-center gap-2 text-sm">
                        <span className="font-bold text-gray-300">{team.name}</span>
                        <span className="text-gray-400">{team.bid.toFixed(1)}</span>
                        {team.lastChange === 'up' ? (
                            <TrendingUp className="w-3 h-3 text-[#3AA189]" />
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
      `}</style>
        </div>
    );
};

export default Ticker;
