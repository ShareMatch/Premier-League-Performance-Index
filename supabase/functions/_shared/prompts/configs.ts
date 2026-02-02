/**
 * Shared Configurations
 * 
 * Mappings and settings used across Edge Functions.
 */

// ============================================
// TOPIC & LEAGUE MAPPINGS
// ============================================

/**
 * Maps topic codes to search queries for news fetching
 */
export const TOPIC_SEARCH_MAP: Record<string, string> = {
  EPL: "Premier League football news, transfers, matches, table",
  UCL: "UEFA Champions League latest news and results",
  SPL: "Saudi Pro League football news",
  WC: "FIFA World Cup news",
  F1: "Formula 1 racing news, qualifying, race results",
  NBA: "NBA basketball news, trades, injuries",
  NFL: "NFL American football news",
  T20: "T20 Cricket World Cup news and scores",
  ISL: "Indonesia Super League football news",
  Eurovision: "Eurovision Song Contest latest news",
  Global: "Major global sports headlines today",
};

/**
 * Maps league codes to full display names
 */
export const LEAGUE_DISPLAY_NAMES: Record<string, string> = {
  EPL: "Premier League",
  UCL: "Champions League",
  SPL: "Saudi Pro League",
  WC: "FIFA World Cup 2026",
  F1: "Formula 1 2026 season",
  NBA: "NBA",
  NFL: "NFL",
  T20: "T20 Cricket World Cup",
  ISL: "Indonesia Super League",
  Eurovision: "Eurovision 2026",
};

// ============================================
// TERMINOLOGY RULES (Sharia Compliance)
// ============================================

/**
 * Terms that must NOT appear in AI outputs
 */
export const FORBIDDEN_TERMS = {
  religious: ["Halal", "Islamic", "Sharia", "Haram"],
  gambling: ["bet", "odds", "wager", "gamble", "betting", "bookie", "bookmaker"],
};

/**
 * Term replacements for compliance
 */
export const TERM_REPLACEMENTS: Record<string, string> = {
  win: "top the index",
  winner: "first place",
  bet: "trade",
  odds: "sentiment",
  gamble: "position",
  betting: "trading",
};

// ============================================
// NEWS SOURCES
// ============================================

/**
 * Reputable news sources to prioritize
 */
export const REPUTABLE_SOURCES = [
  "BBC Sport",
  "Sky Sports",
  "ESPN",
  "The Athletic",
  "Goal.com",
  "Reuters Sports",
  "Guardian Sport",
  "Telegraph Sport",
];

/**
 * Sources to exclude (gambling-related)
 */
export const EXCLUDED_SOURCES = [
  "betfair",
  "bet365",
  "gambling.com",
  "oddschecker",
  "sportsbetting",
];

// ============================================
// AI MODEL CONFIGS
// ============================================

/**
 * Default models for different use cases
 */
export const AI_MODELS = {
  geminiFlash: "gemini-2.5-flash",
  geminiPro: "gemini-2.0-flash",
  llama: "llama-3.1-8b-instant",
  llamaLarge: "llama-3.1-70b-versatile",
};

// ============================================
// CHATBOT VIDEO METADATA
// ============================================

export const VIDEO_FILE_NAMES: Record<string, string> = {
  login: "Streamline Login Process With Sharematch.mp4",
  signup: "Streamline Signup Process With Sharematch Product Demo.mp4",
  kyc: "Streamline KYC Verification With Sharematch Demo.mp4",
  buyAssets: "How to buy.mp4",
  sellAssets: "How to sell.mp4",
  forgotPassword: "forgot password.mp4",
  updateUserDetails: "How to update user details.mp4",
  editMarketingPreferences: "how to edit marketing preferences.mp4",
  changePassword: "how to change password.mp4",
  eplIndex: "English epl.mp4",
  splIndex: "English SPL.mp4",
  uefaIndex: "English UEFA.mp4",
  nflIndex: "English NFL.mp4",
  nbaIndex: "English NBA Market.mp4",
  islIndex: "English Indonesia Super League.mp4",
  t20Index: "English T20 World Cup.mp4",
  fifaIndex: "English FIFA World Cup.mp4",
  f1Index: "English Formula 1.mp4",
};

export const VIDEO_METADATA: Record<string, {
  title: string;
  intro: string;
  accessLevel: "public" | "authenticated";
}> = {
  login: {
    title: "How to Login to ShareMatch",
    intro: "Here's a quick video walkthrough showing you how to log in to ShareMatch!",
    accessLevel: "public",
  },
  signup: {
    title: "How to Sign Up for ShareMatch",
    intro: "I've got a helpful video that will guide you through the signup process step by step.",
    accessLevel: "public",
  },
  kyc: {
    title: "How to Complete KYC Verification on ShareMatch",
    intro: "Check out this video tutorial on completing your KYC verification - it covers everything you need to know!",
    accessLevel: "public",
  },
  buyAssets: {
    title: "How to Buy Assets on ShareMatch",
    intro: "Here's a step-by-step video showing you how to purchase assets on ShareMatch!",
    accessLevel: "authenticated",
  },
  sellAssets: {
    title: "How to Sell Assets on ShareMatch",
    intro: "Check out this guide on how to sell your assets on the ShareMatch platform!",
    accessLevel: "authenticated",
  },
  forgotPassword: {
    title: "How to Reset Your Password on ShareMatch",
    intro: "Here's a quick video showing you how to reset your password if you've forgotten it!",
    accessLevel: "public",
  },
  updateUserDetails: {
    title: "How to Update User Details on ShareMatch",
    intro: "This video will walk you through updating your profile information on ShareMatch!",
    accessLevel: "authenticated",
  },
  editMarketingPreferences: {
    title: "How to Edit Marketing Preferences on ShareMatch",
    intro: "Learn how to customize your communication preferences with this helpful video!",
    accessLevel: "authenticated",
  },
  changePassword: {
    title: "How to Change Your Password on ShareMatch",
    intro: "Here's a guide on how to change your password",
    accessLevel: "authenticated",
  },
  eplIndex: {
    title: "Understanding the English Premier League Index on ShareMatch",
    intro: "This video explains how the English Premier League index token works on ShareMatch.",
    accessLevel: "authenticated",
  },
  splIndex: {
    title: "Understanding the Saudi Pro League Index on ShareMatch",
    intro: "Learn how the Saudi Pro League index token functions on ShareMatch.",
    accessLevel: "authenticated",
  },
  uefaIndex: {
    title: "Understanding the UEFA Champions League Index on ShareMatch",
    intro: "This video explains how the UEFA Champions League index token works on ShareMatch.",
    accessLevel: "authenticated",
  },
  nflIndex: {
    title: "Understanding the NFL Index on ShareMatch",
    intro: "This video explains how the NFL index token functions on ShareMatch.",
    accessLevel: "authenticated",
  },
  nbaIndex: {
    title: "Understanding the NBA Index on ShareMatch",
    intro: "Learn how the NBA index token works and how index values are represented on ShareMatch.",
    accessLevel: "authenticated",
  },
  islIndex: {
    title: "Understanding the Indonesia Super League Index on ShareMatch",
    intro: "This video explains how the Indonesia Super League index token functions on ShareMatch.",
    accessLevel: "authenticated",
  },
  t20Index: {
    title: "Understanding the T20 Cricket Index on ShareMatch",
    intro: "Learn how the T20 Cricket index token works and how index performance is represented.",
    accessLevel: "authenticated",
  },
  fifaIndex: {
    title: "Understanding the FIFA World Cup Index on ShareMatch",
    intro: "This video explains how the FIFA World Cup index token works on ShareMatch.",
    accessLevel: "authenticated",
  },
  f1Index: {
    title: "Understanding the F1 Index on ShareMatch",
    intro: "Learn how the F1 index token operates and how index values move on ShareMatch.",
    accessLevel: "authenticated",
  },
};
