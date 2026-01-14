// Market-specific information for InfoPopup
// Each market has its own description and relevant dates

export interface MarketInfo {
  title: string;
  content: string;
  seasonDates: string;
  isOpen: boolean;
}

export const marketInfoData: Record<string, MarketInfo> = {
  F1: {
    title: "F1 Drivers Performance Index",
    content: `The F1 Drivers League Performance Index is a close-ended digital market composed of Index Asset Outcome Tokens (IAOTs), structured under Haqq Mālī principles to avoid Riba, Gharar, and Maysir. The opening and closing dates of the market are shown within the card.

Initial IAOT prices are set using verified historical oracle data; live market prices are determined by user supply and demand.

IAOTs are perpetual digital assets representing index performance, with transparent, predefined settlement terms via immutable smart contracts.`,
    seasonDates: "", // Loaded from Supabase
    isOpen: false,
  },

  EPL: {
    title: "Premier League Performance Index",
    content: `The Premier League Performance Index is a close-ended digital market composed of Index Asset Outcome Tokens (IAOTs), structured under Haqq Mālī principles to avoid Riba, Gharar, and Maysir. The opening and closing dates of the market are shown within the card.

Initial IAOT prices are set using verified historical oracle data; live market prices are determined by user supply and demand.

IAOTs are perpetual digital assets representing index performance, with transparent, predefined settlement terms via immutable smart contracts.`,
    seasonDates: "", // Loaded from Supabase
    isOpen: true,
  },

  UCL: {
    title: "Champions League Performance Index",
    content: `The Champions League Performance Index is a close-ended digital market composed of Index Asset Outcome Tokens (IAOTs), structured under Haqq Mālī principles to avoid Riba, Gharar, and Maysir. The opening and closing dates of the market are shown within the card.

Initial IAOT prices are set using verified historical oracle data; live market prices are determined by user supply and demand.

IAOTs are perpetual digital assets representing index performance, with transparent, predefined settlement terms via immutable smart contracts.`,
    seasonDates: "", // Loaded from Supabase
    isOpen: true,
  },

  SPL: {
    title: "Saudi Pro League Performance Index",
    content: `The Saudi Pro League Performance Index is a close-ended digital market composed of Index Asset Outcome Tokens (IAOTs), structured under Haqq Mālī principles to avoid Riba, Gharar, and Maysir. The opening and closing dates of the market are shown within the card.

Initial IAOT prices are set using verified historical oracle data; live market prices are determined by user supply and demand.

IAOTs are perpetual digital assets representing index performance, with transparent, predefined settlement terms via immutable smart contracts.`,
    seasonDates: "", // Loaded from Supabase
    isOpen: true,
  },

  ISL: {
    title: "Indonesia Super League",
    content: `The Indonesia Super League Performance Index is a close-ended digital market composed of Index Asset Outcome Tokens (IAOTs), structured under Haqq Mālī principles to avoid Riba, Gharar, and Maysir. The opening and closing dates of the market are shown within the card.

Initial IAOT prices are set using verified historical oracle data; live market prices are determined by user supply and demand.

IAOTs are perpetual digital assets representing index performance, with transparent, predefined settlement terms via immutable smart contracts.`,
    seasonDates: "", // Loaded from Supabase
    isOpen: true,
  },

  WC: {
    title: "FIFA World Cup Performance Index",
    content: `The FIFA World Cup Performance Index is a close-ended digital market composed of Index Asset Outcome Tokens (IAOTs), structured under Haqq Mālī principles to avoid Riba, Gharar, and Maysir. The opening and closing dates of the market are shown within the card.

Initial IAOT prices are set using verified historical oracle data; live market prices are determined by user supply and demand.

IAOTs are perpetual digital assets representing index performance, with transparent, predefined settlement terms via immutable smart contracts.`,
    seasonDates: "", // Loaded from Supabase
    isOpen: true,
  },

  NBA: {
    title: "NBA Performance Index",
    content: `The NBA Performance Index is a close-ended digital market composed of Index Asset Outcome Tokens (IAOTs), structured under Haqq Mālī principles to avoid Riba, Gharar, and Maysir. The opening and closing dates of the market are shown within the card.

Initial IAOT prices are set using verified historical oracle data; live market prices are determined by user supply and demand.

IAOTs are perpetual digital assets representing index performance, with transparent, predefined settlement terms via immutable smart contracts.`,
    seasonDates: "", // Loaded from Supabase
    isOpen: true,
  },

  NFL: {
    title: "NFL Performance Index",
    content: `The NFL Performance Index is a close-ended digital market composed of Index Asset Outcome Tokens (IAOTs), structured under Haqq Mālī principles to avoid Riba, Gharar, and Maysir. The opening and closing dates of the market are shown within the card.

Initial IAOT prices are set using verified historical oracle data; live market prices are determined by user supply and demand.

IAOTs are perpetual digital assets representing index performance, with transparent, predefined settlement terms via immutable smart contracts.`,
    seasonDates: "", // Loaded from Supabase
    isOpen: true,
  },

  T20: {
    title: "T20 World Cup Performance Index",
    content: `The T20 World Cup Performance Index is a close-ended digital market composed of Index Asset Outcome Tokens (IAOTs), structured under Haqq Mālī principles to avoid Riba, Gharar, and Maysir. The opening and closing dates of the market are shown within the card.

Initial IAOT prices are set using verified historical oracle data; live market prices are determined by user supply and demand.

IAOTs are perpetual digital assets representing index performance, with transparent, predefined settlement terms via immutable smart contracts.`,
    seasonDates: "", // Loaded from Supabase
    isOpen: true,
  },

  Eurovision: {
    title: "Eurovision Song Contest Performance Index",
    content: `The Eurovision Song Contest Performance Index is a close-ended digital market composed of Index Asset Outcome Tokens (IAOTs), structured under Haqq Mālī principles to avoid Riba, Gharar, and Maysir. The opening and closing dates of the market are shown within the card.

Initial IAOT prices are set using verified historical oracle data; live market prices are determined by user supply and demand.

IAOTs are perpetual digital assets representing index performance, with transparent, predefined settlement terms via immutable smart contracts.`,
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
