import React from "react";
import { Team, League } from "../types";
import { ArrowUpRight, ArrowDownRight, ChevronRight, Globe } from "lucide-react";

interface AllMarketsWidgetProps {
    teams: Team[];
    onNavigate: (league: League) => void;
    onViewAsset?: (asset: Team) => void;
}

const AllMarketsWidget: React.FC<AllMarketsWidgetProps> = ({
    teams,
    onNavigate,
    onViewAsset,
}) => {
    // Show top 3 teams (you might want to verify sorting, here we toggle first 3)
    // Assuming teams are passed in a reasonable order or we just take the first few
    const displayTeams = teams.slice(0, 3);

    const handleViewAll = () => {
        onNavigate("ALL_MARKETS");
    };

    return (
        <div className="flex flex-col gap-4">
            {/* Widget Header */}
            <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-brand-primary" />
                    <h2 className="text-sm font-bold text-gray-200 uppercase tracking-wider font-sans">
                        All Index Tokens
                    </h2>
                </div>
                <button
                    onClick={handleViewAll}
                    className="text-xs text-brand-primary hover:text-brand-secondary transition-colors font-medium flex items-center gap-1"
                >
                    View All <ChevronRight className="w-3 h-3" />
                </button>
            </div>

            {/* Rows */}
            <div className="flex flex-col gap-2">
                {displayTeams.map((team) => {
                    // Mock change data
                    const isPositive = Math.random() > 0.5;

                    return (
                        <div
                            key={team.id}
                            onClick={() => onViewAsset && onViewAsset(team)}
                            className="flex items-center justify-between p-3 rounded-xl bg-gray-800/40 border border-gray-700/50 hover:border-brand-primary/50 cursor-pointer backdrop-blur-sm transition-all group"
                        >
                            {/* Left: Asset Info */}
                            <div className="flex items-center gap-3">
                                {/* Logo */}
                                <div className="w-10 h-10 rounded-lg bg-gray-900/50 p-1.5 flex items-center justify-center border border-gray-700/50 group-hover:border-brand-primary/30 transition-colors">
                                    {team.logo_url ? (
                                        <img
                                            src={team.logo_url}
                                            alt={team.name}
                                            className="w-full h-full object-contain"
                                        />
                                    ) : (
                                        <div className="text-xs font-bold text-gray-500">
                                            {team.name.substring(0, 2)}
                                        </div>
                                    )}
                                </div>

                                {/* Name & Market */}
                                <div className="flex flex-col">
                                    <span className="text-sm font-bold text-gray-200 group-hover:text-brand-primary transition-colors">
                                        {team.name}
                                    </span>
                                    <span className="text-xs text-gray-500 font-medium">
                                        {team.market || "Unknown Market"}
                                    </span>
                                </div>
                            </div>

                            {/* Right: Buy/Sell & Arrow */}
                            <div className="flex items-center gap-3">
                                {/* Sell (Bid) */}
                                <div className="w-16 text-right">
                                    <span className="text-xs font-semibold text-red-400">
                                        ${team.bid.toFixed(2)}
                                    </span>
                                </div>

                                {/* Buy (Offer) */}
                                <div className="w-16 flex justify-end">
                                    <span className="bg-[#005430] text-white px-2 py-1 rounded text-xs font-bold shadow-sm shadow-black/20 group-hover:bg-[#006035] transition-colors min-w-[50px] text-center">
                                        ${team.offer.toFixed(2)}
                                    </span>
                                </div>

                                {/* Arrow Indicator */}
                                <div className={`flex items-center justify-center w-6 h-6 rounded-full bg-gray-800/50 border border-gray-700/50 flex-shrink-0 ${isPositive ? "text-green-500" : "text-red-500"}`}>
                                    {isPositive ? (
                                        <ArrowUpRight className="w-3.5 h-3.5" />
                                    ) : (
                                        <ArrowDownRight className="w-3.5 h-3.5" />
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default AllMarketsWidget;
