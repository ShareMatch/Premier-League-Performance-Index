import React from 'react';
import TradeSlip from './TradeSlip';
import Portfolio from './Portfolio';
import type { Order, Position, Team } from '../types';

interface RightPanelProps {
    portfolio: Position[];
    selectedOrder: Order | null;
    onCloseTradeSlip: () => void;
    onConfirmTrade: (quantity: number) => Promise<void>;
    allAssets: Team[];
    onNavigate: (league: 'EPL' | 'UCL' | 'WC' | 'SPL' | 'F1') => void;
    leagueName: string;
}

const RightPanel: React.FC<RightPanelProps> = ({
    portfolio,
    selectedOrder,
    onCloseTradeSlip,
    onConfirmTrade,
    allAssets,
    onNavigate,
    leagueName
}) => {
    return (
        <div className="h-full flex flex-col bg-gray-900 border-l border-gray-800 w-[clamp(10rem,20vw,20rem)] flex-shrink-0">

            {/* Trade Slip Section - Only visible when order selected */}
            {selectedOrder && (
                <div className="p-4 border-b border-gray-800 bg-gray-800/30">
                    <TradeSlip
                        order={selectedOrder}
                        onClose={onCloseTradeSlip}
                        onConfirm={onConfirmTrade}
                        leagueName={leagueName}
                    />
                </div>
            )}

            {/* Portfolio Section */}
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                <h2 className="text-lg font-bold text-gray-200 mb-4 flex items-center gap-2">
                    <span className="w-2 h-6 bg-[#3AA189] rounded-sm"></span>
                    Your Portfolio
                </h2>
                <Portfolio
                    portfolio={portfolio}
                    allAssets={allAssets}
                    onNavigate={onNavigate}
                />
            </div>

        </div>
    );
};

export default RightPanel;
