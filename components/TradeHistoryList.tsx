import React from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';

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
}

const TradeHistoryList: React.FC<TradeHistoryListProps> = ({ trades, assetName }) => {
    return (
        <div className="bg-[#02060a] rounded-xl border border-gray-800 flex flex-col h-[400px]">
            <div className="p-4 border-b border-gray-800 bg-[#0B1221]">
                <h3 className="text-white font-bold text-sm">
                    Price, Available and Traded
                </h3>
                <div className="mt-2 text-xs text-brand-emerald500 bg-[#005430]/10 border border-[#005430]/30 px-2 py-1 rounded w-fit">
                    {assetName}
                </div>
            </div>

            <div className="grid grid-cols-3 bg-gray-900/50 text-[10px] text-gray-500 font-medium py-2 px-4 uppercase tracking-wider">
                <div className="text-left">Price</div>
                <div className="text-right">Volume</div>
                <div className="text-right">Time</div>
            </div>

            <div className="overflow-y-auto flex-1 scrollbar-hide">
                {trades.map((trade) => {
                    const isBuy = trade.side === 'buy';
                    return (
                        <div key={trade.id} className="grid grid-cols-3 py-2 px-4 text-xs border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                            <div className={`font-mono font-medium ${isBuy ? 'text-brand-emerald400' : 'text-rose-400'}`}>
                                {trade.price.toFixed(2)}
                            </div>
                            <div className="text-right text-gray-300 font-mono">
                                {trade.volume.toLocaleString()}
                            </div>
                            <div className="text-right text-gray-500 text-[10px] flex items-center justify-end gap-1">
                                {trade.time}
                            </div>
                        </div>
                    )
                })}
            </div>

            <div className="p-3 border-t border-gray-800 bg-[#0B1221] text-[10px] text-gray-400 flex justify-between items-center">
                <span>Last Traded Price</span>
                <span className="text-lg font-bold text-white font-mono">
                    {trades[0]?.price.toFixed(2) || '0.00'}
                </span>
            </div>
        </div>
    );
};

export default TradeHistoryList;
