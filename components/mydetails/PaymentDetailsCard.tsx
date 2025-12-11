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
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl overflow-hidden flex flex-col h-full border border-gray-700">
        {/* Header */}
        <div className="px-4 py-3 flex justify-between items-center flex-shrink-0 bg-gray-800 border-b border-gray-700">
          <h3 className="text-base font-semibold text-white font-sans">Payment Details</h3>
        </div>

        {/* Empty State Content */}
        <div className="p-4 flex-1 flex flex-col items-center justify-center gap-4">
          <div className="w-16 h-16 rounded-full bg-brand-emerald500/10 flex items-center justify-center">
            <CreditCard className="w-8 h-8 text-brand-emerald500" />
          </div>
          <div className="text-center">
            <p className="text-white font-medium font-sans text-sm mb-1">No payment method added</p>
            <p className="text-gray-400 text-xs font-sans">Add a payment method to receive funds</p>
          </div>
          <button
            onClick={onAddPayment}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full text-brand-emerald500 border border-brand-emerald500 font-medium font-sans text-sm hover:bg-brand-emerald500/10 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Payment Information
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
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl overflow-hidden flex flex-col h-full border border-gray-700">
        {/* Header */}
        <div className="px-4 py-3 flex justify-between items-center flex-shrink-0 bg-gray-800 border-b border-gray-700">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-white font-sans">Payment Details</h3>
            <span className="px-2 py-0.5 rounded-full bg-brand-emerald500/10 text-brand-emerald500 text-xs font-medium font-sans flex items-center gap-1">
              <Building2 className="w-3 h-3" />
              Bank Transfer
            </span>
          </div>
          {onEdit && (
            <button
              onClick={onEdit}
              className="text-brand-emerald500 hover:text-brand-emerald500/80 transition-colors text-xs font-sans font-medium"
            >
              Edit
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-4 space-y-2 flex-1">
          {fields.map((field, index) => (
            <div key={index}>
              <span className="text-gray-400 text-xs font-medium block font-sans">{field.label}</span>
              <span className="text-white text-sm font-medium font-sans">{field.value || 'Nil'}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Placeholder for other payment methods (card, crypto) - future implementation
  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl overflow-hidden flex flex-col h-full border border-gray-700">
      <div className="px-4 py-3 flex justify-between items-center flex-shrink-0 bg-gray-800 border-b border-gray-700">
        <h3 className="text-base font-semibold text-white font-sans">Payment Details</h3>
      </div>
      <div className="p-4 flex-1 flex items-center justify-center">
        <p className="text-gray-400 text-sm font-sans">Payment method configured</p>
      </div>
    </div>
  );
};

export default PaymentDetailsCard;

