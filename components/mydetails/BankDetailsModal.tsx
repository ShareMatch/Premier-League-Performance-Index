import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, ArrowLeft, Building2, Copy, Check, Globe, CreditCard, Landmark } from 'lucide-react';

interface BankProvider {
  id: string;
  name: string;
  icon: React.ReactNode;
  variant: 'emerald' | 'blue' | 'purple';
  details: { label: string; value: string }[];
}

interface BankDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBack: () => void;
  onSave?: (details: any) => Promise<void>;
  initialData?: any;
}

const BankDetailsModal: React.FC<BankDetailsModalProps> = ({
  isOpen,
  onClose,
  onBack,
}) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  if (!isOpen) return null;

  const bankProviders: BankProvider[] = [
    {
      id: 'uae',
      name: 'UAE (ENBD)',
      icon: <Landmark className="w-5 h-5" />,
      variant: 'emerald',
      details: [
        { label: 'Bank Name', value: 'Emirates NBD' },
        { label: 'Account Name', value: 'ShareMatch Trading LLC' },
        { label: 'Account Number', value: '1017 8523 6901 001' },
        { label: 'IBAN', value: 'AE12 0260 0010 1785 2369 010' },
        { label: 'SWIFT/BIC', value: 'EABORAEKXXX' },
        { label: 'Branch', value: 'Dubai Main Branch' },
      ],
    },
    // {
    //   id: 'uk',
    //   name: 'UK (Barclays)',
    //   icon: <Globe className="w-5 h-5" />,
    //   variant: 'blue',
    //   details: [
    //     { label: 'Bank Name', value: 'Barclays Bank UK PLC' },
    //     { label: 'Account Name', value: 'ShareMatch Ltd' },
    //     { label: 'Account Number', value: '2049 8176 3250' },
    //     { label: 'Sort Code', value: '20-45-78' },
    //     { label: 'IBAN', value: 'GB82 BARC 2045 7820 4981 76' },
    //     { label: 'SWIFT/BIC', value: 'BARCGB22XXX' },
    //   ],
    // },
    // {
    //   id: 'international',
    //   name: 'International (SWIFT)',
    //   icon: <CreditCard className="w-5 h-5" />,
    //   variant: 'purple',
    //   details: [
    //     { label: 'Bank Name', value: 'Citibank N.A.' },
    //     { label: 'Account Name', value: 'ShareMatch International Inc' },
    //     { label: 'Account Number', value: '3680 9241 5078' },
    //     { label: 'IBAN', value: 'US67 CITI 0214 9036 8092 41' },
    //     { label: 'SWIFT/BIC', value: 'CITIUS33XXX' },
    //     { label: 'Routing Number', value: '021000089' },
    //   ],
    // },
  ];

  const handleCopy = async (providerId: string, label: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(`${providerId}-${label}`);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const getVariantClasses = (variant: 'emerald' | 'blue' | 'purple') => {
    switch (variant) {
      case 'emerald':
        return {
          header: 'bg-brand-emerald500/10',
          iconBg: 'bg-brand-emerald500/20',
          iconText: 'text-brand-emerald500',
        };
      case 'blue':
        return {
          header: 'bg-blue-500/10',
          iconBg: 'bg-blue-500/20',
          iconText: 'text-blue-400',
        };
      case 'purple':
        return {
          header: 'bg-purple-500/10',
          iconBg: 'bg-purple-500/20',
          iconText: 'text-purple-400',
        };
    }
  };

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="relative w-full max-w-2xl bg-modal-outer/60 backdrop-blur-[40px] rounded-xl p-3 sm:p-6 max-h-[90vh] overflow-y-auto scrollbar-hide">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-2 sm:top-4 right-2 sm:right-4 text-gray-500 hover:text-white transition-colors z-10"
        >
          <X className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>

        {/* Inner Container */}
        <div className="flex flex-col bg-modal-inner rounded-xl p-3 sm:p-5 gap-3 sm:gap-4 border border-white/10">
          {/* Header */}
          <div className="flex items-center gap-2 sm:gap-3 pr-6">
            <button
              onClick={onBack}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gray-800 hover:bg-gray-700 flex items-center justify-center transition-colors flex-shrink-0"
            >
              <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
            </button>
            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
              {/* <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-brand-emerald500/20 flex items-center justify-center flex-shrink-0">
                <Building2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-brand-emerald500" />
              </div> */}
              <h2 className="text-white font-bold font-sans text-base sm:text-xl truncate">
                Add ShareMatch as Beneficiary
              </h2>
            </div>
          </div>

          {/* Info Text */}
          <p className="text-gray-400 text-xs sm:text-sm leading-relaxed">
            Copy the bank details below and add ShareMatch as a beneficiary in your banking app. Use the appropriate bank based on your location for faster transfers.
          </p>

          {/* Bank Provider Cards */}
          <div className="flex flex-col gap-3">
            {bankProviders.map((provider) => {
              const variantClasses = getVariantClasses(provider.variant);

              return (
                <div
                  key={provider.id}
                  className="rounded-xl border border-white/10 overflow-hidden bg-white/5"
                >
                  {/* Card Header */}
                  <div className={`flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2.5 ${variantClasses.header} border-b border-white/10`}>
                    <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center ${variantClasses.iconBg}`}>
                      <span className={variantClasses.iconText}>{provider.icon}</span>
                    </div>
                    <span className="text-white font-semibold text-xs sm:text-sm">{provider.name}</span>
                  </div>

                  {/* Card Details */}
                  <div className="p-2 sm:p-3 space-y-1.5 sm:space-y-2">
                    {provider.details.map((detail) => {
                      const fieldKey = `${provider.id}-${detail.label}`;
                      const isCopied = copiedField === fieldKey;

                      return (
                        <div
                          key={detail.label}
                          className="flex items-center justify-between gap-2 group"
                        >
                          <div className="flex-1 min-w-0">
                            <span className="text-gray-500 text-[9px] sm:text-[10px] uppercase tracking-wider block">
                              {detail.label}
                            </span>
                            <span className="text-white text-[11px] sm:text-xs font-mono truncate block">
                              {detail.value}
                            </span>
                          </div>
                          <button
                            onClick={() => handleCopy(provider.id, detail.label, detail.value)}
                            className={`flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-all ${
                              isCopied
                                ? 'bg-brand-emerald500/20 text-brand-emerald500'
                                : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                            }`}
                            title={isCopied ? 'Copied!' : 'Copy'}
                          >
                            {isCopied ? (
                              <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            ) : (
                              <Copy className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer Note */}
          {/* <div className="flex items-start gap-2 px-2 py-2 sm:px-3 sm:py-2.5 rounded-xl bg-brand-amber500/10 border border-brand-amber500/20">
            <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-brand-amber500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-brand-amber500 text-[10px] sm:text-xs font-bold">!</span>
            </div>
            <p className="text-brand-amber500/80 text-[10px] sm:text-xs leading-relaxed">
              Always use your registered email or user ID as the payment reference to ensure your deposit is credited correctly.
            </p>
          </div> */}

          {/* Done Button */}
          <button
            onClick={onClose}
            className="w-full py-2 sm:py-2.5 rounded-full bg-gradient-primary text-white font-medium text-xs sm:text-sm hover:opacity-90 transition-opacity"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default BankDetailsModal;
