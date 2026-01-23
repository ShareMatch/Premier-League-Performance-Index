import React from "react";
import InfoPopup from "./InfoPopup";
import { getMarketInfo } from "../lib/marketInfo";
import { getIndexAvatarUrl } from "../lib/logoHelper";
import { ArrowLeft } from "lucide-react";

interface HeaderProps {
  title: string;
  market: string; // e.g., 'EPL', 'F1', 'UCL', etc.
  seasonStartDate?: string; // From Supabase market_index_seasons.start_date
  seasonEndDate?: string; // From Supabase market_index_seasons.end_date
  seasonStage?: string; // 'open' | 'closed' | 'settled'
  onBack?: () => void;
}

const Header: React.FC<HeaderProps> = ({
  title,
  market,
  seasonStartDate,
  seasonEndDate,
  seasonStage,
  onBack,
}) => {
  const marketInfo = getMarketInfo(
    market,
    seasonStartDate,
    seasonEndDate,
    seasonStage
  );
  const indexAvatarUrl = getIndexAvatarUrl(market);

  return (
    <div className="flex items-center justify-between py-3 sm:py-4 gap-3 sm:gap-4">
      {/* Left: Title & Subtitle */}
      <div className="flex items-center gap-[clamp(0.5rem,2vw,1rem)] min-w-0">
        {onBack && (
          <button
            onClick={onBack}
            className="p-1 hover:bg-white/5 rounded-full transition-colors flex-shrink-0"
            aria-label="Go back"
          >
            <ArrowLeft className="w-[clamp(1rem,4vw,1.25rem)] h-[clamp(1rem,4vw,1.25rem)] text-gray-400" />
          </button>
        )}
        {/* Index Avatar */}
        {indexAvatarUrl && (
          <div className="w-[clamp(2.5rem,10vw,5rem)] h-[clamp(2.5rem,10vw,5rem)] rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0 overflow-visible">
            <img
              src={indexAvatarUrl}
              alt={`${market} Index Avatar`}
              className="w-full h-full object-contain block"
            />
          </div>
        )}

        <div className="flex flex-col min-w-0">
          <h1 className="text-[clamp(1rem,4.5vw,1.875rem)] font-bold text-white tracking-tight leading-tight">
            {title.replace(/ Performance Index$/i, "")}{" "}
            <span className="text-emerald-500 block sm:inline">Performance Index</span>
          </h1>
          <p className="text-gray-400 text-[clamp(0.6rem,1.5vw,0.875rem)] mt-0.5">
            Tokenised Asset Marketplace
          </p>
        </div>
      </div>

      {/* Right: Market Status & Info Icon */}
      <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
        <span
          className={`px-2 sm:px-2.5 md:px-3 py-1 sm:py-1.5 text-[10px] sm:text-xs font-bold rounded sm:rounded-md border whitespace-nowrap ${marketInfo.isOpen
            ? "bg-[#005430] text-white border-[#005430] animate-pulse"
            : "bg-amber-500/10 text-amber-500 border-amber-500/30"
            }`}
        >
          {marketInfo.isOpen ? "Market Open" : "Market Closed"}
        </span>
        <InfoPopup
          title={marketInfo.title}
          content={marketInfo.content}
          seasonDates={marketInfo.seasonDates}
          isMarketOpen={marketInfo.isOpen}
          iconSize={24}
        />
      </div>
    </div>
  );
};

export default Header;
