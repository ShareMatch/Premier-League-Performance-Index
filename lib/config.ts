// Centralized configuration for external services
// Update these values in one place when changing providers/keys.

// Supabase client config - Read from environment variables
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://hsmfanlcebcphogqqyzj.supabase.co';
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhzbWZhbmxjZWJjcGhvZ3FxeXpqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg0MTQ0MTQsImV4cCI6MjA3Mzk5MDQxNH0.9rdYuJjECPhuscZoSE7ROVMPf3bpHuwHtx0vMQbOFvg';

// SendGrid API config
export const SENDGRID_API_URL = 'https://api.sendgrid.com/v3/mail/send';


/**
 * Application Configuration
 * 
 * Central place for all configurable settings.
 * Change values here to update behavior across the app.
 */

// ============================================
// SESSION & SECURITY CONFIG
// ============================================

export const SESSION_CONFIG = {
  /**
   * Time in milliseconds before showing the inactivity warning
   * Default: 60 minutes (60 * 60 * 1000)
   * For testing, you can set to 30 seconds (30 * 1000)
   */
  INACTIVITY_TIMEOUT_MS: 60 * 60 * 1000, // 60 minutes
  
  /**
   * Countdown time in seconds shown in the warning modal
   * User has this many seconds to click "I'm still here" before auto-logout
   * Default: 60 seconds
   */
  WARNING_COUNTDOWN_SECONDS: 60, // 1 minute
};

// ============================================
// TRADING CONFIG
// ============================================

export const TRADING_CONFIG = {
  /**
   * Processing fee percentage (0.05 = 5%)
   * This fee is charged on sell transactions only
   */
  FEE_RATE: 0.05, // 5%
  
  /**
   * Minimum trade amount in dollars
   */
  MIN_TRADE_AMOUNT: 1,
};

// ============================================
// API & NETWORK CONFIG
// ============================================

export const API_CONFIG = {
  /**
   * Default timeout for API requests in milliseconds
   */
  REQUEST_TIMEOUT_MS: 30 * 1000, // 30 seconds
  
  /**
   * Number of retry attempts for failed requests
   */
  MAX_RETRIES: 3,
};

// ============================================
// UI CONFIG
// ============================================

export const UI_CONFIG = {
  /**
   * Debounce time for search inputs in milliseconds
   */
  SEARCH_DEBOUNCE_MS: 300,
  
  /**
   * Auto-refresh interval for data in milliseconds
   */
  DATA_REFRESH_INTERVAL_MS: 30 * 1000, // 30 seconds
};

// ============================================
// FEATURE FLAGS
// ============================================

export const FEATURES = {
  /**
   * Enable/disable inactivity timeout feature
   */
  INACTIVITY_TIMEOUT_ENABLED: true,
  
  /**
   * Enable/disable KYC requirement
   */
  KYC_REQUIRED: true,
};
