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
    assetLogo?: string;
}

const TradeHistoryList: React.FC<TradeHistoryListProps> = ({ trades, assetName, assetLogo }) => {
    return (
        <div className="bg-[#02060a] rounded-xl border border-gray-800 flex flex-col h-[400px]">
            <div className="p-4 border-b border-gray-800 bg-[#0B1221] flex items-center gap-3">
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
                
                <div>
                    <h3 className="text-white font-bold text-sm">
                        Asset Marketplace History
                    </h3>
                    <div className="mt-1 text-xs text-white bg-[#005430] border border-[#005430] px-2 py-0.5 rounded w-fit font-medium">
                        {assetName}
                    </div>
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
                                ${trade.price.toFixed(1)}
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
                    ${trades[0]?.price.toFixed(1) || '0.0'}
                </span>
            </div>
        </div>
    );
};

export default TradeHistoryList;
