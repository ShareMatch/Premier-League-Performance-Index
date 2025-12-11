import React from 'react';
import { CheckCircle2, XCircle, AlertCircle, Clock } from 'lucide-react';

export type KYCStatus = 'verified' | 'not_verified' | 'resubmission_requested' | 'expired' | 'rejected' | 'pending' | 'not_started';

export type DocumentStatus = 'verified' | 'not_uploaded' | 'resubmit' | 'expired' | 'rejected' | 'pending';

interface KYCDocument {
  name: string;
  status: DocumentStatus;
}

interface KYCVerificationCardProps {
  status: KYCStatus;
  documents: KYCDocument[];
  onUpdateKYC?: () => void;
}

const getStatusConfig = (status: KYCStatus) => {
  switch (status) {
    case 'verified':
      return {
        label: 'Verified',
        message: 'Your account has been successfully verified.',
        className: 'bg-brand-emerald500/10 text-brand-emerald500',
        Icon: CheckCircle2,
      };
    case 'not_verified':
    case 'not_started':
      return {
        label: 'Not Verified',
        message: 'Your account is not verified.',
        className: 'bg-red-500/10 text-red-500',
        Icon: XCircle,
      };
    case 'resubmission_requested':
      return {
        label: 'Resubmission Required',
        message: 'Your documents have been rejected. Please resubmit.',
        className: 'bg-red-500/10 text-red-500',
        Icon: AlertCircle,
      };
    case 'expired':
      return {
        label: 'Expired',
        message: 'Your documents have expired.',
        className: 'bg-red-500/10 text-red-500',
        Icon: Clock,
      };
    case 'rejected':
      return {
        label: 'Rejected',
        message: 'Your documents have been rejected.',
        className: 'bg-red-500/10 text-red-500',
        Icon: XCircle,
      };
    case 'pending':
      return {
        label: 'Pending',
        message: 'Your documents are being reviewed.',
        className: 'bg-amber-500/10 text-amber-500',
        Icon: Clock,
      };
    default:
      return {
        label: 'Unknown',
        message: 'Status unknown.',
        className: 'bg-gray-500/10 text-gray-500',
        Icon: AlertCircle,
      };
  }
};

const getDocumentStatusConfig = (status: DocumentStatus) => {
  switch (status) {
    case 'verified':
      return {
        label: 'Verified',
        className: 'bg-brand-emerald500/10 text-brand-emerald500',
      };
    case 'not_uploaded':
      return {
        label: 'Not Uploaded',
        className: 'bg-gray-600/50 text-gray-400',
      };
    case 'resubmit':
      return {
        label: 'Resubmit',
        className: 'bg-red-500/10 text-red-500',
      };
    case 'expired':
      return {
        label: 'Expired',
        className: 'bg-red-500/10 text-red-500',
      };
    case 'rejected':
      return {
        label: 'Rejected',
        className: 'bg-red-500/10 text-red-500',
      };
    case 'pending':
      return {
        label: 'Pending',
        className: 'bg-amber-500/10 text-amber-500',
      };
    default:
      return {
        label: 'Unknown',
        className: 'bg-gray-600/50 text-gray-400',
      };
  }
};

// Get button config based on KYC status
const getButtonConfig = (status: KYCStatus): { show: boolean; label: string; variant: 'primary' | 'danger' } => {
  switch (status) {
    case 'not_started':
    case 'not_verified':
      return { show: true, label: 'Start KYC', variant: 'danger' };
    case 'verified':
      return { show: true, label: 'Update Documents', variant: 'primary' };
    case 'rejected':
    case 'resubmission_requested':
      return { show: true, label: 'Resubmit', variant: 'danger' };
    case 'expired':
      return { show: true, label: 'Renew Documents', variant: 'danger' };
    case 'pending':
      return { show: false, label: '', variant: 'primary' }; // Hide button while pending
    default:
      return { show: true, label: 'Update KYC', variant: 'danger' };
  }
};

const KYCVerificationCard: React.FC<KYCVerificationCardProps> = ({ 
  status, 
  documents, 
  onUpdateKYC 
}) => {
  const statusConfig = getStatusConfig(status);
  const StatusIcon = statusConfig.Icon;
  const buttonConfig = getButtonConfig(status);

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl overflow-hidden flex flex-col h-full border border-gray-700">
      {/* Header */}
      <div className="px-4 py-3 flex justify-between items-center flex-shrink-0 bg-gray-800 border-b border-gray-700">
        <h3 className="text-base font-semibold text-white font-sans">KYC Verification</h3>
        {onUpdateKYC && buttonConfig.show && (
          <button
            onClick={onUpdateKYC}
            className={`px-4 py-1.5 text-xs font-sans font-medium rounded-full shadow-lg transition-colors ${
              buttonConfig.variant === 'primary'
                ? 'text-white bg-gradient-primary hover:opacity-90'
                : 'text-white bg-red-500 hover:bg-red-600'
            }`}
          >
            {buttonConfig.label}
          </button>
        )}
      </div>

      {/* Content */}
      <div className="p-4 space-y-3 flex-1">
        {/* Status Badge */}
        <div 
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full ${statusConfig.className}`}
        >
          <StatusIcon className="w-4 h-4" />
          <span className="font-semibold text-sm font-sans">
            {statusConfig.label}
          </span>
        </div>

        {/* Status Message */}
        <p className="text-gray-500 text-xs font-sans">{statusConfig.message}</p>

        {/* Documents List */}
        <div className="space-y-2">
          {documents.map((doc, index) => {
            const docConfig = getDocumentStatusConfig(doc.status);
            return (
              <div 
                key={index}
                className="flex items-center justify-between px-4 py-3 rounded-lg bg-gray-900/50 border border-gray-700"
              >
                <span className="text-white text-sm font-medium font-sans">{doc.name}</span>
                <span 
                  className={`text-xs font-semibold font-sans px-2.5 py-1 rounded-full ${docConfig.className}`}
                >
                  {docConfig.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default KYCVerificationCard;
