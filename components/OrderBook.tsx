
import React from 'react';
import type { Team } from '../types';
import OrderBookRow from './OrderBookRow';

interface OrderBookProps {
  teams: Team[];
  onSelectOrder: (team: Team, type: 'buy' | 'sell') => void;
}

const OrderBook: React.FC<OrderBookProps> = ({ teams, onSelectOrder }) => {
  return (
    <div className="bg-gray-800/50 rounded-lg shadow-2xl shadow-gray-950/50 overflow-hidden border border-gray-700">
      <div className="grid grid-cols-3 gap-4 p-4 font-bold text-gray-400 border-b border-gray-700 text-sm sm:text-base">
        <div className="text-left">Asset</div>
        <div className="text-center">Sell Price (%)</div>
        <div className="text-right">Buy Price (%)</div>
      </div>
      <div className="divide-y divide-gray-700/50">
        {teams.map(team => (
          <OrderBookRow key={team.id} team={team} onSelectOrder={onSelectOrder} />
        ))}
      </div>
    </div>
  );
};

export default OrderBook;