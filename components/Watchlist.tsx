import React from "react";
import type { Team } from "../types";
import { useFavorites } from "../hooks/useFavorites";
import { Star } from "lucide-react";
import { FaCaretUp, FaCaretDown } from "react-icons/fa";
import { formatCurrency, formatNumberWithCommas } from "../utils/currencyUtils";

interface WatchlistProps {
    allAssets: Team[];
    onViewAsset?: (asset: Team) => void;
    onSelectAsset?: (team: Team, type: "buy" | "sell") => void;
}

const Watchlist: React.FC<WatchlistProps> = ({
    allAssets,
    onViewAsset,
    onSelectAsset,
}) => {
    const { favorites } = useFavorites();

    // Filter assets matching favorites by trading asset id
    // Each market's trading asset (e.g., Arsenal EPL vs Arsenal UCL) is separate
    const watchlistAssets = allAssets.filter((asset) =>
        favorites.includes(asset.id)
    );

    const handleRowClick = (asset: Team) => {
        if (onSelectAsset) {
            onSelectAsset(asset, "buy");
        }
    };

    if (watchlistAssets.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                <div className="w-12 h-12 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center mb-4">
                    <Star className="w-6 h-6 text-gray-500" />
                </div>
                <h3 className="text-gray-200 font-medium mb-1">
                    Your Watchlist is empty
                </h3>
                <p className="text-sm text-gray-500">
                    Star your favorite assets to track them here.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {watchlistAssets.map((asset) => {
                // Generate a "stable" mock change based on asset ID for consistency
                const idSum = asset.id
                    .split("")
                    .reduce((acc, char) => acc + char.charCodeAt(0), 0);
                const changeAmount = ((idSum % 100) / 100) * 2 - 0.5; // Random range around -0.5 to 1.5
                const isPositive = changeAmount >= 0;

                return (
                    <div
                        key={asset.id}
                        className="bg-gray-800/50 p-3 rounded-xl border border-gray-700/50 flex items-start sm:items-center gap-2 cursor-pointer hover:bg-gray-800 transition-all group"
                        onClick={() => handleRowClick(asset)}
                        role="button"
                        tabIndex={0}
                    >
                        {/* Avatar Block */}
                        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gray-700/50 flex items-center justify-center overflow-hidden border border-gray-600/30">
                            {asset.logo_url ? (
                                <img
                                    src={asset.logo_url}
                                    alt={asset.name}
                                    className="w-full h-full object-contain"
                                />
                            ) : (
                                <span className="text-[10px] text-gray-400 font-bold uppercase">
                                    {asset.name.substring(0, 2)}
                                </span>
                            )}
                        </div>

                        {/* Content Block */}
                        <div className="flex-1 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-0 min-w-0">
                            <div className="min-w-0 flex-1">
                                <div className="font-semibold text-gray-200 text-[clamp(0.75rem,2.5vw,0.875rem)] leading-tight group-hover:text-white transition-colors break-words">
                                    {asset.name}
                                </div>
                                <div className="text-[clamp(0.55rem,1.2vw,0.6875rem)] text-gray-500 font-mono uppercase tracking-tight flex items-center gap-1 mt-0.5">
                                    {asset.market || "MARKET"}
                                </div>
                            </div>

                            <div className="flex items-center gap-[clamp(0.5rem,2vw,1rem)] flex-shrink-0 sm:ml-1">
                                {/* Price Change Indicator */}
                                <div
                                    className={`flex items-center gap-0.5 text-[clamp(0.6rem,1.5vw,0.75rem)] font-bold ${isPositive ? "text-green-400" : "text-red-400"}`}
                                >
                                    {isPositive ? (
                                        <FaCaretUp className="w-2.5 h-2.5" />
                                    ) : (
                                        <FaCaretDown className="w-2.5 h-2.5" />
                                    )}
                                    <span className="whitespace-nowrap">${formatNumberWithCommas(Math.abs(changeAmount))}</span>
                                </div>

                                {/* Main Price */}
                                <div className="text-[clamp(0.75rem,2.5vw,0.875rem)] font-bold text-white font-mono min-w-[3rem] text-right whitespace-nowrap">
                                    {formatCurrency(asset.offer || 0)}
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default Watchlist;
