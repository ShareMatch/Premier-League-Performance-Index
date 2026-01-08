import React from 'react';
import InfoPopup from './InfoPopup';
import { getMarketInfo } from '../lib/marketInfo';

interface HeaderProps {
  title: string;
  market: string; // e.g., 'EPL', 'F1', 'UCL', etc.
  seasonStartDate?: string; // From Supabase market_index_seasons.start_date
  seasonEndDate?: string;   // From Supabase market_index_seasons.end_date
  seasonStage?: string;     // 'open' | 'closed' | 'settled'
}

const Header: React.FC<HeaderProps> = ({ title, market, seasonStartDate, seasonEndDate, seasonStage }) => {
  const marketInfo = getMarketInfo(market, seasonStartDate, seasonEndDate, seasonStage);

  return (
    <div className="flex items-center justify-between py-3 sm:py-4">
      {/* Left: Title & Subtitle */}
      <div className="flex flex-col">
        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight leading-tight">
          {title.replace(/ Performance Index$/i, '')} <span className="text-emerald-500">Performance Index</span>
        </h1>
        <p className="text-gray-400 text-xs sm:text-sm">Tokenised Asset Marketplace</p>
      </div>

      {/* Right: Market Status & Info Icon */}
      <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
        <span
          className={`px-2 sm:px-2.5 py-1 text-[10px] sm:text-xs font-bold rounded border whitespace-nowrap ${marketInfo.isOpen
            ? 'bg-[#005430] text-white border-[#005430] animate-pulse'
            : 'bg-amber-500/10 text-amber-500 border-amber-500/30'
            }`}
        >
          {marketInfo.isOpen ? 'Market Open' : 'Market Closed'}
        </span>
        <InfoPopup
          title={marketInfo.title}
          content={marketInfo.content}
          seasonDates={marketInfo.seasonDates}
          isMarketOpen={marketInfo.isOpen}
          iconSize={25}
        />
      </div>
    </div>
  );
};

export default Header;
