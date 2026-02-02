import { Team } from "../types";
import React from 'react';
import {
    Trophy,
    Activity,
    Car,
    Shield,
    Globe,
    Zap,
    CircleDot
} from "lucide-react";

/**
 * Robust check to determine if an asset's market is currently open for trading.
 */
export const isMarketOpen = (team: Team): { isOpen: boolean; reason: 'settled' | 'closed' | 'not_started' | 'ended' | 'open' | 'missing_config' } => {
    if (team.is_settled || team.season_stage === "settled") {
        return { isOpen: false, reason: 'settled' };
    }

    if (team.season_stage === "closed") {
        return { isOpen: false, reason: 'closed' };
    }

    if (team.season_start_date && team.season_end_date) {
        const now = new Date();
        const startDate = new Date(team.season_start_date);
        const endDate = new Date(team.season_end_date);

        if (now < startDate) return { isOpen: false, reason: 'not_started' };
        if (now > endDate) return { isOpen: false, reason: 'ended' };

        return { isOpen: true, reason: 'open' };
    }

    return { isOpen: false, reason: 'missing_config' };
};

export interface MarketDisplayMetadata {
    label: string;
    fullName: string;
    icon: React.ReactNode;
    color: string; // Tailwind gradient classes
    borderColor: string; // Tailwind border classes
    iconColor: string; // Tailwind text classes
    primaryColor?: string; // Hex color from DB
    secondaryColor?: string; // Hex color from DB
}

const DEFAULT_METADATA: MarketDisplayMetadata = {
    label: "Market",
    fullName: "Market Index",
    icon: <Globe className="w-full h-full" />,
    color: "from-gray-500/20 to-slate-500/20",
    borderColor: "group-hover:border-gray-500/50",
    iconColor: "text-gray-400"
};

// Default icon mapping by category
const CATEGORY_ICONS: Record<string, React.ReactNode> = {
    football: <Trophy className="w-full h-full" />,
    f1: <Car className="w-full h-full" />,
    basketball: <Activity className="w-full h-full" />,
    american_football: <Trophy className="w-full h-full" />,
    cricket: <Activity className="w-full h-full" />,
    global_events: <Globe className="w-full h-full" />,
    other: <Globe className="w-full h-full" />,
};

// Fallback metadata for known market tokens (used only when DB data is unavailable)
const FALLBACK_MARKET_STYLES: Record<string, { color: string; borderColor: string; iconColor: string; category?: string }> = {
    EPL: { color: "from-purple-500/20 to-blue-500/20", borderColor: "group-hover:border-purple-500/50", iconColor: "text-purple-400", category: "football" },
    UCL: { color: "from-blue-600/20 to-indigo-600/20", borderColor: "group-hover:border-blue-500/50", iconColor: "text-blue-400", category: "football" },
    F1: { color: "from-red-500/20 to-orange-500/20", borderColor: "group-hover:border-red-500/50", iconColor: "text-red-400", category: "f1" },
    NBA: { color: "from-orange-500/20 to-amber-500/20", borderColor: "group-hover:border-orange-500/50", iconColor: "text-orange-400", category: "basketball" },
    NFL: { color: "from-blue-800/20 to-blue-900/20", borderColor: "group-hover:border-blue-800/50", iconColor: "text-blue-800", category: "american_football" },
    SPL: { color: "from-green-500/20 to-emerald-500/20", borderColor: "group-hover:border-green-500/50", iconColor: "text-green-400", category: "football" },
    WC: { color: "from-yellow-500/20 to-amber-500/20", borderColor: "group-hover:border-yellow-500/50", iconColor: "text-yellow-400", category: "football" },
    ISL: { color: "from-emerald-500/20 to-teal-500/20", borderColor: "group-hover:border-emerald-500/50", iconColor: "text-emerald-400", category: "football" },
    T20: { color: "from-blue-500/20 to-cyan-500/20", borderColor: "group-hover:border-blue-500/50", iconColor: "text-blue-400", category: "cricket" },
    Eurovision: { color: "from-pink-500/20 to-purple-500/20", borderColor: "group-hover:border-pink-500/50", iconColor: "text-pink-400", category: "global_events" },
};

/**
 * Converts a hex color to Tailwind-compatible gradient classes.
 * Falls back to default gradient if conversion isn't possible.
 */
const hexToGradientClasses = (primaryColor?: string, secondaryColor?: string): string => {
    if (!primaryColor) return DEFAULT_METADATA.color;
    // For dynamic colors, we use inline styles in components. Return a neutral gradient class.
    return "from-gray-500/20 to-slate-500/20";
};

/**
 * Gets display metadata for a market token.
 * Prioritizes database-provided data (index_name, market_name, primary_color, secondary_color)
 * with fallbacks to known market defaults.
 * 
 * @param marketToken - The market token (e.g., "EPL", "UCL", "F1")
 * @param dbData - Optional data from database for dynamic overrides
 */
export const getMarketDisplayData = (
    marketToken: string | undefined,
    dbData?: {
        index_name?: string;
        market_name?: string;
        primary_color?: string;
        secondary_color?: string;
        category?: string;
    }
): MarketDisplayMetadata => {
    if (!marketToken) return DEFAULT_METADATA;

    const fallback = FALLBACK_MARKET_STYLES[marketToken];
    const category = dbData?.category || fallback?.category || "other";
    const icon = CATEGORY_ICONS[category] || CATEGORY_ICONS.other;

    // Use DB-provided name if available, otherwise use token as fallback
    const label = dbData?.market_name || marketToken;
    const fullName = dbData?.index_name || dbData?.market_name || marketToken;

    return {
        label,
        fullName,
        icon,
        color: fallback?.color || DEFAULT_METADATA.color,
        borderColor: fallback?.borderColor || DEFAULT_METADATA.borderColor,
        iconColor: fallback?.iconColor || DEFAULT_METADATA.iconColor,
        primaryColor: dbData?.primary_color,
        secondaryColor: dbData?.secondary_color,
    };
};

/**
 * Gets the display name for a market token.
 * Useful for simple label lookups without full metadata.
 * 
 * @param marketToken - The market token (e.g., "EPL")
 * @param indexName - Optional full index name from DB
 * @param marketName - Optional friendly market name from DB
 */
export const getMarketDisplayName = (
    marketToken: string | undefined,
    indexName?: string,
    marketName?: string
): string => {
    // Priority: marketName > indexName > token
    if (marketName) return marketName;
    if (indexName) return indexName;
    return marketToken || "Unknown Market";
};

/**
 * Gets unique markets from a list of teams.
 * Useful for dynamically building market lists from team data.
 */
export const getUniqueMarkets = (teams: Team[]): Array<{
    token: string;
    name: string;
    category?: string;
    teamCount: number;
}> => {
    const marketMap = new Map<string, { name: string; category?: string; count: number }>();

    teams.forEach(team => {
        const token = team.market || team.index_token;
        if (!token) return;

        const existing = marketMap.get(token);
        if (existing) {
            existing.count++;
        } else {
            marketMap.set(token, {
                name: team.market_name || team.index_name || token,
                category: team.category,
                count: 1
            });
        }
    });

    return Array.from(marketMap.entries()).map(([token, data]) => ({
        token,
        name: data.name,
        category: data.category,
        teamCount: data.count
    }));
};

// Note: getIndexAvatarUrl is exported from ../lib/logoHelper
// Use that import for index avatar URLs
