
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
      case 'f1': return <Car className="w-[clamp(1rem,2.5vw,1.25rem)] h-[clamp(1rem,2.5vw,1.25rem)]" style={{ color: team.color }} />;
      case 'football': return <Shield className="w-[clamp(1rem,2.5vw,1.25rem)] h-[clamp(1rem,2.5vw,1.25rem)]" style={{ color: team.color }} />;
      default: return <Trophy className="w-[clamp(1rem,2.5vw,1.25rem)] h-[clamp(1rem,2.5vw,1.25rem)]" style={{ color: team.color || '#6B7280' }} />;
    }
  };

  const logoUrl = team.market ? getLogoUrl(team.name || '', team.market, team.id) : null;

  return (
    <div data-testid={`order-book-row-${team.id}`} className={`grid grid-cols-3 gap-[clamp(0.5rem,1.5vw,1rem)] items-center p-[clamp(0.5rem,1.25vw,0.75rem)] transition-colors duration-500 ${flashClass}`}>
      {/* Asset name with logo */}
      <div
        className="font-medium text-gray-200 text-left flex items-center gap-[clamp(0.375rem,1vw,0.5rem)] min-w-0 cursor-pointer hover:text-white transition-colors"
        onClick={() => onViewAsset?.(team)}
      >
        {logoUrl && !logoError ? (
          <div className="w-[clamp(1.75rem,5vw,2.25rem)] h-[clamp(1.75rem,5vw,2.25rem)] rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center">
            <img
              src={logoUrl}
              alt={`${team.name} logo`}
              className="w-full h-full object-contain rounded-full"
              onError={() => setLogoError(true)}
            />
          </div>
        ) : (
          <div
            className="w-[clamp(1.75rem,5vw,2.25rem)] h-[clamp(1.75rem,5vw,2.25rem)] rounded-full flex items-center justify-center flex-shrink-0 border border-white/20"
            style={{ backgroundColor: team.color || '#6B7280' }}
          >
            <span className="text-white text-[clamp(0.5rem,1.25vw,0.75rem)] font-bold">
              {team.name?.charAt(0) || '?'}
            </span>
          </div>
        )}
        <span className="text-[clamp(0.55rem,1.4vw,0.875rem)] leading-tight break-words">{team.name || 'Unknown'}</span>
      </div>

      {team.is_settled ? (
        <div className="col-span-2 flex flex-col items-end pr-[clamp(0.25rem,0.75vw,0.5rem)]">
          <span className="text-gray-400 text-[clamp(0.5rem,1vw,0.75rem)] font-medium uppercase tracking-wider">Settled</span>
          <div className="flex items-center gap-[clamp(0.25rem,0.75vw,0.5rem)]">
            <span className="text-gray-500 text-[clamp(0.5rem,1vw,0.75rem)]">{team.settled_date || 'Dec 8, 2025'}</span>
            <span className={`text-[clamp(0.75rem,1.75vw,1.125rem)] font-bold ${team.bid >= 100 ? 'text-brand-emerald500' : 'text-gray-400'}`}>
              ${team.bid.toFixed(1)}
            </span>
          </div>
        </div>
      ) : (
        <>
          <div
            className="text-center rounded-[clamp(0.25rem,0.5vw,0.375rem)] transition-colors hover:bg-gray-700/50 cursor-pointer py-[clamp(0.375rem,1vw,0.5rem)] -my-[clamp(0.375rem,1vw,0.5rem)]"
            onClick={() => onSelectOrder(team, 'sell')}
            role="button"
            tabIndex={0}
            aria-label={`Sell ${team.name} Performance Index at $${team.bid.toFixed(1)}`}
            data-testid={`sell-button-${team.id}`}
          >
            <span className="font-semibold text-red-400 text-[clamp(0.6rem,1.5vw,0.875rem)]">${team.bid.toFixed(1)}</span>
          </div>
          <div
            className="text-center rounded-[clamp(0.25rem,0.5vw,0.375rem)] transition-colors hover:bg-gray-700/50 cursor-pointer py-[clamp(0.375rem,1vw,0.5rem)] -my-[clamp(0.375rem,1vw,0.5rem)]"
            onClick={() => onSelectOrder(team, 'buy')}
            role="button"
            tabIndex={0}
            aria-label={`Buy ${team.name} Performance Index at $${team.offer.toFixed(1)}`}
            data-testid={`buy-button-${team.id}`}
          >
            <span className="font-semibold bg-[#005430] text-white px-[clamp(0.375rem,1vw,0.5rem)] py-[clamp(0.125rem,0.5vw,0.25rem)] rounded-[clamp(0.125rem,0.375vw,0.25rem)] text-[clamp(0.6rem,1.5vw,0.875rem)]">${team.offer.toFixed(1)}</span>
          </div>
        </>
      )}
    </div>
  );
};

export default OrderBookRow;
