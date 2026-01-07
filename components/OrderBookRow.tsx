
import React, { useState, useEffect } from 'react';
import { Shield, Car, Trophy } from 'lucide-react';
import type { Team } from '../types';
import { getLogoUrl } from '../lib/logoHelper';

interface OrderBookRowProps {
  team: Team;
  onSelectOrder: (team: Team, type: 'buy' | 'sell') => void;
  onViewAsset?: (team: Team) => void;
}

const OrderBookRow: React.FC<OrderBookRowProps> = ({ team, onSelectOrder, onViewAsset }) => {
  const [flash, setFlash] = useState<'up' | 'down' | 'none'>('none');
  const [logoError, setLogoError] = useState(false);

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
    ? 'bg-[#005430]/20'
    : flash === 'down'
      ? 'bg-red-500/20'
      : '';

  const getIcon = () => {
    switch (team.category) {
      case 'f1': return <Car className="w-5 h-5" style={{ color: team.color }} />;
      case 'football': return <Shield className="w-5 h-5" style={{ color: team.color }} />;
      default: return <Trophy className="w-5 h-5" style={{ color: team.color || '#6B7280' }} />;
    }
  };

  const logoUrl = team.market ? getLogoUrl(team.name || '', team.market, team.id) : null;

  return (
    <div data-testid={`order-book-row-${team.id}`} className={`grid grid-cols-3 gap-2 sm:gap-4 items-center p-2 sm:p-3 text-xs sm:text-sm transition-colors duration-500 ${flashClass}`}>
      {/* Asset name with logo */}
      <div
        className="font-medium text-gray-200 text-left flex items-center gap-1.5 sm:gap-2 min-w-0 cursor-pointer hover:text-white transition-colors"
        onClick={() => onViewAsset?.(team)}
      >
        {logoUrl && !logoError ? (
          <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center">
            <img
              src={logoUrl}
              alt={`${team.name} logo`}
              className="w-full h-full object-contain rounded-full"
              onError={() => setLogoError(true)}
            />
          </div>
        ) : (
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 border border-white/20"
            style={{ backgroundColor: team.color || '#6B7280' }}
          >
            <span className="text-white text-xs font-bold">
              {team.name?.charAt(0) || '?'}
            </span>
          </div>
        )}
        <span className="truncate text-xs sm:text-sm">{team.name || 'Unknown'}</span>
      </div>

      {team.is_settled ? (
        <div className="col-span-2 flex flex-col items-end pr-1 sm:pr-2">
          <span className="text-gray-400 text-[10px] sm:text-xs font-medium uppercase tracking-wider">Settled</span>
          <div className="flex items-center gap-1 sm:gap-2">
            <span className="text-gray-500 text-[10px] sm:text-xs hidden sm:inline">{team.settled_date || 'Dec 8, 2025'}</span>
            <span className={`text-sm sm:text-lg font-bold ${team.bid >= 100 ? 'text-brand-emerald500' : 'text-gray-400'}`}>
              ${team.bid.toFixed(1)}
            </span>
          </div>
        </div>
      ) : (
        <>
          <div
            className="text-center rounded-md transition-colors hover:bg-gray-700/50 cursor-pointer py-1.5 sm:py-2 -my-1.5 sm:-my-2"
            onClick={() => onSelectOrder(team, 'sell')}
            role="button"
            tabIndex={0}
            aria-label={`Sell ${team.name} Performance Index at $${team.bid.toFixed(1)}`}
            data-testid={`sell-button-${team.id}`}
          >
            <span className="font-semibold text-red-400 text-xs sm:text-sm">${team.bid.toFixed(1)}</span>
          </div>
          <div
            className="text-center rounded-md transition-colors hover:bg-gray-700/50 cursor-pointer py-1.5 sm:py-2 -my-1.5 sm:-my-2"
            onClick={() => onSelectOrder(team, 'buy')}
            role="button"
            tabIndex={0}
            aria-label={`Buy ${team.name} Performance Index at $${team.offer.toFixed(1)}`}
            data-testid={`buy-button-${team.id}`}
          >
            <span className="font-semibold bg-[#005430] text-white px-2 py-1 rounded text-xs sm:text-sm">${team.offer.toFixed(1)}</span>
          </div>
        </>
      )}
    </div>
  );
};

export default OrderBookRow;
