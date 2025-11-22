/**
 * Helper functions for team/driver logos
 */

// TheSportsDB API base URL for team badges
const SPORTS_DB_BADGE_URL = 'https://www.thesportsdb.com/images/media/team/badge';

/**
 * Format team name for TheSportsDB URL
 * - Replace spaces with underscores
 * - Handle special cases
 */
const formatTeamName = (name: string, market: string): string => {
    // Special cases for team name formatting
    const specialCases: Record<string, string> = {
        'Man City': 'Manchester_City',
        'Man Utd': 'Manchester_United',
        'Nottm Forest': 'Nottingham_Forest',
        'West Ham': 'West_Ham',
        'Aston Villa': 'Aston_Villa',
        'Crystal Palace': 'Crystal_Palace',
        // F1 teams (not drivers)
        'Lando Norris': 'McLaren',
        'Oscar Piastri': 'McLaren',
        'Max Verstappen': 'Red_Bull',
        'Charles Leclerc': 'Ferrari',
        'Carlos Sainz': 'Ferrari',
        'Lewis Hamilton': 'Mercedes',
        'George Russell': 'Mercedes',
        'Sergio Perez': 'Red_Bull',
        'Fernando Alonso': 'Aston_Martin',
        'Lance Stroll': 'Aston_Martin',
    };

    if (specialCases[name]) {
        return specialCases[name];
    }

    // Default: replace spaces with underscores
    return name.replace(/\s+/g, '_');
};

/**
 * Generate logo URL for a team/driver
 * @param name - Team or driver name
 * @param market - Market type (EPL, F1, etc.)
 * @returns Logo URL or null if not available
 */
export const getLogoUrl = (name: string, market: string): string | null => {
    // F1 drivers - use team logos instead
    if (market === 'F1') {
        const formattedName = formatTeamName(name, market);
        return `${SPORTS_DB_BADGE_URL}/${formattedName}.png`;
    }

    // Football teams
    const formattedName = formatTeamName(name, market);
    return `${SPORTS_DB_BADGE_URL}/${formattedName}.png`;
};

/**
 * Get fallback color for a team (from existing color field)
 */
export const getFallbackColor = (color?: string): string => {
    return color || '#6B7280';
};
