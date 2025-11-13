
import React, { useState, useEffect } from 'react';
import type { Team } from '../types';

interface OrderBookRowProps {
  team: Team;
  onSelectOrder: (team: Team, type: 'buy' | 'sell') => void;
}

const OrderBookRow: React.FC<OrderBookRowProps> = ({ team, onSelectOrder }) => {
  const [flash, setFlash] = useState<'up' | 'down' | 'none'>('none');

  useEffect(() => {
    if (team.lastChange !== 'none') {
      setFlash(team.lastChange);
      const timer = setTimeout(() => {
        setFlash('none');
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [team.lastChange, team.bid, team.offer]);
  
  const flashClass = flash === 'up' 
    ? 'bg-[#3AA189]/20' 
    : flash === 'down' 
    ? 'bg-red-500/20' 
    : '';

  return (
    <div className={`grid grid-cols-3 gap-4 items-center p-3 sm:p-4 text-sm sm:text-base transition-colors duration-500 ${flashClass}`}>
      <div className="font-medium text-gray-200 text-left">{team.name}</div>
      <div 
        className="text-center rounded-md transition-colors hover:bg-gray-700/50 cursor-pointer py-2 -my-2"
        onClick={() => onSelectOrder(team, 'sell')}
        role="button"
        tabIndex={0}
        aria-label={`Sell ${team.name} Performance Index at ${team.bid.toFixed(1)}`}
      >
        <span className="font-semibold text-red-400">{team.bid.toFixed(1)}</span>
      </div>
      <div 
        className="text-right rounded-md transition-colors hover:bg-gray-700/50 cursor-pointer py-2 -my-2"
        onClick={() => onSelectOrder(team, 'buy')}
        role="button"
        tabIndex={0}
        aria-label={`Buy ${team.name} Performance Index at ${team.offer.toFixed(1)}`}
      >
        <span className="font-semibold text-[#3AA189]">{team.offer.toFixed(1)}</span>
      </div>
    </div>
  );
};

export default OrderBookRow;