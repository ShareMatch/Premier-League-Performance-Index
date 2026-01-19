import React, { useMemo } from "react";
import type { Position, Team } from "../types";
import { useFavorites } from "../hooks/useFavorites";
import { Star } from "lucide-react";
import { FaCaretUp, FaCaretDown } from "react-icons/fa";
import { formatCurrency, formatNumberWithCommas } from "../utils/currencyUtils";

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
  const { favorites, toggleFavorite } = useFavorites();
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
      {holdings.map((holding) => {
        // Generate a "stable" mock change based on asset ID for consistency
        const idSum = holding.asset?.id.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0) || 0;
        const changeAmount = (idSum % 100) / 100 * 2 - 0.5; // Random range around -0.5 to 1.5
        const isPositive = changeAmount >= 0;

        return (
          <div
            key={holding.id}
            className="bg-gray-800/50 p-3 rounded-xl border border-gray-700/50 flex items-center gap-3 cursor-pointer hover:bg-gray-800 transition-all group"
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

            <div className="flex-1 flex justify-between items-center min-w-0">
              <div className="min-w-0 mr-1 flex-1">
                <div className="font-semibold text-gray-200 text-[clamp(11px,1.2vw,14px)] leading-tight group-hover:text-white transition-colors break-words">
                  {holding.asset?.name || holding.asset_name || "Unknown Asset"}
                </div>
                <div className="text-[clamp(10px,1vw,11px)] text-gray-500 mt-0.5">
                  {holding.quantity} units
                </div>
                <div className="text-[clamp(9px,1vw,10px)] bg-[#005430] text-white px-1.5 py-0.5 rounded inline-block mt-1">
                  {getMarketName(holding.market)}
                </div>
              </div>

              <div className="text-right flex-shrink-0 ml-2">
                <div className="text-[clamp(12px,1.2vw,14px)] bg-[#005430] text-white px-2 py-0.5 rounded font-bold inline-block font-mono">
                  {formatCurrency(holding.quantity * holding.currentPrice)}
                </div>
                <div className="flex flex-col items-end mt-1 gap-0.5">
                  <div className="text-[clamp(10px,1vw,11px)] text-gray-500 font-mono">
                    @ {formatCurrency(holding.currentPrice)}
                  </div>
                  {/* Price Change Indicator */}
                  <div className={`flex items-center gap-0.5 text-[clamp(9px,1vw,10px)] font-bold ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                    {isPositive ? <FaCaretUp className="w-2.5 h-2.5" /> : <FaCaretDown className="w-2.5 h-2.5" />}
                    <span>${formatNumberWithCommas(Math.abs(changeAmount))}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default Portfolio;
