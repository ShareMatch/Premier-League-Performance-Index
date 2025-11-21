export interface Team {
  id: number;
  name: string;
  bid: number;
  offer: number;
  lastChange: 'up' | 'down' | 'none';
  color?: string;
  category?: 'football' | 'f1' | 'other';
}

export interface Order {
  team: Team;
  type: 'buy' | 'sell';
  price: number;
  holding?: number;
}
