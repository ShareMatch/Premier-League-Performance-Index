
import React from 'react';
import { ArrowLeft } from 'lucide-react';
import type { Team } from '../types';
import OrderBookRow from './OrderBookRow';
import { OrderBookRowSkeleton } from './Skeleton';

interface OrderBookProps {
  teams: Team[];
  onSelectOrder: (team: Team, type: 'buy' | 'sell') => void;
  onViewAsset?: (team: Team) => void;
  onBack?: () => void;
  title?: string;
  /** Show skeleton loading state */
  loading?: boolean;
  /** Number of skeleton rows to show when loading */
  skeletonCount?: number;
}

const OrderBook: React.FC<OrderBookProps> = ({
  teams,
  onSelectOrder,
  onViewAsset,
  onBack,
  title,
  loading = false,
  skeletonCount = 10,
}) => {
  return (
    <div data-testid="order-book" className="bg-gray-800/50 rounded-[clamp(0.375rem,1vw,0.5rem)] shadow-2xl shadow-gray-950/50 overflow-hidden border border-gray-700 flex flex-col">
      {/* Back Button & Title */}
      {(onBack || title) && (
        <div className="flex items-center gap-[clamp(0.5rem,2vw,1rem)] p-[clamp(0.5rem,1.5vw,1rem)] border-b border-gray-700 bg-gray-800/80 backdrop-blur-sm">
          {onBack && (
            <button
              onClick={onBack}
              className="lg:hidden p-1 hover:bg-white/5 rounded-full text-gray-400 hover:text-white transition-all flex-shrink-0 mr-1"
              aria-label="Go back"
            >
              <ArrowLeft className="w-[clamp(1rem,4vw,1.25rem)] h-[clamp(1rem,4vw,1.25rem)]" />
            </button>
          )}
          {title && (
            <h2 className="text-[clamp(0.875rem,2.5vw,1.125rem)] font-bold text-white">
              {title}
            </h2>
          )}
        </div>
      )}
      {/* Header */}
      <div className="grid grid-cols-3 gap-[clamp(0.5rem,1.5vw,1rem)] p-[clamp(0.5rem,1.25vw,1rem)] font-bold text-gray-400 border-b border-gray-700 text-[clamp(0.5rem,1.25vw,0.875rem)] flex-shrink-0 bg-gray-800/80 backdrop-blur-sm">
        <div className="text-left">Asset</div>
        <div className="text-center">Sell</div>
        <div className="text-center">Buy</div>
      </div>
      {/* List - scrolls with page, not internally */}
      <div className="divide-y divide-gray-700/50">
        {loading ? (
          <OrderBookRowSkeleton count={skeletonCount} />
        ) : (
          teams.map(team => (
            <OrderBookRow key={team.id} team={team} onSelectOrder={onSelectOrder} onViewAsset={onViewAsset} />
          ))
        )}
      </div>
    </div>
  );
};

export default OrderBook;
