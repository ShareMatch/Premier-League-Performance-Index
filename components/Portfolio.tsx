import React, { useMemo } from 'react';
import { EPL_TEAMS, UCL_TEAMS, SPL_TEAMS, F1_TEAMS, WC_TEAMS } from '../data/marketData';
import type { Position } from '../types';

interface PortfolioProps {
    portfolio: Position[];
}

const Portfolio: React.FC<PortfolioProps> = ({ portfolio }) => {

    const allTeams = useMemo(() => {
        return [...EPL_TEAMS, ...UCL_TEAMS, ...SPL_TEAMS, ...F1_TEAMS, ...WC_TEAMS];
    }, []);

    const holdings = useMemo(() => {
        return portfolio.map((position) => {
            // Try to find team by ID (if asset_id matches team ID)
            // Or by name?
            // asset_id in DB is text.
            const teamId = parseInt(position.asset_id);
            const team = allTeams.find(t => t.id === teamId);

            return {
                ...position,
                team: team || { name: position.asset_name, bid: 0, offer: 0, id: -1 } // Fallback if team not found in static data
            };
        }).filter(h => h.quantity > 0);
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
            {holdings.map((holding) => (
                <div key={holding.id} className="bg-gray-800/50 p-3 rounded border border-gray-700 flex justify-between items-center">
                    <div>
                        <div className="font-medium text-gray-200 text-sm">{holding.asset_name}</div>
                        <div className="text-xs text-gray-500">{holding.quantity} units</div>
                    </div>
                    <div className="text-right">
                        <div className="text-sm font-mono text-[#3AA189]">
                            ${(holding.quantity * (holding.team?.bid || 0)).toFixed(2)}
                        </div>
                        <div className="text-[10px] text-gray-500">
                            @ {holding.team?.bid}%
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default Portfolio;
