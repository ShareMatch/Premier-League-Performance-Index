import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, CreditCard, Building2, Bitcoin, Check, Lock } from 'lucide-react';

export type PaymentOption = 'card' | 'bank' | 'crypto';

interface PaymentMethodModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectMethod: (method: PaymentOption) => void;
}

const PaymentMethodModal: React.FC<PaymentMethodModalProps> = ({
  isOpen,
  onClose,
  onSelectMethod,
}) => {
  const [selectedMethod, setSelectedMethod] = useState<PaymentOption>('bank');
  const [isButtonHovered, setIsButtonHovered] = useState(false);

  if (!isOpen) return null;

  const paymentOptions: { id: PaymentOption; label: string; icon: React.ReactNode; available: boolean; comingSoon?: boolean }[] = [
    {
      id: 'card',
      label: 'Debit Card',
      icon: <CreditCard className="w-5 h-5" />,
      available: false,
      comingSoon: true,
    },
    {
      id: 'bank',
      label: 'Bank Transfer',
      icon: <Building2 className="w-5 h-5" />,
      available: true,
    },
    {
      id: 'crypto',
      label: 'Crypto wallet',
      icon: <Bitcoin className="w-5 h-5" />,
      available: false,
      comingSoon: true,
    },
  ];

  const handleNext = () => {
    if (selectedMethod === 'bank') {
      onSelectMethod(selectedMethod);
    }
  };

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal Content - Responsive */}
      <div className="relative w-full max-w-md bg-modal-outer/60 backdrop-blur-[40px] rounded-xl sm:rounded-modal p-3 sm:p-6 max-h-[90vh] overflow-y-auto scrollbar-hide">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-2 sm:top-4 right-2 sm:right-4 text-gray-500 hover:text-white transition-colors z-10"
        >
          <X className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>

        {/* Inner Container - Responsive */}
        <div
          className="flex flex-col bg-modal-inner rounded-lg sm:rounded-xl p-3 sm:p-5 gap-3 sm:gap-5 border border-transparent"
          style={{
            backgroundImage: "linear-gradient(#021A1A, #021A1A), linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.6) 50%, rgba(255,255,255,0) 100%)",
            backgroundOrigin: "border-box",
            backgroundClip: "padding-box, border-box",
          }}
        >
          <div className="pr-6">
            <h2 className="text-white font-bold font-sans text-base sm:text-xl mb-0.5 sm:mb-1">
              Select Payment Method
            </h2>
            <p className="text-gray-400 text-xs sm:text-sm font-sans">
              Choose how you'd like to receive funds
            </p>
          </div>

          {/* Payment Options - Responsive */}
          <div className="flex flex-col gap-2 sm:gap-3">
            {paymentOptions.map((option) => (
              <button
                key={option.id}
                onClick={() => option.available && setSelectedMethod(option.id)}
                disabled={!option.available}
                className={`relative flex items-center gap-2 sm:gap-4 p-2.5 sm:p-4 rounded-lg sm:rounded-xl transition-all ${
                  option.available
                    ? selectedMethod === option.id
                      ? 'bg-gray-900 border-2 border-brand-emerald500'
                      : 'bg-gray-900 border border-white/10 hover:border-white/20'
                    : 'bg-gray-900/50 border border-white/5 cursor-not-allowed opacity-50'
                }`}
              >
                <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center ${
                  option.available
                    ? selectedMethod === option.id
                      ? 'bg-brand-emerald500 text-white'
                      : 'bg-gray-800 text-gray-400'
                    : 'bg-gray-800/50 text-gray-500'
                }`}>
                  <div className="w-4 h-4 sm:w-5 sm:h-5">{option.icon}</div>
                </div>
                <span className={`font-medium font-sans text-xs sm:text-sm ${
                  option.available ? 'text-white' : 'text-gray-500'
                }`}>
                  {option.label}
                </span>
                
                {/* Selection indicator or Coming Soon badge */}
                <div className="ml-auto">
                  {option.comingSoon ? (
                    <div className="flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-full bg-gray-800 border border-white/10">
                      <Lock className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-gray-400" />
                      <span className="text-[10px] sm:text-xs font-medium text-gray-400 font-sans">Soon</span>
                    </div>
                  ) : selectedMethod === option.id ? (
                    <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-brand-emerald500 flex items-center justify-center">
                      <Check className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                    </div>
                  ) : (
                    <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 border-white/20" />
                  )}
                </div>
              </button>
            ))}
          </div>

          {/* Buttons - Responsive */}
          <div className="flex gap-2 sm:gap-3 pt-1 sm:pt-2">
            <button
              onClick={onClose}
              className="flex-1 py-2 sm:py-2.5 rounded-full border border-brand-emerald500 text-white font-medium font-sans text-xs sm:text-sm hover:bg-brand-emerald500/10 transition-colors"
            >
              Cancel
            </button>
            <div
              className={`flex-1 rounded-full transition-all duration-300 p-0.5 ${
                isButtonHovered
                  ? 'border border-white shadow-glow'
                  : 'border border-brand-emerald500'
              }`}
              onMouseEnter={() => setIsButtonHovered(true)}
              onMouseLeave={() => setIsButtonHovered(false)}
            >
              <button
                onClick={handleNext}
                disabled={!paymentOptions.find(o => o.id === selectedMethod)?.available}
                className={`w-full py-1.5 sm:py-2 rounded-full font-medium font-sans text-xs sm:text-sm transition-all duration-300 disabled:opacity-60 ${
                  isButtonHovered
                    ? 'bg-white text-brand-emerald500'
                    : 'bg-gradient-primary text-white'
                }`}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default PaymentMethodModal;

