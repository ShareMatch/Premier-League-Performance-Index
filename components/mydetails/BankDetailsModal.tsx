import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, ArrowLeft, Building2 } from 'lucide-react';

export interface BankDetails {
  accountName: string;
  accountNumber: string;
  iban: string;
  swiftBic: string;
  bankName: string;
}

interface BankDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBack: () => void;
  onSave: (details: BankDetails) => Promise<void>;
  initialData?: BankDetails;
}

const BankDetailsModal: React.FC<BankDetailsModalProps> = ({
  isOpen,
  onClose,
  onBack,
  onSave,
  initialData,
}) => {
  const [formData, setFormData] = useState<BankDetails>({
    accountName: '',
    accountNumber: '',
    iban: '',
    swiftBic: '',
    bankName: '',
  });
  const [saving, setSaving] = useState(false);
  const [isButtonHovered, setIsButtonHovered] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData(initialData || {
        accountName: '',
        accountNumber: '',
        iban: '',
        swiftBic: '',
        bankName: '',
      });
      setError(null);
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const fields: { key: keyof BankDetails; label: string; placeholder: string; required?: boolean }[] = [
    { key: 'accountName', label: 'Account Name', placeholder: 'Enter account holder name', required: true },
    { key: 'accountNumber', label: 'Account Number', placeholder: 'Enter account number', required: true },
    { key: 'iban', label: 'IBAN', placeholder: 'Enter IBAN (optional)' },
    { key: 'swiftBic', label: 'SWIFT/BIC Code', placeholder: 'Enter SWIFT/BIC code' },
    { key: 'bankName', label: 'Bank Name', placeholder: 'Enter bank name', required: true },
  ];

  const handleChange = (key: keyof BankDetails, value: string) => {
    setFormData(prev => ({ ...prev, [key]: value }));
    setError(null);
  };

  const handleSave = async () => {
    // Basic validation
    if (!formData.accountName.trim()) {
      setError('Account name is required');
      return;
    }
    if (!formData.accountNumber.trim()) {
      setError('Account number is required');
      return;
    }
    if (!formData.bankName.trim()) {
      setError('Bank name is required');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await onSave(formData);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save bank details');
    } finally {
      setSaving(false);
    }
  };

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="relative w-full max-w-xl bg-modal-outer/60 backdrop-blur-[40px] rounded-modal p-6">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors z-10"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Inner Container */}
        <div
          className="flex flex-col bg-modal-inner rounded-xl p-5 gap-4 border border-transparent"
          style={{
            backgroundImage: "linear-gradient(#021A1A, #021A1A), linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.6) 50%, rgba(255,255,255,0) 100%)",
            backgroundOrigin: "border-box",
            backgroundClip: "padding-box, border-box",
          }}
        >
          {/* Header with Back Button */}
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="w-8 h-8 rounded-full bg-gray-800 hover:bg-gray-700 flex items-center justify-center transition-colors"
            >
              <ArrowLeft className="w-4 h-4 text-white" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-brand-emerald500/20 flex items-center justify-center">
                <Building2 className="w-4 h-4 text-brand-emerald500" />
              </div>
              <h2 className="text-white font-bold font-sans text-xl">
                Bank Transfer Details
              </h2>
            </div>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-red-500/10 border border-red-500/30">
              <p className="text-red-400 text-xs font-sans">{error}</p>
            </div>
          )}

          {/* Form Fields */}
          <div className="flex flex-col gap-4">
            {fields.map((field) => (
              <div key={field.key} className="flex flex-col w-full gap-1.5">
                <label
                  htmlFor={`bank-${field.key}`}
                  className="text-white text-sm font-medium font-sans"
                >
                  {field.label}
                  {field.required && <span className="text-brand-emerald500 ml-0.5">*</span>}
                </label>
                <div className="flex items-center w-full bg-gray-200 rounded-full shadow-inner h-10 px-4 focus-within:ring-2 focus-within:ring-brand-emerald500">
                  <input
                    id={`bank-${field.key}`}
                    type="text"
                    value={formData[field.key]}
                    onChange={(e) => handleChange(field.key, e.target.value)}
                    className="flex-1 min-w-0 bg-transparent text-gray-900 placeholder-gray-500 outline-none font-sans text-sm"
                    placeholder={field.placeholder}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              onClick={onBack}
              className="flex-1 py-2.5 rounded-full border border-brand-emerald500 text-white font-medium font-sans text-sm hover:bg-brand-emerald500/10 transition-colors"
            >
              Back
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
                onClick={handleSave}
                disabled={saving}
                className={`w-full py-2 rounded-full font-medium font-sans text-sm transition-all duration-300 disabled:opacity-60 ${
                  isButtonHovered
                    ? 'bg-white text-brand-emerald500'
                    : 'bg-gradient-primary text-white'
                }`}
              >
                {saving ? 'Saving...' : 'Save Details'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default BankDetailsModal;

