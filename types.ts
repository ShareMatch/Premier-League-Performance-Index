export type League = 'EPL' | 'UCL' | 'WC' | 'SPL' | 'ISL' | 'F1' | 'NBA' | 'NFL' | 'T20' | 'Eurovision' | 'HOME' | 'AI_ANALYTICS' | 'ALL_MARKETS' | 'NEW_MARKETS' | 'MY_DETAILS';

export interface Team {
  id: string; // Now UUID from market_index_trading_assets
  asset_id?: string; // Reference to static assets table
  name: string;
  team?: string;
  bid: number;
  offer: number;
  lastChange: 'up' | 'down' | 'none';
  color?: string;
  logo_url?: string;
  category?: 'football' | 'f1' | 'basketball' | 'american_football' | 'cricket' | 'global_events' | 'other';
  market?: string; // EPL, UCL, WC, SPL, F1, NBA, NFL, T20, Eurovision
  market_trading_asset_id?: string; // New field for trading asset reference
  is_settled?: boolean;
  settled_date?: string;
  // Additional fields for richer data
  market_group?: string;
  market_sub_group?: string;
  index_name?: string;
  index_token?: string;
  season_status?: string;
  season_start_date?: string;
  season_end_date?: string;
  season_stage?: string; // 'open' | 'closed' | 'settled'
  units?: number;
}

export interface Order {
  team: Team;
  type: 'buy' | 'sell';
  price: number;
  holding?: number;
  quantity?: number;
  maxQuantity?: number;
}

export interface Wallet {
  id: string;
  balance: number;
  reserved_cents: number;
  available_cents: number;
  currency: string;
}

export interface Position {
  id: string;
  market_trading_asset_id: string;
  quantity: number;
  average_buy_price: number;
  current_value?: number;
  // Derived fields (not in DB but useful for UI)
  asset_name?: string;
  asset_id?: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  market_trading_asset_id: string;
  type: 'buy' | 'sell' | 'settlement' | 'deposit' | 'withdrawal' | 'trade_entry';
  direction: 'buy' | 'sell';
  price_per_unit: number;
  quantity: number;
  amount: number;
  trade_status: 'pending' | 'completed' | 'failed' | 'cancelled' | 'win' | 'loss' | 'success';
  created_at: string;
  // Derived fields (not in DB but useful for UI)
  asset_name?: string;
  asset_id?: string;
}
