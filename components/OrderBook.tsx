
import React from 'react';
import type { Team } from '../types';
import OrderBookRow from './OrderBookRow';

interface OrderBookProps {
  teams: Team[];
  onSelectOrder: (team: Team, type: 'buy' | 'sell') => void;
}

const OrderBook: React.FC<OrderBookProps> = ({ teams, onSelectOrder }) => {
  return (
    <div data-testid="order-book" className="bg-gray-800/50 rounded-lg shadow-2xl shadow-gray-950/50 overflow-hidden border border-gray-700 flex flex-col h-full">
      {/* Header */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4 p-2 sm:p-3 md:p-4 font-bold text-gray-400 border-b border-gray-700 text-[10px] sm:text-xs md:text-sm flex-shrink-0 bg-gray-800/80 backdrop-blur-sm">
        <div className="text-left">Asset</div>
        <div className="text-center">Sell</div>
        <div className="text-center sm:text-right">Buy</div>
      </div>
      {/* Scrollable list */}
      <div className="divide-y divide-gray-700/50 overflow-y-auto flex-1 scrollbar-hide">
        {teams.map(team => (
          <OrderBookRow key={team.id} team={team} onSelectOrder={onSelectOrder} />
        ))}
      </div>
    </div>
  );
};

export default OrderBook;
