import React, { useState } from "react";
import TradeSlip from "./TradeSlip";
import Portfolio from "./Portfolio";
import Watchlist from "./Watchlist";
import type { Order, Position, Team, Transaction, League } from "../types";
import { History, Activity, X, Star } from "lucide-react";
import { TransactionHistorySkeleton, WatchlistSkeleton } from "./Skeleton";

interface RightPanelProps {
  portfolio: Position[];
  transactions: Transaction[];
  selectedOrder: Order | null;
  onCloseTradeSlip: () => void;
  onConfirmTrade: (quantity: number, side: "buy" | "sell") => Promise<void>;
  allAssets: Team[];
  onNavigate: (league: League) => void;
  onSelectOrder: (team: Team, type: "buy" | "sell") => void;
  onViewAsset?: (asset: Team) => void;
  leagueName: string;
  walletBalance?: number;
  onClose?: () => void;
  isMobile?: boolean;
  /** Show skeleton loading state for portfolio/transactions */
  loading?: boolean;
}

const RightPanel: React.FC<RightPanelProps> = ({
  portfolio,
  transactions,
  selectedOrder,
  onCloseTradeSlip,
  onConfirmTrade,
  allAssets,
  onNavigate,
  onSelectOrder,
  onViewAsset,
  leagueName,
  walletBalance,
  onClose,
  isMobile = false,
  loading = false,
}) => {
  const [activeTab, setActiveTab] = useState<"portfolio" | "watchlist" | "history">(
    "portfolio"
  );

  return (
    <div
      data-testid="right-panel"
      className={`flex flex-col bg-gray-900 border-l border-gray-800 flex-shrink-0 overflow-hidden ${isMobile
        ? "w-80 h-full max-h-full"
        : "h-full w-[clamp(240px,22vw,320px)]"
        }`}
    >
      {/* Mobile Header with Close Button - Fixed at top */}
      {isMobile && (
        <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-gray-800 bg-gray-800">
          <h2 className="text-lg font-bold text-white">Portfolio & History</h2>
          <button
            onClick={onClose}
            aria-label="Close portfolio panel"
            data-testid="right-panel-close-button"
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Scrollable Container - Contains TradeSlip, Tabs, and Content */}
      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide flex flex-col">
        {/* Trade Slip Section - Only visible when order selected */}
        {selectedOrder && (
          <div className="flex-shrink-0 p-4 border-b border-gray-800 bg-gray-800/30">
            <TradeSlip
              key={`${selectedOrder.team.id}-${selectedOrder.type}`}
              order={{
                ...selectedOrder,
                holding:
                  portfolio.find(
                    (p) =>
                      p.market_trading_asset_id ===
                      selectedOrder.team.market_trading_asset_id
                  )?.quantity || 0,
              }}
              onClose={onCloseTradeSlip}
              onConfirm={onConfirmTrade}
              leagueName={leagueName}
              walletBalance={walletBalance}
            />
          </div>
        )}

        {/* Tabs - Sticky within scroll */}
        <div className="flex-shrink-0 flex border-b border-gray-800 bg-gray-900 sticky top-0 z-10">
          <button
            onClick={() => setActiveTab("portfolio")}
            className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${activeTab === "portfolio"
              ? "text-white border-b-2 border-[#005430] bg-gray-800/20"
              : "text-gray-400 hover:text-gray-200 hover:bg-gray-800/10"
              }`}
            data-testid="right-panel-portfolio-tab"
          >
            <Activity className="w-4 h-4" />
            Portfolio
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${activeTab === "history"
              ? "text-white border-b-2 border-[#005430] bg-gray-800/20"
              : "text-gray-400 hover:text-gray-200 hover:bg-gray-800/10"
              }`}
            data-testid="right-panel-history-tab"
          >
            <History className="w-4 h-4" />
            History
          </button>
          <button
            onClick={() => setActiveTab("watchlist")}
            className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${activeTab === "watchlist"
              ? "text-white border-b-2 border-[#005430] bg-gray-800/20"
              : "text-gray-400 hover:text-gray-200 hover:bg-gray-800/10"
              }`}
            data-testid="right-panel-watchlist-tab"
          >
            <Star className="w-4 h-4" />
            Watchlist
          </button>
        </div>

        {/* Content Section */}
        <div className="flex-1 p-[clamp(0.5rem,2vw,1rem)]">
          {activeTab === "portfolio" ? (
            <>
              <div className="flex flex-col gap-1 mb-[clamp(0.5rem,2vw,1rem)]">
                <h2 className="text-[clamp(0.875rem,2.5vw,1.125rem)] font-bold text-gray-200 flex items-center gap-2">
                  <span className="w-2 h-6 bg-[#005430] rounded-sm"></span>
                  Your Portfolio
                </h2>
                <p className="text-[clamp(0.55rem,1.2vw,0.6875rem)] text-gray-500 pl-4 font-medium flex items-center gap-1">
                  <span className="w-1 h-1 bg-[#005430] rounded-full inline-block"></span>
                  Values reflect potential sell price
                </p>
              </div>
              <Portfolio
                portfolio={portfolio}
                allAssets={allAssets}
                onNavigate={onNavigate}
                onSelectAsset={onSelectOrder}
                onViewAsset={onViewAsset}
                loading={loading}
              />
            </>
          ) : activeTab === "history" ? (
            <div className="space-y-[clamp(0.5rem,2vw,1rem)]">
              <h2 className="text-[clamp(0.875rem,2.5vw,1.125rem)] font-bold text-gray-200 mb-[clamp(0.5rem,2vw,1rem)] flex items-center gap-2">
                <span className="w-2 h-6 bg-[#005430] rounded-sm"></span>
                Transaction History
              </h2>
              {loading ? (
                <TransactionHistorySkeleton count={3} />
              ) : transactions.length === 0 ? (
                <div className="text-gray-500 text-center text-[clamp(0.75rem,2vw,0.875rem)] py-8">
                  No transaction history available.
                </div>
              ) : (
                <div className="space-y-3">
                  {transactions.map((tx) => {
                    const asset = allAssets.find(
                      (a) =>
                        a.market_trading_asset_id === tx.market_trading_asset_id
                    );
                    return (
                      <div
                        key={tx.id}
                        className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/50 hover:bg-gray-800 transition-colors flex items-start gap-3"
                      >
                        {/* Avatar Block */}
                        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gray-700/50 flex items-center justify-center overflow-hidden border border-gray-600/30 mt-0.5">
                          {asset?.logo_url ? (
                            <img
                              src={asset.logo_url}
                              alt={asset?.name || "Asset"}
                              className="w-full h-full object-contain"
                            />
                          ) : (
                            <span className="text-[10px] text-gray-400 font-bold">
                              {asset?.name?.substring(0, 2) || "??"}
                            </span>
                          )}
                        </div>

                        <div className="flex-1">
                          <div className="flex justify-between items-start mb-1">
                            <span className="text-gray-200 font-medium text-sm">
                              {asset?.name || tx.asset_name || "Unknown Asset"}
                            </span>
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full uppercase font-bold tracking-wider ${tx.type === "settlement"
                                ? "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                                : tx.direction === "buy"
                                  ? "bg-[#005430] text-white border border-transparent"
                                  : "bg-red-500/10 text-red-500 border border-red-500/20"
                                }`}
                            >
                              {tx.type === "settlement"
                                ? "Settled"
                                : tx.direction}
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-xs text-gray-400 mb-2">
                            <span>
                              {tx.quantity} units @{" "}
                              {tx.price_per_unit.toFixed(2)}
                            </span>
                            <span className="text-gray-500">
                              {new Date(tx.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="flex justify-between items-center pt-2 border-t border-gray-700/50">
                            <span className="text-xs text-gray-500">Total</span>
                            <span className="font-bold text-gray-300">
                              ${tx.amount.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {/* Bottom spacer for mobile scrollability */}
                  <div className="h-20 sm:h-0" />
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-[clamp(0.5rem,2vw,1rem)]">
              <h2 className="text-[clamp(0.875rem,2.5vw,1.125rem)] font-bold text-gray-200 mb-[clamp(0.5rem,2vw,1rem)] flex items-center gap-2">
                <span className="w-2 h-6 bg-[#005430] rounded-sm"></span>
                Watchlist
              </h2>
              {loading ? (
                <WatchlistSkeleton count={3} />
              ) : (
                <Watchlist
                  allAssets={allAssets}
                  onViewAsset={onViewAsset}
                  onSelectAsset={(team, type) => onSelectOrder(team, type)}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RightPanel;
