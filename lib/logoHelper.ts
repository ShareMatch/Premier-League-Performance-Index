/**
 * Helper functions for team/driver logos
 */

/**
 * Team logo mappings to reliable sources
 * Using a combination of sources for best coverage
 */

const R2_AVATAR_BASE_URL = "https://assets.rwa.sharematch.me/avatars";

/**
 * Generate avatar URL for assets hosted in R2 via trading asset ID
 * @param tradingAssetId - The trading asset ID (UUID from market_index_trading_assets table)
 * @returns Avatar URL or null if not available
 */
export const getAvatarUrl = (tradingAssetId: string | undefined): string | null => {
    if (!tradingAssetId) return null;

    // Handle settled asset IDs by extracting the original trading asset ID
    let actualId = tradingAssetId;
    if (tradingAssetId.startsWith('settled-')) {
        // Extract the trading asset ID from the end of the composite ID
        const parts = tradingAssetId.split('-');
        if (parts.length >= 6) { // settled-{season_id}-{trading_asset_id}
            // The trading asset ID is the last 5 parts (UUID format)
            actualId = parts.slice(-5).join('-');
        }
    }

    const filename = `${actualId}.svg`;
    return `${R2_AVATAR_BASE_URL}/${filename}`;
};

/**
 * Generate logo URL for a team/driver
 * @param name - Team or driver name
 * @param market - Market type (EPL, F1, etc.)
 * @param tradingAssetId - Trading asset ID for avatars (optional)
 * @returns Logo URL or null if not available
 */
export const getLogoUrl = (name: string, market: string, tradingAssetId?: string): string | null => {
    // Defensive programming - ensure we have valid inputs
    if (!name || !market) return null;

    // Try to use the generated avatar first (if trading asset ID is available)
    if (tradingAssetId) {
        const avatarUrl = getAvatarUrl(tradingAssetId);
        if (avatarUrl) return avatarUrl;
    }

    // Fallback to traditional logo mappings
    if (TEAM_LOGOS[name]) {
        return TEAM_LOGOS[name];
    }

    // For teams not in our mapping, return null to show fallback
    return null;
};

/**
 * Index avatar mappings for league/market icons
 */
const INDEX_AVATARS: Record<string, string> = {
    'EPL': '/index-avatars/epl.svg',
    'UCL': '/index-avatars/ucl.svg',
    'SPL': '/index-avatars/spl.svg',
    'F1': '/index-avatars/f1.svg',
    'WC': '/index-avatars/wc.svg',
    'NBA': '/index-avatars/nba.svg',
    'NFL': '/index-avatars/nfl.svg',
    'T20': '/index-avatars/t20.svg',
    'ISL': '/index-avatars/isl.svg',
};

/**
 * Get index avatar URL for a market/league
 * @param market - Market code (EPL, UCL, etc.)
 * @returns Index avatar URL or null if not available
 */
export const getIndexAvatarUrl = (market: string): string | null => {
    if (!market) return null;
    return INDEX_AVATARS[market.toUpperCase()] || null;
};

/**
 * Get fallback color for a team (from existing color field)
 */
export const getFallbackColor = (color?: string): string => {
    return color || '#6B7280';
};
