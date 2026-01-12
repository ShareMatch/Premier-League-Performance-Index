import React from 'react';
import InfoPopup from './InfoPopup';
import { getMarketInfo } from '../lib/marketInfo';
import { getIndexAvatarUrl } from '../lib/logoHelper';

interface HeaderProps {
  title: string;
  market: string; // e.g., 'EPL', 'F1', 'UCL', etc.
  seasonStartDate?: string; // From Supabase market_index_seasons.start_date
  seasonEndDate?: string;   // From Supabase market_index_seasons.end_date
  seasonStage?: string;     // 'open' | 'closed' | 'settled'
}

const Header: React.FC<HeaderProps> = ({ title, market }) => {
  const marketInfo = getMarketInfo(market);
  const indexAvatarUrl = getIndexAvatarUrl(market);

  return (
    <div className="flex items-center justify-between py-3 sm:py-4">
      {/* Left: Title & Subtitle */}
      <div className="flex items-center gap-3">
        {/* Index Avatar */}
        {indexAvatarUrl && (
          <div className="w-[64px] h-[64px] sm:w-[80px] sm:h-[80px] rounded-xl flex items-center justify-center flex-shrink-0 overflow-visible">
            <img
              src={indexAvatarUrl}
              alt={`${market} Index Avatar`}
              className="w-full h-full object-contain block"
            />
          </div>
        )}

        <div className="flex flex-col">
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight leading-tight">
            {title.replace(/ Performance Index$/i, '')} <span className="text-emerald-500">Performance Index</span>
          </h1>
          <p className="text-gray-400 text-xs sm:text-sm">Tokenised Asset Marketplace</p>
        </div>
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
