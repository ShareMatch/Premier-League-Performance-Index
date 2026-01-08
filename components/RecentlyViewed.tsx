import React, { useEffect, useState } from "react";
import { Team, League } from "../types";
import { getRecentlyViewed } from "../utils/recentlyViewed";
import { Clock } from "lucide-react";

interface RecentlyViewedProps {
    onNavigate?: (league: League) => void;
    onViewAsset?: (asset: Team) => void;
}

const RecentlyViewed: React.FC<RecentlyViewedProps> = ({
    onNavigate,
    onViewAsset,
}) => {
    const [items, setItems] = useState<Team[]>([]);

    useEffect(() => {
        // Load initial items
        const loadItems = () => {
            const recent = getRecentlyViewed().slice(0, 3); // Top 3
            setItems(recent);
        };

        loadItems();

        // Listen for storage events (in case updated in another tab, though less critical here)
        // Or just re-read when focusing? For now simple load on mount is fine.
        // To make it reactive to current session changes, we might need a custom event or shared state.
        // For now, let's assume it updates on mount/remount (page navigation often triggers remounts).

        // Add event listener for custom "recentlyViewedUpdated" event if we want real-time updates within same tab
        const handleUpdate = () => loadItems();
        window.addEventListener("recentlyViewedUpdated", handleUpdate);

        return () => {
            window.removeEventListener("recentlyViewedUpdated", handleUpdate);
        };
    }, []);

    if (items.length === 0) {
        return null; // Don't show if empty
    }

    const handleItemClick = (item: Team) => {
        if (onViewAsset) {
            onViewAsset(item);
        } else if (onNavigate && item.market) {
            // Fallback to navigating to market if onViewAsset not provided
            onNavigate(item.market as League);
        }
    };

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 px-1">
                <Clock className="w-4 h-4 text-brand-primary" />
                <h2 className="text-sm font-bold text-gray-200 uppercase tracking-wider font-sans">
                    Recently Viewed
                </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {items.map((item) => (
                    <div
                        key={item.id}
                        onClick={() => handleItemClick(item)}
                        className="group relative overflow-hidden rounded-xl bg-gray-800/40 border border-gray-700/50 hover:border-brand-primary/50 transition-all duration-300 cursor-pointer backdrop-blur-sm"
                    >
                        {/* Hover Effect Background */}
                        <div className="absolute inset-0 bg-gradient-to-br from-brand-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                        <div className="p-3 flex items-center gap-3 relative z-10">
                            {/* Logo */}
                            <div className="w-10 h-10 rounded-lg bg-gray-900/50 p-1.5 flex items-center justify-center border border-gray-700/50 group-hover:border-brand-primary/30 transition-colors">
                                {item.logo_url ? (
                                    <img
                                        src={item.logo_url}
                                        alt={item.name}
                                        className="w-full h-full object-contain"
                                    />
                                ) : (
                                    <div className="text-xs font-bold text-gray-500">
                                        {item.name.substring(0, 2)}
                                    </div>
                                )}
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                    <h3 className="font-semibold text-gray-200 text-sm truncate group-hover:text-brand-primary transition-colors">
                                        {item.name}
                                    </h3>
                                </div>

                                <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-xs font-medium text-gray-400">
                                        {item.market || "INDEX"}
                                    </span>
                                    <div className="w-1 h-1 rounded-full bg-gray-600" />
                                    <span className="text-xs text-brand-secondary font-medium">
                                        {item.offer.toFixed(2)}
                                    </span>
                                </div>
                            </div>

                            {/* Arrow Icon */}
                            <div className="text-gray-600 group-hover:text-brand-primary transition-colors transform group-hover:translate-x-0.5 duration-300">
                                <svg
                                    width="16"
                                    height="16"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                >
                                    <path d="M9 18l6-6-6-6" />
                                </svg>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default RecentlyViewed;
