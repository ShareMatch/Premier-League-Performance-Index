/**
 * Helper functions for team/driver logos
 */

/**
 * Team logo mappings to reliable sources
 * Using a combination of sources for best coverage
 */
const TEAM_LOGOS: Record<string, string> = {
    // EPL Teams - Using official club domains for logo.dev
    'Arsenal': 'https://logo.clearbit.com/arsenal.com',
    'Man City': 'https://logo.clearbit.com/mancity.com',
    'Liverpool': 'https://logo.clearbit.com/liverpoolfc.com',
    'Chelsea': 'https://logo.clearbit.com/chelseafc.com',
    'Man Utd': 'https://logo.clearbit.com/manutd.com',
    'Tottenham': 'https://logo.clearbit.com/tottenhamhotspur.com',
    'Newcastle': 'https://logo.clearbit.com/nufc.co.uk',
    'Aston Villa': 'https://logo.clearbit.com/avfc.co.uk',
    'Brighton': 'https://logo.clearbit.com/brightonandhovealbion.com',
    'West Ham': 'https://logo.clearbit.com/whufc.com',
    'Everton': 'https://logo.clearbit.com/evertonfc.com',
    'Wolves': 'https://logo.clearbit.com/wolves.co.uk',
    'Fulham': 'https://logo.clearbit.com/fulhamfc.com',
    'Brentford': 'https://logo.clearbit.com/brentfordfc.com',
    'Crystal Palace': 'https://logo.clearbit.com/cpfc.co.uk',
    'Bournemouth': 'https://logo.clearbit.com/afcb.co.uk',
    'Nottm Forest': 'https://logo.clearbit.com/nottinghamforest.co.uk',
    'Leeds': 'https://logo.clearbit.com/leedsunited.com',

    // F1 Teams
    'Lando Norris': 'https://logo.clearbit.com/mclaren.com',
    'Oscar Piastri': 'https://logo.clearbit.com/mclaren.com',
    'Max Verstappen': 'https://logo.clearbit.com/redbull.com',
    'Sergio Perez': 'https://logo.clearbit.com/redbull.com',
    'Charles Leclerc': 'https://logo.clearbit.com/ferrari.com',
    'Carlos Sainz': 'https://logo.clearbit.com/ferrari.com',
    'Lewis Hamilton': 'https://logo.clearbit.com/mercedesamgf1.com',
    'George Russell': 'https://logo.clearbit.com/mercedesamgf1.com',
    'Fernando Alonso': 'https://logo.clearbit.com/astonmartinf1.com',
    'Lance Stroll': 'https://logo.clearbit.com/astonmartinf1.com',
};

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
