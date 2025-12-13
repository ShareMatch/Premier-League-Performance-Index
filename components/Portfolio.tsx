import React, { useMemo } from 'react';
import type { Position, Team } from '../types';

interface PortfolioProps {
    portfolio: Position[];
    allAssets: Team[];
    onNavigate: (league: 'EPL' | 'UCL' | 'WC' | 'SPL' | 'F1') => void;
}

const Portfolio: React.FC<PortfolioProps> = ({ portfolio, allAssets, onNavigate }) => {

    const getMarketName = (market: string): string => {
        const marketNames: Record<string, string> = {
            'EPL': 'Premier League',
            'UCL': 'Champions League',
            'WC': 'World Cup',
            'SPL': 'Saudi Pro League',
            'F1': 'Formula 1'
        };
        return marketNames[market] || market;
    };

    const holdings = useMemo(() => {
        return portfolio.map((position) => {
            // Find the asset from allAssets to get current price and market info
            const asset = allAssets.find(a => a.id.toString() === position.asset_id);

            return {
                ...position,
                asset: asset,
                currentPrice: asset?.bid || 0,
                market: asset?.market || 'Unknown'
            };
        }).filter(h => h.quantity > 0);
    }, [portfolio, allAssets]);

    const handleRowClick = (market: string) => {
        if (market && market !== 'Unknown') {
            onNavigate(market as any);
        }
    };

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
                <div
                    key={holding.id}
                    className="bg-gray-800/50 p-3 rounded border border-gray-700 flex justify-between items-center cursor-pointer hover:bg-gray-700/50 transition-colors"
                    onClick={() => handleRowClick(holding.market)}
                    role="button"
                    tabIndex={0}
                >
                    <div>
                        <div className="font-medium text-gray-200 text-sm">{holding.asset_name}</div>
                        <div className="text-xs text-gray-500">{holding.quantity} units</div>
                        <div className="text-[10px] bg-[#005430] text-white px-1.5 rounded inline-block mt-1">{getMarketName(holding.market)}</div>
                    </div>
                    <div className="text-right">
                        <div className="text-sm bg-[#005430] text-white px-2 py-0.5 rounded font-bold inline-block">
                            ${(holding.quantity * holding.currentPrice).toFixed(2)}
                        </div>
                        <div className="text-[10px] text-gray-500">
                            @ ${holding.currentPrice.toFixed(1)}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default Portfolio;
