import React from 'react';
import { ArrowUp, ArrowDown, Star } from 'lucide-react';
import { useFavorites } from '../hooks/useFavorites';
import { formatCurrency } from '../utils/currencyUtils';

interface Trade {
    id: string;
    price: number;
    volume: number;
    side: 'buy' | 'sell' | string;
    time: string;
    total: number;
}

interface TradeHistoryListProps {
    trades: Trade[];
    assetName: string;
    assetId: string; // Added assetId prop
    assetLogo?: string;
}

const TradeHistoryList: React.FC<TradeHistoryListProps> = ({ trades, assetName, assetId, assetLogo }) => {
    const { favorites, toggleFavorite } = useFavorites();
    const isInWatchlist = favorites.includes(assetId);

    return (
        <div className="bg-[#02060a] rounded-xl border border-gray-800 flex flex-col h-[400px]">
            <div className="p-4 border-b border-gray-800 bg-[#0B1221] flex items-center justify-between gap-2">
                <div className="flex items-center gap-[clamp(0.5rem,2vw,0.75rem)] min-w-0">
                    {/* Avatar Block */}
                    {assetLogo && (
                        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gray-700/50 flex items-center justify-center overflow-hidden border border-gray-600/30">
                            <img
                                src={assetLogo}
                                alt={assetName}
                                className="w-full h-full object-contain"
                            />
                        </div>
                    )}

                    <div className="min-w-0">
                        <h3 className="text-white font-bold text-[clamp(0.75rem,2vw,0.875rem)] truncate">
                            Market History
                        </h3>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-3 bg-gray-900/50 text-[clamp(0.55rem,1.5vw,0.625rem)] text-gray-500 font-medium py-2 px-4 uppercase tracking-wider">
                <div className="text-left">Price</div>
                <div className="text-right">Volume</div>
                <div className="text-right whitespace-nowrap">Time</div>
            </div>

            <div className="overflow-y-auto flex-1 scrollbar-hide">
                {trades.map((trade) => {
                    const isBuy = trade.side === 'buy';
                    return (
                        <div key={trade.id} className="grid grid-cols-3 py-2 px-4 text-[clamp(0.65rem,1.5vw,0.75rem)] border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                            <div className={`font-mono font-medium ${isBuy ? 'text-brand-emerald400' : 'text-rose-400'}`}>
                                {formatCurrency(trade.price)}
                            </div>
                            <div className="text-right text-gray-300 font-mono">
                                {trade.volume.toLocaleString()}
                            </div>
                            <div className="text-right text-gray-500 text-[clamp(0.55rem,1.5vw,0.625rem)] flex items-center justify-end gap-1">
                                {trade.time}
                            </div>
                        </div>
                    )
                })}
            </div>

            <div className="p-3 border-t border-gray-800 bg-[#0B1221] text-[clamp(0.55rem,1.5vw,0.625rem)] text-gray-400 flex justify-between items-center">
                <span>Last Traded</span>
                <span className="text-[clamp(1rem,3vw,1.125rem)] font-bold text-white font-mono">
                    {formatCurrency(trades[0]?.price || 0)}
                </span>
            </div>
        </div>
    );
};

export default TradeHistoryList;
