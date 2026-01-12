import React from "react";
import { Team, League } from "../types";
import { ChevronRight, Globe } from "lucide-react";
import { FaCaretDown } from "react-icons/fa";
import { FaCaretUp } from "react-icons/fa6";

interface AllMarketsWidgetProps {
    teams: Team[];
    onNavigate: (league: League) => void;
    onViewAsset?: (asset: Team) => void;
    onSelectOrder?: (team: Team, type: "buy" | "sell") => void;
}

const AllMarketsWidget: React.FC<AllMarketsWidgetProps> = ({
    teams,
    onNavigate,
    onViewAsset,
    onSelectOrder,
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

                            {/* Right: Pricing (Ticker Style) - Fixed widths for perfect alignment */}
                            <div className="flex items-center gap-6">
                                {/* Sell Section */}
                                <div className="flex items-center gap-1.5 w-[100px] justify-end">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (onSelectOrder) onSelectOrder(team, "sell");
                                        }}
                                        className="bg-red-900/30 hover:bg-red-900/50 text-red-400 text-[10px] font-bold px-2 py-0.5 rounded transition-all uppercase tracking-wider shrink-0"
                                    >
                                        Sell
                                    </button>
                                    <span className="text-sm font-bold text-gray-200 min-w-[50px] text-right">
                                        ${team.bid.toFixed(2)}
                                    </span>
                                    <FaCaretDown className="w-3.5 h-3.5 text-red-500 shrink-0" />
                                </div>

                                {/* Buy Section */}
                                <div className="flex items-center gap-1.5 w-[100px] justify-end">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (onSelectOrder) onSelectOrder(team, "buy");
                                        }}
                                        className="bg-[#005430] hover:bg-[#006035] text-white text-[10px] font-bold px-2 py-0.5 rounded transition-all shadow-sm uppercase tracking-wider shrink-0"
                                    >
                                        Buy
                                    </button>
                                    <span className="text-sm font-bold text-gray-200 min-w-[50px] text-right">
                                        ${team.offer.toFixed(2)}
                                    </span>
                                    <FaCaretUp className="w-3.5 h-3.5 text-[#00A651] shrink-0" />
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
            <div className="flex justify-end">
                <button
                    onClick={handleViewAll}
                    className="text-xs font-medium text-brand-primary hover:text-brand-primary/80 transition-colors flex items-center gap-1"
                >
                    View All <ChevronRight className="w-3 h-3" />
                </button>
            </div>
        </div>
    );
};

export default AllMarketsWidget;
