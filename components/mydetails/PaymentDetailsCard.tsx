import React from 'react';
import { CreditCard, Building2, Plus } from 'lucide-react';

export type PaymentMethod = 'none' | 'card' | 'bank' | 'crypto';

interface BankDetails {
  accountName: string;
  accountNumber: string;
  iban: string;
  swiftBic: string;
  bankName: string;
}

interface PaymentDetailsCardProps {
  paymentMethod: PaymentMethod;
  bankDetails?: BankDetails;
  onAddPayment: () => void;
  onEdit?: () => void;
}

const PaymentDetailsCard: React.FC<PaymentDetailsCardProps> = ({
  paymentMethod,
  bankDetails,
  onAddPayment,
  onEdit,
}) => {
  const hasPaymentMethod = paymentMethod !== 'none';

  // Empty state - no payment method added
  if (!hasPaymentMethod) {
    return (
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-md sm:rounded-xl overflow-hidden flex flex-col md:h-full border border-gray-700">
        {/* Header - Compact on mobile */}
        <div className="px-2 sm:px-4 py-1 sm:py-3 flex justify-between items-center flex-shrink-0 bg-gray-800 border-b border-gray-700">
          <h3 className="text-[10px] sm:text-base font-semibold text-white font-sans">Payment Details</h3>
        </div>

        {/* Empty State Content - Compact on mobile */}
        <div className="p-2 sm:p-4 flex-1 flex flex-col items-center justify-center gap-2 sm:gap-4">
          <div className="w-10 h-10 sm:w-16 sm:h-16 rounded-full bg-brand-emerald500/10 flex items-center justify-center">
            <CreditCard className="w-5 h-5 sm:w-8 sm:h-8 text-brand-primary" />
          </div>
          <div className="text-center">
            <p className="text-white font-medium font-sans text-[9px] sm:text-sm mb-0.5">No payment method added</p>
            <p className="text-gray-400 text-[8px] sm:text-xs font-sans">Add a payment method to receive funds</p>
          </div>
          <button
            onClick={onAddPayment}
            className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-1 sm:py-2 rounded-full shadow-lg font-medium font-sans text-[8px] sm:text-xs text-white bg-gradient-primary hover:opacity-90 transition-colors whitespace-nowrap"
          >
            <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
            Add Payment Info
          </button>
        </div>
      </div>
    );
  }

  // Bank details display
  if (paymentMethod === 'bank' && bankDetails) {
    const fields = [
      { label: 'Account Name:', value: bankDetails.accountName },
      { label: 'Account Number:', value: bankDetails.accountNumber },
      { label: 'IBAN:', value: bankDetails.iban },
      { label: 'SWIFT/BIC Code:', value: bankDetails.swiftBic },
      { label: 'Bank Name:', value: bankDetails.bankName },
    ];

    return (
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-md sm:rounded-xl overflow-hidden flex flex-col md:h-full border border-gray-700">
        {/* Header - Compact on mobile */}
        <div className="px-2 sm:px-4 py-1 sm:py-3 flex justify-between items-center flex-shrink-0 bg-gray-800 border-b border-gray-700 gap-1">
          <div className="flex items-center gap-1 sm:gap-2 min-w-0">
            <h3 className="text-[10px] sm:text-base font-semibold text-white font-sans">Payment Details</h3>
            <span className="px-1 sm:px-2 py-0.5 rounded-full bg-brand-emerald500/10 text-brand-emerald500 text-[8px] sm:text-xs font-medium font-sans flex items-center gap-0.5 whitespace-nowrap">
              <Building2 className="w-2 h-2 sm:w-3 sm:h-3" />
              Bank
            </span>
          </div>
          {onEdit && (
            <button
              onClick={onEdit}
              className="px-1.5 sm:px-4 py-0.5 sm:py-1.5 text-[8px] sm:text-xs font-sans font-medium rounded-full shadow-lg transition-colors whitespace-nowrap text-white bg-gradient-primary hover:opacity-90 flex-shrink-0"
            >
              Edit
            </button>
          )}
        </div>

        {/* Content - Compact on mobile */}
        <div className="p-2 sm:p-4 space-y-1 sm:space-y-2 flex-1">
          {fields.map((field, index) => (
            <div key={index}>
              <span className="text-gray-400 text-[9px] sm:text-xs font-medium block font-sans leading-tight">{field.label}</span>
              <span className="text-white text-[10px] sm:text-sm font-medium font-sans leading-tight">{field.value || 'Nil'}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Placeholder for other payment methods (card, crypto) - future implementation
  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-md sm:rounded-xl overflow-hidden flex flex-col md:h-full border border-gray-700">
      <div className="px-2 sm:px-4 py-1 sm:py-3 flex justify-between items-center flex-shrink-0 bg-gray-800 border-b border-gray-700">
        <h3 className="text-[10px] sm:text-base font-semibold text-white font-sans">Payment</h3>
      </div>
      <div className="p-2 sm:p-4 flex-1 flex items-center justify-center">
        <p className="text-gray-400 text-[8px] sm:text-sm font-sans">Configured</p>
      </div>
    </div>
  );
};

export default PaymentDetailsCard;

