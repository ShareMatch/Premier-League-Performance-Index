// Market-specific information for InfoPopup
// Each market has its own description and relevant dates
import InfoPopup from "../resources/InfoPopup.txt?raw";

export interface MarketInfo {
  title: string;
  content: string;
  seasonDates: string;
  isOpen: boolean;
}

export const marketInfoData: Record<string, MarketInfo> = {
  F1: {
    title: "F1 Drivers Performance Index",
    content: InfoPopup,
    seasonDates: "", // Loaded from Supabase
    isOpen: false,
  },

  EPL: {
    title: "Premier League Performance Index",
    content: InfoPopup,
    seasonDates: "", // Loaded from Supabase
    isOpen: true,
  },

  UCL: {
    title: "Champions League Performance Index",
    content: InfoPopup,
    seasonDates: "", // Loaded from Supabase
    isOpen: true,
  },

  SPL: {
    title: "Saudi Pro League Performance Index",
    content: InfoPopup,
    seasonDates: "", // Loaded from Supabase
    isOpen: true,
  },

  ISL: {
    title: "Indonesia Super League",
    content: InfoPopup,
    seasonDates: "", // Loaded from Supabase
    isOpen: true,
  },

  WC: {
    title: "FIFA World Cup Performance Index",
    content: InfoPopup,
    seasonDates: "", // Loaded from Supabase
    isOpen: true,
  },

  NBA: {
    title: "NBA Performance Index",
    content: InfoPopup,
    seasonDates: "", // Loaded from Supabase
    isOpen: true,
  },

  NFL: {
    title: "NFL Performance Index",
    content: InfoPopup,
    seasonDates: "", // Loaded from Supabase
    isOpen: true,
  },

  T20: {
    title: "T20 World Cup Performance Index",
    content: InfoPopup,
    seasonDates: "", // Loaded from Supabase
    isOpen: true,
  },

  Eurovision: {
    title: "Eurovision Song Contest Performance Index",
    content: InfoPopup,
    seasonDates: "", // Loaded from Supabase
    isOpen: true,
  },
};

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

// Helper function to get market info with fallback
// Now accepts optional dynamic season data from Supabase
// IMPORTANT: Markets without Supabase season data default to CLOSED
export const getMarketInfo = (
  market: string,
  seasonStartDate?: string,
  seasonEndDate?: string,
  seasonStage?: string
): MarketInfo => {
  const baseInfo = marketInfoData[market] || {
    title: "Market Information",
    content: "Information about this market is not available yet.",
    seasonDates: "",
    isOpen: false,
  };

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
    const isStageClosed = seasonStage === "closed" || seasonStage === "settled"; // Explicitly closed stages

    // If season has ended, market is always closed
    const isOpen = !hasSeasonEnded && isWithinRange && !isStageClosed;

    return {
      ...baseInfo,
      seasonDates: formattedDates,
      isOpen: isOpen,
    };
  }

  // No season data from Supabase = market is CLOSED by default
  // This ensures only markets with proper Supabase configuration are shown as open
  return {
    ...baseInfo,
    isOpen: false,
  };
};
