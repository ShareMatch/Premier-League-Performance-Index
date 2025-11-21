import React, { useMemo } from 'react';
import { EPL_TEAMS, UCL_TEAMS, SPL_TEAMS, F1_TEAMS, WC_TEAMS } from '../data/marketData';
import type { Team } from '../types';

interface PortfolioProps {
    portfolio: Record<number, number>;
}

const Portfolio: React.FC<PortfolioProps> = ({ portfolio }) => {

    const allTeams = useMemo(() => {
        return [...EPL_TEAMS, ...UCL_TEAMS, ...SPL_TEAMS, ...F1_TEAMS, ...WC_TEAMS];
    }, []);

    const holdings = useMemo(() => {
        return Object.entries(portfolio).map(([idStr, quantity]) => {
            const id = parseInt(idStr);
            const team = allTeams.find(t => t.id === id);
            return {
                id,
                quantity,
                team
            };
        }).filter(h => h.team && h.quantity > 0);
    }, [portfolio, allTeams]);

    if (holdings.length === 0) {
        return (
            <div className="text-center text-gray-500 py-8 text-sm">
                No active positions
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {holdings.map(({ id, quantity, team }) => (
                <div key={id} className="bg-gray-800/50 p-3 rounded border border-gray-700 flex justify-between items-center">
                    <div>
                        <div className="font-medium text-gray-200 text-sm">{team?.name}</div>
                        <div className="text-xs text-gray-500">{quantity} units</div>
                    </div>
                    <div className="text-right">
                        <div className="text-sm font-mono text-[#3AA189]">
                            ${(quantity * (team?.bid || 0)).toFixed(2)}
                        </div>
                        <div className="text-[10px] text-gray-500">
                            @ {team?.bid}%
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default Portfolio;
