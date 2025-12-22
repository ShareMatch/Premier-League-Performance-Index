
import React from 'react';
import type { Team } from '../types';
import OrderBookRow from './OrderBookRow';

interface OrderBookProps {
  teams: Team[];
  onSelectOrder: (team: Team, type: 'buy' | 'sell') => void;
}

const OrderBook: React.FC<OrderBookProps> = ({ teams, onSelectOrder }) => {
  return (
    <div className="bg-gray-800/50 rounded-lg shadow-2xl shadow-gray-950/50 overflow-hidden border border-gray-700 flex flex-col h-full min-h-[300px] sm:min-h-[400px] md:min-h-[500px] lg:min-h-0">
      {/* Responsive header - smaller on mobile */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4 p-2 sm:p-3 md:p-4 font-bold text-gray-400 border-b border-gray-700 text-[10px] xs:text-xs sm:text-sm flex-shrink-0 bg-gray-800/80 backdrop-blur-sm z-10">
        <div className="text-left">Asset</div>
        <div className="text-center">Sell</div>
        <div className="text-center sm:text-right">Buy</div>
      </div>
      {/* Scrollable content with responsive max-height for smaller screens */}
      <div className="divide-y divide-gray-700/50 overflow-y-auto flex-1 scrollbar-hide max-h-[calc(100vh-300px)] sm:max-h-[calc(100vh-250px)] md:max-h-[calc(100vh-200px)] lg:max-h-none">
        {teams.map(team => (
          <OrderBookRow key={team.id} team={team} onSelectOrder={onSelectOrder} />
        ))}
      </div>
    </div>
  );
};

export default OrderBook;
