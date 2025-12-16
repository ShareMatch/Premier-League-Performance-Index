import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, ArrowLeft, Building2, Copy, Check, Landmark, ChevronRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';

// ShareMatch company bank details from database
interface CompanyBankAccount {
  id: string;
  bank_name: string;
  account_name: string;
  iban: string | null;
  swift_bic: string | null;
  currency: string | null;
  address_line: string | null;
  city: string | null;
  postal_code: string | null;
  country: string | null;
  country_code: string | null;
  is_active: boolean;
  sort_order: number;
}

// Legacy export for compatibility
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
  onSave?: (details: BankDetails) => Promise<void>;
  initialData?: BankDetails;
}

const BankDetailsModal: React.FC<BankDetailsModalProps> = ({
  isOpen,
  onClose,
  onBack,
}) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [companyBankAccounts, setCompanyBankAccounts] = useState<CompanyBankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedBanks, setExpandedBanks] = useState<Set<string>>(new Set());

  const toggleBankExpanded = (bankId: string) => {
    setExpandedBanks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(bankId)) {
        newSet.delete(bankId);
      } else {
        newSet.add(bankId);
      }
      return newSet;
    });
  };

  // Fetch ShareMatch bank details from database
  useEffect(() => {
    const fetchCompanyBankAccounts = async () => {
      if (!isOpen) return;
      
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('company_bank_accounts')
          .select('*')
          .eq('is_active', true)
          .order('sort_order', { ascending: true });

        if (error) {
          console.error('Error fetching company bank accounts:', error);
          setCompanyBankAccounts([]);
        } else {
          setCompanyBankAccounts(data || []);
        }
      } catch (err) {
        console.error('Failed to fetch company bank accounts:', err);
        setCompanyBankAccounts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchCompanyBankAccounts();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopy = async (bankId: string, label: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(`${bankId}-${label}`);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Build details array for each bank
  const getBankDisplayDetails = (bank: CompanyBankAccount) => {
    const details: { label: string; value: string }[] = [
      { label: 'Bank Name', value: bank.bank_name },
      { label: 'Account Name', value: bank.account_name },
    ];
    
    if (bank.iban) details.push({ label: 'IBAN', value: bank.iban });
    if (bank.swift_bic) details.push({ label: 'SWIFT/BIC', value: bank.swift_bic });
    if (bank.currency) details.push({ label: 'Currency', value: bank.currency });
    if (bank.address_line) {
      const address = [bank.address_line, bank.city, bank.postal_code, bank.country]
        .filter(Boolean)
        .join(', ');
      details.push({ label: 'Address', value: address });
    }
    
    return details;
  };

  // Get region display name from country_code
  const getRegionDisplay = (bank: CompanyBankAccount) => {
    if (bank.country_code === 'AE') return 'UAE';
    if (bank.country_code === 'GB') return 'UK';
    if (bank.country) return bank.country;
    return bank.bank_name;
  };

  const modalContent = (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 overflow-y-auto w-full h-full">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="relative w-full max-w-2xl bg-[#005430] rounded-xl sm:rounded-modal p-3 sm:p-6 max-h-[95vh] overflow-y-auto scrollbar-hide z-[101]">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-2 sm:top-4 right-2 sm:right-4 text-gray-500 hover:text-white transition-colors z-10"
        >
          <X className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>

        {/* Form Container */}
        <div className="flex flex-col rounded-xl p-3 sm:p-5 gap-3 sm:gap-4">
          {/* Header */}
          <div className="flex items-center gap-2 sm:gap-3 pr-6">
            <button
              onClick={onBack}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gray-800 hover:bg-gray-700 flex items-center justify-center transition-colors flex-shrink-0"
            >
              <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
            </button>
            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
              <h2 className="text-white font-bold font-sans text-base sm:text-xl truncate">
                Add ShareMatch as Beneficiary
              </h2>
            </div>
          </div>

          {/* Info Text */}
          <p className="text-gray-400 text-xs sm:text-sm leading-relaxed">
            Copy the bank details below and add ShareMatch as a beneficiary in your banking app. Use the appropriate bank based on your location for faster transfers.
          </p>

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-brand-emerald500 border-t-transparent rounded-full animate-spin"></div>
              <span className="ml-2 text-gray-400 text-sm">Loading bank details...</span>
            </div>
          )}

          {/* No Bank Details */}
          {!loading && companyBankAccounts.length === 0 && (
            <div className="text-center py-8">
              <Building2 className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">No bank details available at the moment.</p>
              <p className="text-gray-500 text-xs mt-1">Please contact support for deposit instructions.</p>
            </div>
          )}

          {/* Bank Provider Cards */}
          {!loading && companyBankAccounts.length > 0 && (
            <div className="flex flex-col gap-3">
              {companyBankAccounts.map((bank) => {
                const details = getBankDisplayDetails(bank);
                const regionDisplay = getRegionDisplay(bank);
                const isExpanded = expandedBanks.has(bank.id);

                return (
                  <div
                    key={bank.id}
                    className="rounded-xl border border-white/10 overflow-hidden bg-white/5"
                  >
                    {/* Card Header - Clickable to expand/collapse */}
                    <button
                      onClick={() => toggleBankExpanded(bank.id)}
                      className="w-full flex items-center justify-between gap-2 px-3 py-2 sm:px-4 sm:py-2.5 bg-brand-emerald500/10 hover:bg-brand-emerald500/15 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center bg-brand-emerald500/20">
                          <Landmark className="w-4 h-4 sm:w-5 sm:h-5 text-brand-primary" />
                        </div>
                        <span className="text-white font-semibold text-xs sm:text-sm text-left">
                          {regionDisplay} ({bank.bank_name})
                        </span>
                      </div>
                      <ChevronRight 
                        className={`w-4 h-4 sm:w-5 sm:h-5 text-gray-400 transition-transform duration-200 ${
                          isExpanded ? 'rotate-90' : ''
                        }`} 
                      />
                    </button>

                    {/* Card Details - Collapsible */}
                    {isExpanded && (
                      <div className="p-2 sm:p-3 space-y-1.5 sm:space-y-2 border-t border-white/10">
                        {details.map((detail) => {
                          const fieldKey = `${bank.id}-${detail.label}`;
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
                                onClick={() => handleCopy(bank.id, detail.label, detail.value)}
                                className={`flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-all ${
                                  isCopied
                                    ? 'bg-brand-primary/20 text-brand-primary'
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
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Done Button */}
          <button
            onClick={onClose}
            className="w-full py-2 sm:py-2.5 rounded-full bg-white text-brand-primary font-medium text-xs sm:text-sm hover:opacity-90 transition-opacity"
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
