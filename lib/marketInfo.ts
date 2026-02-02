// Market-specific information for InfoPopup
// Dynamically generated from database data with fallbacks
import InfoPopup from "../resources/InfoPopup.txt?raw";

export interface MarketInfo {
  title: string;
  content: string;
  seasonDates: string;
  isOpen: boolean;
}

/**
 * Dynamic market info storage.
 * This is populated at runtime from database data.
 * Use getMarketInfo() to access market information.
 */
const dynamicMarketInfo: Map<string, MarketInfo> = new Map();

/**
 * Registers market info from database data.
 * Call this when loading market/season data from Supabase.
 */
export const registerMarketInfo = (
  marketToken: string,
  info: Partial<MarketInfo>
): void => {
  const existing = dynamicMarketInfo.get(marketToken) || {
    title: `${marketToken} Performance Index`,
    content: InfoPopup,
    seasonDates: "",
    isOpen: false,
  };

  dynamicMarketInfo.set(marketToken, {
    ...existing,
    ...info,
  });
};

/**
 * Gets all registered market tokens.
 * Useful for iterating over available markets.
 */
export const getRegisteredMarkets = (): string[] => {
  return Array.from(dynamicMarketInfo.keys());
};

/**
 * Checks if a market is registered (has DB data).
 */
export const isMarketRegistered = (marketToken: string): boolean => {
  return dynamicMarketInfo.has(marketToken);
};

// Legacy export for backward compatibility
// Components should migrate to using getMarketInfo() directly
export const marketInfoData: Record<string, MarketInfo> = new Proxy(
  {} as Record<string, MarketInfo>,
  {
    get(_, prop: string) {
      return dynamicMarketInfo.get(prop) || {
        title: `${prop} Performance Index`,
        content: InfoPopup,
        seasonDates: "",
        isOpen: false,
      };
    },
    has(_, prop: string) {
      return dynamicMarketInfo.has(prop);
    },
    ownKeys() {
      return Array.from(dynamicMarketInfo.keys());
    },
    getOwnPropertyDescriptor(_, prop: string) {
      if (dynamicMarketInfo.has(prop)) {
        return {
          enumerable: true,
          configurable: true,
        };
      }
      return undefined;
    },
  }
);

// Helper to format date from YYYY-MM-DD to readable format
const formatSeasonDate = (dateStr: string): string => {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
};

/**
 * Gets market info with dynamic season data from Supabase.
 * 
 * IMPORTANT: Markets without Supabase season data default to CLOSED.
 * This ensures only properly configured markets are tradeable.
 * 
 * @param market - The market token (e.g., "EPL", "UCL")
 * @param seasonStartDate - Season start date from DB
 * @param seasonEndDate - Season end date from DB
 * @param seasonStage - Season stage from DB ('open', 'closed', 'settled')
 * @param indexName - Optional full index name from DB for title override
 */
export const getMarketInfo = (
  market: string,
  seasonStartDate?: string,
  seasonEndDate?: string,
  seasonStage?: string,
  indexName?: string
): MarketInfo => {
  // Check dynamic registry first, then fall back to default
  const baseInfo = dynamicMarketInfo.get(market) || {
    title: indexName || `${market} Performance Index`,
    content: InfoPopup,
    seasonDates: "",
    isOpen: false,
  };

  // Override title with indexName if provided
  const title = indexName || baseInfo.title;

  // If we have dynamic season dates from Supabase, use them to determine if open
  if (seasonStartDate && seasonEndDate) {
    const formattedDates = `${formatSeasonDate(
      seasonStartDate
    )} - ${formatSeasonDate(seasonEndDate)}`;

    // Determine if market is open based on date range AND stage
    const now = new Date();
    const startDate = new Date(seasonStartDate);
    const endDate = new Date(seasonEndDate);

    // Market is open if:
    // 1. Current date is within the season date range
    // 2. AND stage is NOT explicitly 'closed' or 'settled'
    const isWithinRange = now >= startDate && now <= endDate;
    const hasSeasonEnded = now > endDate;
    const isStageClosed = seasonStage === "closed" || seasonStage === "settled";

    // If season has ended, market is always closed
    const isOpen = !hasSeasonEnded && isWithinRange && !isStageClosed;

    // Register this market info for future lookups
    const marketInfo: MarketInfo = {
      title,
      content: baseInfo.content,
      seasonDates: formattedDates,
      isOpen,
    };

    registerMarketInfo(market, marketInfo);

    return marketInfo;
  }

  // No season data from Supabase = market is CLOSED by default
  // This ensures only markets with proper Supabase configuration are shown as open
  return {
    ...baseInfo,
    title,
    isOpen: false,
  };
};
