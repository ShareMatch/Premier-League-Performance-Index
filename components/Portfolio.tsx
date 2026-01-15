import React, { useMemo } from "react";
import type { Position, Team } from "../types";

interface PortfolioProps {
  portfolio: Position[];
  allAssets: Team[];
  onNavigate: (league: "EPL" | "UCL" | "WC" | "SPL" | "F1") => void;
  onSelectAsset: (team: Team, type: "buy" | "sell") => void;
  onViewAsset?: (asset: Team) => void;
}

const Portfolio: React.FC<PortfolioProps> = ({
  portfolio,
  allAssets,
  onNavigate,
  onSelectAsset,
  onViewAsset,
}) => {
  const getMarketName = (market: string): string => {
    const marketNames: Record<string, string> = {
      EPL: "Premier League",
      UCL: "Champions League",
      WC: "World Cup",
      SPL: "Saudi Pro League",
      F1: "Formula 1",
      NBA: "NBA",
      NFL: "NFL",
    };
    return marketNames[market] || market;
  };

  const holdings = useMemo(() => {
    return portfolio
      .map((position) => {
        // Find the asset from allAssets to get current price and market info
        const asset = allAssets.find(
          (a) => a.market_trading_asset_id === position.market_trading_asset_id
        );

        return {
          ...position,
          asset: asset,
          currentPrice: asset?.bid || 0,
          market: asset?.market || "Unknown",
        };
      })
      .filter((h) => h.quantity > 0);
  }, [portfolio, allAssets]);

  const handleRowClick = (holding: any) => {
    // Navigate to the Asset Page if onViewAsset is provided
    if (onViewAsset && holding.asset) {
      onViewAsset(holding.asset);
      // Also open the transaction slip (default to Buy)
      onSelectAsset(holding.asset, "buy");
    } else {
      // Fallback to old behavior if onViewAsset is not provided
      // 1. Navigate to the market
      if (holding.market && holding.market !== "Unknown") {
        onNavigate(holding.market as any);
      }

      // 2. Open the Transaction Slip (Default to Buy)
      if (holding.asset) {
        onSelectAsset(holding.asset, "buy");
      }
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
          className="bg-gray-800/50 p-3 rounded border border-gray-700 flex items-center gap-3 cursor-pointer hover:bg-gray-700/50 transition-colors"
          onClick={() => handleRowClick(holding)}
          role="button"
          tabIndex={0}
        >
          {/* Avatar Block */}
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gray-700/50 flex items-center justify-center overflow-hidden border border-gray-600/30">
            {holding.asset?.logo_url ? (
              <img
                src={holding.asset.logo_url}
                alt={holding.asset.name}
                className="w-full h-full object-contain"
              />
            ) : (
              <span className="text-[10px] text-gray-400 font-bold">
                {holding.asset?.name?.substring(0, 2) || "??"}
              </span>
            )}
          </div>

          {/* Content Block */}
          <div className="flex-1 flex justify-between items-center">
            <div>
              <div className="font-medium text-gray-200 text-sm">
                {holding.asset?.name || holding.asset_name || "Unknown Asset"}
              </div>
              <div className="text-xs text-gray-500">
                {holding.quantity} units
              </div>
              <div className="text-[10px] bg-[#005430] text-white px-1.5 rounded inline-block mt-1">
                {getMarketName(holding.market)}
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm bg-[#005430] text-white px-2 py-0.5 rounded font-bold inline-block">
                ${(holding.quantity * holding.currentPrice).toFixed(1)}
              </div>
              <div className="text-[10px] text-gray-500">
                @ ${holding.currentPrice.toFixed(1)}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default Portfolio;
