export type League = 'EPL' | 'UCL' | 'WC' | 'SPL' | 'F1' | 'NBA' | 'NFL' | 'T20' | 'Eurovision' | 'HOME' | 'AI_ANALYTICS';

export interface Team {
  id: number;
  name: string;
  bid: number;
  offer: number;
  lastChange: 'up' | 'down' | 'none';
  color?: string;
  category?: 'football' | 'f1' | 'basketball' | 'american_football' | 'cricket' | 'global_events' | 'other';
  market?: string; // EPL, UCL, WC, SPL, F1, NBA, NFL, T20, Eurovision
  is_settled?: boolean;
  settled_date?: string;
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
  asset_id: string;
  asset_name: string;
  quantity: number;
  average_buy_price: number;
  current_value?: number;
}

export interface Transaction {
  id: string;
  user_id: string;
  asset_id: string;
  asset_name: string;
  type: 'buy' | 'sell' | 'settlement' | 'deposit' | 'withdrawal' | 'trade_entry';
  direction: 'buy' | 'sell';
  price_per_unit: number;
  quantity: number;
  amount: number;
  trade_status: 'pending' | 'completed' | 'failed' | 'cancelled' | 'win' | 'loss' | 'success';
  created_at: string;
}
