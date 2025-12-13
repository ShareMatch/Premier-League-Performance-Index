import React from 'react';
import InfoPopup from './InfoPopup';
import { getMarketInfo } from '../lib/marketInfo';

interface HeaderProps {
  title: string;
  market: string; // e.g., 'EPL', 'F1', 'UCL', etc.
}

const Header: React.FC<HeaderProps> = ({ title, market }) => {
  const marketInfo = getMarketInfo(market);

  return (
    <div className="flex items-center justify-between py-3 sm:py-4">
      {/* Left: Title & Subtitle */}
      <div className="flex flex-col">
        <h1 className="text-lg sm:text-xl lg:text-2xl font-bold bg-[#005430] text-white px-3 py-1 rounded-lg shadow-lg shadow-[#005430]/20 inline-block">
          {title} Performance Index
        </h1>
        <p className="text-gray-400 text-xs sm:text-sm">Tokenised Asset Marketplace</p>
      </div>

      {/* Right: Market Status & Info Icon */}
      <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
        <span
          className={`px-2 sm:px-2.5 py-1 text-[10px] sm:text-xs font-bold rounded border whitespace-nowrap ${marketInfo.isOpen
            ? 'bg-[#005430] text-white border-[#005430]'
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
          iconSize={18}
        />
      </div>
    </div>
  );
};

export default Header;
