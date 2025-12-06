export interface Team {
  id: number;
  name: string;
  bid: number;
  offer: number;
  lastChange: 'up' | 'down' | 'none';
  color?: string;
  category?: 'football' | 'f1' | 'basketball' | 'american_football' | 'other';
  market?: string; // EPL, UCL, WC, SPL, F1, NBA, NFL
}

export interface Order {
  team: Team;
  type: 'buy' | 'sell';
  price: number;
  holding?: number;
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
