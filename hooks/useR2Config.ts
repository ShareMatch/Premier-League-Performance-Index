/**
 * Hook to fetch and cache configuration from R2 bucket
 * 
 * - Fetches config files on app load
 * - Caches in localStorage (persists across refreshes)
 * - In-memory cache for instant access during session
 * - Falls back to defaults if fetch fails
 */

import { useState, useEffect } from 'react';

// ============================================
// TYPES
// ============================================

export interface SuggestedQuestion {
  text: string;
  market: string;
}

export interface Category {
  id: string;
  label: string;
  markets: string[];
}

export interface R2Config {
  suggestedQuestions: SuggestedQuestion[];
  assetTemplates: string[];
  categories: Category[];
  marketLabels: Record<string, string>;
  isLoading: boolean;
  error: string | null;
}

// ============================================
// R2 CONFIG - Same bucket as avatars/logos
// ============================================

const R2_BASE_URL = "https://assets.rwa.sharematch.me";
const R2_CONFIG_PATH = "config";

// Full URLs for config files
const CONFIG_URLS = {
  suggestedQuestions: `${R2_BASE_URL}/${R2_CONFIG_PATH}/suggested-questions.json`,
  categories: `${R2_BASE_URL}/${R2_CONFIG_PATH}/categories.json`,
  marketLabels: `${R2_BASE_URL}/${R2_CONFIG_PATH}/market-labels.json`,
};

// ============================================
// CACHE CONFIG
// ============================================

// Cache keys for localStorage
const CACHE_KEYS = {
  suggestedQuestions: 'r2_config_suggested_questions',
  categories: 'r2_config_categories',
  marketLabels: 'r2_config_market_labels',
  timestamp: 'r2_config_timestamp',
};

// Cache duration: 1 hour (in milliseconds)
const CACHE_DURATION_MS = 60 * 60 * 1000;

// ============================================
// DEFAULTS (fallback if R2 fetch fails)
// ============================================

const DEFAULT_SUGGESTED_QUESTIONS: SuggestedQuestion[] = [
  { text: "Which EPL team is most undervalued based on performance?", market: "EPL" },
  { text: "Analyze the top F1 performers this season", market: "F1" },
  { text: "Compare the Saudi Pro League top 5 teams' recent form", market: "SPL" },
  { text: "Identify high-performing UCL assets in the current cycle", market: "UCL" },
  { text: "Which NBA team has the most consistent player ratings?", market: "NBA" },
  { text: "Evaluate the growth potential of NFL star performers", market: "NFL" },
  { text: "Find top-rated T20 players with low index values", market: "T20" },
  { text: "Which ISL teams are showing the most technical improvement?", market: "ISL" },
  { text: "Compare defensive efficiency between top 3 EPL clubs", market: "EPL" },
  { text: "What are the key performance metrics driving F1 valuations?", market: "F1" },
];

const DEFAULT_ASSET_TEMPLATES = [
  "Analyze {asset}",
  "{asset} performance overview",
  "{asset} recent form",
  "{asset} stats breakdown",
  "Compare {asset}",
  "{asset} key metrics",
  "{asset} trends analysis",
  "{asset} valuation report",
];

const DEFAULT_CATEGORIES: Category[] = [
  { id: "football", label: "Football", markets: ["EPL", "SPL", "UCL", "ISL"] },
  { id: "motorsport", label: "Motorsport", markets: ["F1"] },
  { id: "basketball", label: "Basketball", markets: ["NBA"] },
  { id: "american_football", label: "American Football", markets: ["NFL"] },
  { id: "cricket", label: "Cricket", markets: ["T20"] },
];

const DEFAULT_MARKET_LABELS: Record<string, string> = {
  EPL: "Premier League",
  SPL: "Saudi Pro League",
  UCL: "Champions League",
  F1: "Formula 1",
  NBA: "NBA",
  NFL: "NFL",
  T20: "T20 World Cup",
  ISL: "Indonesia Super League",
};

// ============================================
// IN-MEMORY CACHE (fast access during session)
// ============================================

let memoryCache: {
  suggestedQuestions: SuggestedQuestion[] | null;
  assetTemplates: string[] | null;
  categories: Category[] | null;
  marketLabels: Record<string, string> | null;
  loadedAt: number | null;
} = {
  suggestedQuestions: null,
  assetTemplates: null,
  categories: null,
  marketLabels: null,
  loadedAt: null,
};

// ============================================
// LOCALSTORAGE HELPERS
// ============================================

function getFromLocalStorage<T>(key: string): T | null {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : null;
  } catch {
    return null;
  }
}

function setToLocalStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn('Failed to save to localStorage:', e);
  }
}

function isCacheValid(): boolean {
  const timestamp = getFromLocalStorage<number>(CACHE_KEYS.timestamp);
  if (!timestamp) return false;
  return Date.now() - timestamp < CACHE_DURATION_MS;
}

// ============================================
// FETCH HELPER
// ============================================

async function fetchJSON<T>(url: string): Promise<T | null> {
  try {
    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      // Add cache control for CDN
      cache: 'default',
    });
    
    if (!response.ok) {
      console.warn(`Failed to fetch ${url}: ${response.status}`);
      return null;
    }
    
    return await response.json();
  } catch (error) {
    console.warn(`Error fetching ${url}:`, error);
    return null;
  }
}

// ============================================
// LOAD CONFIG (from cache or R2)
// ============================================

async function loadConfig(): Promise<{
  suggestedQuestions: SuggestedQuestion[];
  assetTemplates: string[];
  categories: Category[];
  marketLabels: Record<string, string>;
}> {
  // 1. Check memory cache first (fastest)
  if (memoryCache.loadedAt && Date.now() - memoryCache.loadedAt < CACHE_DURATION_MS) {
    console.log('📦 Using memory cache for R2 config');
    return {
      suggestedQuestions: memoryCache.suggestedQuestions || DEFAULT_SUGGESTED_QUESTIONS,
      assetTemplates: memoryCache.assetTemplates || DEFAULT_ASSET_TEMPLATES,
      categories: memoryCache.categories || DEFAULT_CATEGORIES,
      marketLabels: memoryCache.marketLabels || DEFAULT_MARKET_LABELS,
    };
  }

  // 2. Check localStorage cache (persists across refreshes)
  if (isCacheValid()) {
    console.log('💾 Using localStorage cache for R2 config');
    const cached = {
      suggestedQuestions: getFromLocalStorage<{ questions: SuggestedQuestion[]; assetTemplates: string[] }>(CACHE_KEYS.suggestedQuestions),
      categories: getFromLocalStorage<{ categories: Category[] }>(CACHE_KEYS.categories),
      marketLabels: getFromLocalStorage<{ labels: Record<string, string> }>(CACHE_KEYS.marketLabels),
    };

    // Update memory cache
    memoryCache = {
      suggestedQuestions: cached.suggestedQuestions?.questions || DEFAULT_SUGGESTED_QUESTIONS,
      assetTemplates: cached.suggestedQuestions?.assetTemplates || DEFAULT_ASSET_TEMPLATES,
      categories: cached.categories?.categories || DEFAULT_CATEGORIES,
      marketLabels: cached.marketLabels?.labels || DEFAULT_MARKET_LABELS,
      loadedAt: Date.now(),
    };

    return {
      suggestedQuestions: memoryCache.suggestedQuestions || DEFAULT_SUGGESTED_QUESTIONS,
      assetTemplates: memoryCache.assetTemplates || DEFAULT_ASSET_TEMPLATES,
      categories: memoryCache.categories || DEFAULT_CATEGORIES,
      marketLabels: memoryCache.marketLabels || DEFAULT_MARKET_LABELS,
    };
  }

  // 3. Fetch from R2 (cache expired or doesn't exist)
  console.log('🌐 Fetching fresh R2 config...');
  
  try {
    const [questionsData, categoriesData, labelsData] = await Promise.all([
      fetchJSON<{ questions: SuggestedQuestion[]; assetTemplates: string[] }>(CONFIG_URLS.suggestedQuestions),
      fetchJSON<{ categories: Category[] }>(CONFIG_URLS.categories),
      fetchJSON<{ labels: Record<string, string> }>(CONFIG_URLS.marketLabels),
    ]);

    // Save to localStorage
    if (questionsData) setToLocalStorage(CACHE_KEYS.suggestedQuestions, questionsData);
    if (categoriesData) setToLocalStorage(CACHE_KEYS.categories, categoriesData);
    if (labelsData) setToLocalStorage(CACHE_KEYS.marketLabels, labelsData);
    setToLocalStorage(CACHE_KEYS.timestamp, Date.now());

    // Update memory cache
    memoryCache = {
      suggestedQuestions: questionsData?.questions || DEFAULT_SUGGESTED_QUESTIONS,
      assetTemplates: questionsData?.assetTemplates || DEFAULT_ASSET_TEMPLATES,
      categories: categoriesData?.categories || DEFAULT_CATEGORIES,
      marketLabels: labelsData?.labels || DEFAULT_MARKET_LABELS,
      loadedAt: Date.now(),
    };

    console.log('✅ R2 config loaded and cached');

    return {
      suggestedQuestions: memoryCache.suggestedQuestions || DEFAULT_SUGGESTED_QUESTIONS,
      assetTemplates: memoryCache.assetTemplates || DEFAULT_ASSET_TEMPLATES,
      categories: memoryCache.categories || DEFAULT_CATEGORIES,
      marketLabels: memoryCache.marketLabels || DEFAULT_MARKET_LABELS,
    };
  } catch (error) {
    console.error('Failed to fetch R2 config, using defaults:', error);
    return {
      suggestedQuestions: DEFAULT_SUGGESTED_QUESTIONS,
      assetTemplates: DEFAULT_ASSET_TEMPLATES,
      categories: DEFAULT_CATEGORIES,
      marketLabels: DEFAULT_MARKET_LABELS,
    };
  }
}

// ============================================
// PRELOAD (call on app initialization)
// ============================================

let preloadPromise: Promise<void> | null = null;

export async function preloadR2Config(): Promise<void> {
  // Prevent multiple simultaneous preloads
  if (preloadPromise) return preloadPromise;
  
  preloadPromise = loadConfig().then(() => {
    preloadPromise = null;
  });
  
  return preloadPromise;
}

// ============================================
// HOOK
// ============================================

export function useR2Config(): R2Config {
  const [isLoading, setIsLoading] = useState(!memoryCache.loadedAt);
  const [error, setError] = useState<string | null>(null);
  const [config, setConfig] = useState<{
    suggestedQuestions: SuggestedQuestion[];
    assetTemplates: string[];
    categories: Category[];
    marketLabels: Record<string, string>;
  }>(() => {
    // Initialize with memory cache if available, otherwise defaults
    if (memoryCache.loadedAt) {
      return {
        suggestedQuestions: memoryCache.suggestedQuestions || DEFAULT_SUGGESTED_QUESTIONS,
        assetTemplates: memoryCache.assetTemplates || DEFAULT_ASSET_TEMPLATES,
        categories: memoryCache.categories || DEFAULT_CATEGORIES,
        marketLabels: memoryCache.marketLabels || DEFAULT_MARKET_LABELS,
      };
    }
    return {
      suggestedQuestions: DEFAULT_SUGGESTED_QUESTIONS,
      assetTemplates: DEFAULT_ASSET_TEMPLATES,
      categories: DEFAULT_CATEGORIES,
      marketLabels: DEFAULT_MARKET_LABELS,
    };
  });

  useEffect(() => {
    // If memory cache is valid, we're already initialized
    if (memoryCache.loadedAt && Date.now() - memoryCache.loadedAt < CACHE_DURATION_MS) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    
    loadConfig()
      .then((loaded) => {
        setConfig(loaded);
        setError(null);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to load config');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  return {
    ...config,
    isLoading,
    error,
  };
}

// ============================================
// UTILITY: Clear cache (for testing/admin)
// ============================================

export function clearR2ConfigCache(): void {
  // Clear memory cache
  memoryCache = {
    suggestedQuestions: null,
    assetTemplates: null,
    categories: null,
    marketLabels: null,
    loadedAt: null,
  };
  
  // Clear localStorage
  Object.values(CACHE_KEYS).forEach((key) => {
    localStorage.removeItem(key);
  });
  
  console.log('🗑️ R2 config cache cleared');
}

// ============================================
// UTILITY: Force refresh from R2
// ============================================

export async function refreshR2Config(): Promise<void> {
  clearR2ConfigCache();
  await loadConfig();
}
