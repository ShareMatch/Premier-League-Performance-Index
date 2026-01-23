import { Team } from "../types";

/**
 * Robust check to determine if an asset's market is currently open for trading.
 * Logic:
 * 1. If it's settled, it's NOT open.
 * 2. If stage is explicitly 'closed', it's NOT open.
 * 3. If season dates are present, current time must be within [start, end].
 * 4. IMPORTANT: If season dates are MISSING, we default to CLOSED (matching marketInfo.ts logic).
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

    // If we reach here, dates are missing. 
    // Following getMarketInfo's lead: No season data = CLOSED
    return { isOpen: false, reason: 'missing_config' };
};
