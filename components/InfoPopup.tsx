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

  const closeModal = () => setIsOpen(false);

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

      return { percentage, startStr, endStr };
    } catch (e) {
      return null;
    }
  };

  const progressInfo = seasonDates ? getProgress(seasonDates) : null;

  // Modal content - rendered via portal to document.body
  const modalContent = isOpen ? (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200"
      onClick={(e) => {
        e.stopPropagation();
        closeModal();
      }}
    >
      <div
        className="max-w-[95vw] sm:max-w-lg md:max-w-2xl w-full overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto"
        style={{
          borderRadius: '16px',
          background: 'rgba(4, 34, 34, 0.60)',
          backdropFilter: 'blur(40px)',
          WebkitBackdropFilter: 'blur(40px)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="px-3 sm:px-5 py-3 sm:py-4 flex justify-between items-center sticky top-0 z-10"
          style={{
            background: '#021A1A',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          }}
        >
          <h3 className="font-bold text-white flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm truncate mr-2">
            <Info className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#005430] flex-shrink-0" />
            <span className="truncate">{title}</span>
          </h3>
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            {isMarketOpen !== undefined && (
              <span className={`px-1.5 sm:px-2 py-0.5 sm:py-1 text-[9px] sm:text-[10px] font-bold rounded whitespace-nowrap ${isMarketOpen
                ? 'bg-[#005430] text-white animate-pulse'
                : 'bg-amber-500/20 text-amber-500'
                }`}>
                {isMarketOpen ? 'Market Open' : 'Market Closed'}
              </span>
            )}
            <button
              onClick={closeModal}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-3 sm:px-5 py-4 sm:py-5">
          {/* Season Progress Bar */}
          {progressInfo && (
            <div className="mb-5 pb-5 border-b border-white/10">
              <div className="flex justify-between items-center text-[10px] uppercase font-bold text-gray-400 mb-2">
                <span>Start: {progressInfo.startStr}</span>
                <span>End: {progressInfo.endStr}</span>
              </div>
              <div className="h-2 bg-gray-700/50 rounded-full overflow-hidden relative">
                <div
                  className="absolute top-0 left-0 h-full bg-gradient-to-r from-[#005430] to-emerald-500 rounded-full transition-all duration-1000 ease-out"
                  style={{ width: `${progressInfo.percentage}%` }}
                />
              </div>
            </div>
          )}

          {/* Description */}
          <p className="text-gray-200 text-[11px] sm:text-xs leading-relaxed whitespace-pre-line">
            {content}
          </p>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      <button
        onClick={(e) => {
          e.stopPropagation(); // Prevent click from bubbling to parent
          setIsOpen(true);
        }}
        className={`${iconClassName} w-6 h-6 rounded-full bg-[#005430] hover:bg-[#006035] flex items-center justify-center transition-all shadow-sm border border-emerald-800/20 group/info`}
        aria-label="More information"
      >
        <span className="text-white font-serif italic text-sm font-bold antialiased pr-[1px]">i</span>
      </button>

      {/* Render modal via portal to document.body - bypasses parent CSS issues */}
      {modalContent && createPortal(modalContent, document.body)}
    </>
  );
};

export default InfoPopup;

