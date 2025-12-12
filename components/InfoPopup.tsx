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
  iconClassName = 'text-[#3AA189] hover:text-[#2d8a73] transition-colors cursor-pointer',
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const closeModal = () => setIsOpen(false);

  // Modal content - rendered via portal to document.body
  const modalContent = isOpen ? (
    <div 
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-2 sm:p-3 md:p-4 animate-in fade-in duration-200"
      onClick={(e) => {
        e.stopPropagation();
        closeModal();
      }}
    >
      <div 
        className="max-w-[85vw] sm:max-w-sm md:max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200 scrollbar-hide rounded-lg md:rounded-xl"
        style={{
          background: 'rgba(4, 34, 34, 0.92)',
          backdropFilter: 'blur(40px)',
          WebkitBackdropFilter: 'blur(40px)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div 
          className="px-2.5 sm:px-4 md:px-5 py-1.5 sm:py-2.5 md:py-3 flex justify-between items-center"
          style={{
            background: '#021A1A',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          }}
        >
          <h3 className="font-bold text-white flex items-center gap-1 sm:gap-1.5 md:gap-2 text-[11px] sm:text-xs md:text-sm truncate mr-2">
            <Info className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 text-[#3AA189] flex-shrink-0" />
            <span className="truncate">{title}</span>
          </h3>
          <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 flex-shrink-0">
            {isMarketOpen !== undefined && (
              <span className={`px-1 sm:px-1.5 md:px-2 py-0.5 md:py-1 text-[8px] sm:text-[9px] md:text-[10px] font-bold rounded whitespace-nowrap ${
                isMarketOpen 
                  ? 'bg-[#3AA189]/20 text-[#3AA189]' 
                  : 'bg-amber-500/20 text-amber-500'
              }`}>
                {isMarketOpen ? 'Market Open' : 'Market Closed'}
              </span>
            )}
            <button 
              onClick={closeModal} 
              className="text-gray-400 hover:text-white transition-colors p-0.5"
            >
              <X className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-2.5 sm:px-4 md:px-5 py-2 sm:py-3 md:py-5">
          {/* Description */}
          <p className="text-gray-200 text-[10px] sm:text-[11px] md:text-xs leading-relaxed whitespace-pre-line">
            {content}
          </p>

          {/* Season Dates */}
          {seasonDates && (
            <div className="mt-1.5 sm:mt-2.5 md:mt-4 pt-1.5 sm:pt-2.5 md:pt-4 border-t border-white/10">
              <div className="flex justify-between items-center text-[9px] sm:text-[10px] md:text-xs">
                <span className="text-gray-400">Event Dates</span>
                <span className="text-white font-medium">{seasonDates}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      {/* Info Icon Trigger */}
      <button
        onClick={(e) => {
          e.stopPropagation(); // Prevent click from bubbling to parent
          setIsOpen(true);
        }}
        className={iconClassName}
        aria-label="More information"
      >
        <Info size={iconSize} />
      </button>

      {/* Render modal via portal to document.body - bypasses parent CSS issues */}
      {modalContent && createPortal(modalContent, document.body)}
    </>
  );
};

export default InfoPopup;
