import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Info, X } from 'lucide-react';

export interface InfoPopupProps {
  /** The title shown in the popup header */
  title?: string;
  /** Main content/description text */
  content: string;
  /** Season/Duration dates as a single string */
  seasonDates?: string;
  /** Whether the market is open or closed */
  isMarketOpen?: boolean;
  /** Size of the info icon */
  iconSize?: number;
  /** Custom icon className */
  iconClassName?: string;
}

const InfoPopup: React.FC<InfoPopupProps> = ({
  title = 'Information',
  content,
  seasonDates,
  isMarketOpen,
  iconSize = 16,
  iconClassName = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const closeTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    closeTimerRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 150);
  };

  const closeModal = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setIsOpen(false);
  };

  // Helper to parse dates and calculate progress
  const getProgress = (dateRange: string) => {
    try {
      const [startStr, endStr] = dateRange.split(' - ').map(s => s.trim());
      const start = new Date(startStr);
      const end = new Date(endStr);
      const now = new Date();

      if (isNaN(start.getTime()) || isNaN(end.getTime())) return null;

      const totalDuration = end.getTime() - start.getTime();
      const elapsed = now.getTime() - start.getTime();

      let percentage = (elapsed / totalDuration) * 100;
      percentage = Math.max(0, Math.min(100, percentage)); // Clamp between 0 and 100

      const daysRemaining = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      const formatShortDate = (d: Date) => {
        return d.toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
        });
      };

      return {
        percentage,
        startStr: formatShortDate(start),
        endStr: formatShortDate(end),
        daysRemaining
      };
    } catch (e) {
      return null;
    }
  };

  const progressInfo = seasonDates ? getProgress(seasonDates) : null;

  // Modal content - rendered via portal to document.body
  const modalContent = isOpen ? (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-2 sm:p-3 md:p-4 animate-in fade-in duration-200 pointer-events-none"
      onClick={(e) => {
        e.stopPropagation();
        closeModal();
      }}
      data-testid="info-popup-overlay"
    >
      <div
        className="max-w-[85vw] sm:max-w-sm md:max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200 scrollbar-hide rounded-lg md:rounded-xl max-h-[90vh] overflow-y-auto pointer-events-auto bg-[#042222]/90 backdrop-blur-[40px]"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={(e) => e.stopPropagation()}
        data-testid="info-popup"
      >
        {/* Header */}
        <div
          className="px-2.5 sm:px-4 md:px-5 py-1.5 sm:py-2.5 md:py-3 flex justify-between items-center sticky top-0 z-10 bg-[#021A1A] border-b border-white/10"
        >
          <h3 className="font-bold text-white flex items-center gap-1 sm:gap-1.5 md:gap-2 text-[11px] sm:text-xs md:text-sm truncate mr-2">
            <Info className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 text-[#005430] flex-shrink-0" />
            <span className="truncate">{title}</span>
          </h3>
          <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 flex-shrink-0">
            {isMarketOpen !== undefined && (
              <span className={`px-1 sm:px-1.5 md:px-2 py-0.5 md:py-1 text-[8px] sm:text-[9px] md:text-[10px] font-bold rounded whitespace-nowrap ${isMarketOpen
                ? 'bg-[#005430] text-white animate-pulse'
                : 'bg-amber-500/20 text-amber-500'
                }`}>
                {isMarketOpen ? 'Market Open' : 'Market Closed'}
              </span>
            )}
            <button
              onClick={closeModal}
              className="text-gray-400 hover:text-white transition-colors p-0.5"
              data-testid="info-popup-close-button"
            >
              <X className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-2.5 sm:px-4 md:px-5 py-2 sm:py-3 md:py-5">
          {/* Season Progress Bar */}
          {progressInfo && (
            <div className="mb-2 sm:mb-3 pb-0">
              <div className="flex justify-between items-center text-[clamp(0.5rem,1.5vw,0.625rem)] uppercase font-bold text-emerald-500 mb-[clamp(0.5rem,1.5vw,0.5rem)]">
                <span>Start: {progressInfo.startStr}</span>
                <span>End: {progressInfo.endStr}</span>
              </div>
              <div className="h-[clamp(0.1rem,1vw,0.1rem)] bg-gray-700/50 rounded-full overflow-hidden relative">
                <div
                  className="absolute top-0 left-0 h-full rounded-full transition-all duration-1000 ease-out animate-pulse bg-amber-500"
                  style={{ width: `${progressInfo.percentage}%` }}
                />
              </div>
              <div className="text-center mt-1.5">
                <span className="text-[clamp(0.5rem,1.5vw,0.625rem)] font-bold text-gray-300">
                  {progressInfo.daysRemaining > 0
                    ? `${progressInfo.daysRemaining} day${progressInfo.daysRemaining !== 1 ? 's' : ''} remaining`
                    : 'Season ended'
                  }
                </span>
              </div>
            </div>
          )}

          {/* Description */}
          <p className="text-gray-200 text-[clamp(0.625rem,1.5vw,0.75rem)] leading-relaxed whitespace-pre-line">
            {content}
          </p>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      <button
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className={`${iconClassName} w-6 h-6 rounded-full bg-[#005430] hover:bg-[#006035] flex items-center justify-center transition-all shadow-sm border border-emerald-800/20 group/info`}
        aria-label="More information"
        data-testid="info-popup-trigger"
      >
        <span className="text-white font-serif italic text-sm font-bold antialiased pr-[1px]">i</span>
      </button>

      {/* Render modal via portal to document.body - bypasses parent CSS issues */}
      {modalContent && createPortal(modalContent, document.body)}
    </>
  );
};

export default InfoPopup;