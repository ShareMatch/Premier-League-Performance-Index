import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Info, X } from 'lucide-react';

export interface InfoPopupProps {
  /** The title shown in the popup header */
  title?: string;
  /** Main content/description text */
  content: string;
  /** Optional key-value details to display (e.g., dates) */
  details?: { label: string; value: string }[];
  /** Size of the info icon */
  iconSize?: number;
  /** Custom icon className */
  iconClassName?: string;
}

const InfoPopup: React.FC<InfoPopupProps> = ({
  title = 'Information',
  content,
  details,
  iconSize = 16,
  iconClassName = 'text-[#3AA189] hover:text-[#2d8a73] transition-colors cursor-pointer',
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const closeModal = () => setIsOpen(false);

  // Modal content - rendered via portal to document.body
  const modalContent = isOpen ? (
    <div 
      className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={closeModal}
    >
      <div 
        className="bg-gray-800 rounded-xl border border-gray-700 shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-700 flex justify-between items-center bg-gray-900/50">
          <h3 className="font-bold text-gray-200 flex items-center gap-2">
            <Info className="w-4 h-4 text-[#3AA189]" />
            {title}
          </h3>
          <button 
            onClick={closeModal} 
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-line">
            {content}
          </p>

          {/* Optional Details Section */}
          {details && details.length > 0 && (
            <div className="mt-6 pt-4 border-t border-gray-700 space-y-2">
              {details.map((detail, index) => (
                <div key={index} className="flex justify-between text-sm">
                  <span className="text-gray-500">{detail.label}</span>
                  <span className="text-gray-300 font-medium">{detail.value}</span>
                </div>
              ))}
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

