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
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={(e) => {
        e.stopPropagation();
        closeModal();
      }}
    >
      <div 
        className="max-w-2xl w-full overflow-hidden animate-in zoom-in-95 duration-200"
        style={{
          borderRadius: '24px',
          background: 'rgba(4, 34, 34, 0.60)',
          backdropFilter: 'blur(40px)',
          WebkitBackdropFilter: 'blur(40px)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div 
          className="px-5 py-4 flex justify-between items-center"
          style={{
            background: '#021A1A',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          }}
        >
          <h3 className="font-bold text-white flex items-center gap-2 text-sm">
            <Info className="w-4 h-4 text-[#3AA189]" />
            {title}
          </h3>
          <div className="flex items-center gap-3">
            {isMarketOpen !== undefined && (
              <span className={`px-2 py-1 text-[10px] font-bold rounded ${
                isMarketOpen 
                  ? 'bg-[#3AA189]/20 text-[#3AA189]' 
                  : 'bg-amber-500/20 text-amber-500'
              }`}>
                {isMarketOpen ? 'Market Open' : 'Market Closed'}
              </span>
            )}
            <button 
              onClick={closeModal} 
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-5 py-5">
          {/* Description */}
          <p className="text-gray-200 text-xs leading-relaxed whitespace-pre-line">
            {content}
          </p>

          {/* Season Dates */}
          {seasonDates && (
            <div className="mt-4 pt-4 border-t border-white/10">
              <div className="flex justify-between text-xs">
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

