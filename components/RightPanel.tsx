import React from 'react';
import TradeSlip from './TradeSlip';
import Portfolio from './Portfolio';
import type { Order } from '../types';

interface RightPanelProps {
    portfolio: Record<number, number>;
    selectedOrder: Order | null;
    onCloseTradeSlip: () => void;
}

const RightPanel: React.FC<RightPanelProps> = ({
    portfolio,
    selectedOrder,
    onCloseTradeSlip
}) => {
    return (
        <div className="h-full flex flex-col bg-gray-900 border-l border-gray-800 w-80 flex-shrink-0">

            {/* Trade Slip Section - Only visible when order selected */}
            {selectedOrder && (
                <div className="p-4 border-b border-gray-800 bg-gray-800/30">
                    <TradeSlip order={selectedOrder} onClose={onCloseTradeSlip} />
                </div>
            )}

            {/* Portfolio Section */}
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                <h2 className="text-lg font-bold text-gray-200 mb-4 flex items-center gap-2">
                    <span className="w-2 h-6 bg-[#3AA189] rounded-sm"></span>
                    Your Portfolio
                </h2>
                <Portfolio portfolio={portfolio} />
            </div>

        </div>
    );
};

export default RightPanel;
