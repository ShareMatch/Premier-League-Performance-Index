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

/**
 * Generate logo URL for a team/driver
 * @param name - Team or driver name
 * @param market - Market type (EPL, F1, etc.)
 * @returns Logo URL or null if not available
 */
export const getLogoUrl = (name: string, market: string): string | null => {
    // Check if we have a direct mapping
    if (TEAM_LOGOS[name]) {
        return TEAM_LOGOS[name];
    }

    // For teams not in our mapping, return null to show fallback
    return null;
};

/**
 * Get fallback color for a team (from existing color field)
 */
export const getFallbackColor = (color?: string): string => {
    return color || '#6B7280';
};
