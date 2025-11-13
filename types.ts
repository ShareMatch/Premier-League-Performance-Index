export interface Team {
  id: number;
  name: string;
  bid: number;
  offer: number;
  lastChange: 'up' | 'down' | 'none';
}

export interface Order {
  team: Team;
  type: 'buy' | 'sell';
  price: number;
}
