import React, { useState } from 'react';
import TradeSlip from './TradeSlip';
import Portfolio from './Portfolio';
import { Wallet, Position, Order, Team, Transaction, League } from '../types';
import { History, Activity } from 'lucide-react';

interface RightPanelProps {
    portfolio: Position[];
    transactions: Transaction[];
    selectedOrder: Order | null;
    onCloseTradeSlip: () => void;
    onConfirmTrade: (quantity: number) => Promise<void>;
    allAssets: Team[];
    onNavigate: (league: League) => void;
    leagueName: string;
}

const RightPanel: React.FC<RightPanelProps> = ({
    portfolio,
    transactions,
    selectedOrder,
    onCloseTradeSlip,
    onConfirmTrade,
    allAssets,
    onNavigate,
    leagueName
}) => {
    const [activeTab, setActiveTab] = useState<'portfolio' | 'history'>('portfolio');

    return (
        <div className="h-full flex flex-col bg-gray-900 border-l border-gray-800 w-[clamp(16rem,22vw,20rem)] flex-shrink-0">

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

            {/* Tabs */}
            <div className="flex border-b border-gray-800">
                <button
                    onClick={() => setActiveTab('portfolio')}
                    className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${activeTab === 'portfolio'
                        ? 'text-white border-b-2 border-[#005430] bg-gray-800/20'
                        : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/10'
                        }`}
                >
                    <Activity className="w-4 h-4" />
                    Portfolio
                </button>
                <button
                    onClick={() => setActiveTab('history')}
                    className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${activeTab === 'history'
                        ? 'text-white border-b-2 border-[#005430] bg-gray-800/20'
                        : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/10'
                        }`}
                >
                    <History className="w-4 h-4" />
                    History
                </button>
            </div>

            {/* Content Section */}
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                {activeTab === 'portfolio' ? (
                    <>
                        <h2 className="text-lg font-bold text-gray-200 mb-4 flex items-center gap-2">
                            <span className="w-2 h-6 bg-[#005430] rounded-sm"></span>
                            Your Portfolio
                        </h2>
                        <Portfolio
                            portfolio={portfolio}
                            allAssets={allAssets}
                            onNavigate={onNavigate}
                        />
                    </>
                ) : (
                    <div className="space-y-4">
                        <h2 className="text-lg font-bold text-gray-200 mb-4 flex items-center gap-2">
                            <span className="w-2 h-6 bg-brand-emerald500 rounded-sm"></span>
                            Transaction History
                        </h2>
                        {transactions.length === 0 ? (
                            <div className="text-gray-500 text-center text-sm py-8">
                                No transaction history available.
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {transactions.map((tx) => (
                                    <div key={tx.id} className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/50 hover:bg-gray-800 transition-colors">
                                        <div className="flex justify-between items-start mb-1">
                                            <span className="text-gray-200 font-medium text-sm">{tx.asset_name}</span>
                                            <span className={`text-xs px-2 py-0.5 rounded-full uppercase font-bold tracking-wider ${tx.type === 'settlement'
                                                ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                                                : tx.direction === 'buy'
                                                    ? 'bg-brand/10 text-brand border border-brand/20'
                                                    : 'bg-red-500/10 text-red-500 border border-red-500/20'
                                                }`}>
                                                {tx.type === 'settlement' ? 'Settled' : tx.direction}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center text-xs text-gray-400 mb-2">
                                            <span>
                                                {tx.quantity} units @ {tx.price_per_unit.toFixed(2)}
                                            </span>
                                            <span className="text-gray-500">
                                                {new Date(tx.created_at).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center pt-2 border-t border-gray-700/50">
                                            <span className="text-xs text-gray-500">Total</span>
                                            <span className="font-mono font-medium text-gray-300">
                                                ${(tx.amount).toFixed(2)}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

        </div>
    );
};

export default RightPanel;
