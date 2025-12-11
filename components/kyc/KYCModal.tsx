import React, { useState, useEffect } from 'react';
import { X, ShieldCheck, AlertTriangle, Clock, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import SumsubKYC from './SumsubKYC';
import { KycStatus, getKycUserStatus, KycUserStatusResponse, resetKycApplicant } from '../../lib/api';
import { getRejectionMessage, getRejectionSummary, getButtonIdMessage, isResubmissionAllowed } from '../../lib/rejectionReasons';

interface KYCModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  onKycComplete?: (status: KycStatus) => void;
  initialStatus?: KycStatus;
  /** When true, skip status screens and go directly to SDK for document updates */
  forceUpdateMode?: boolean;
}

type ModalView = 'intro' | 'kyc' | 'pending' | 'approved' | 'rejected' | 'resubmission' | 'cooling_off' | 'update_confirm';

export const KYCModal: React.FC<KYCModalProps> = ({
  isOpen,
  onClose,
  userId,
  onKycComplete,
  initialStatus,
  forceUpdateMode = false,
}) => {
  const [view, setView] = useState<ModalView>('intro');
  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState(false);
  const [kycData, setKycData] = useState<KycUserStatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch KYC status on mount
  useEffect(() => {
    if (!isOpen || !userId) return;

    const fetchStatus = async () => {
      try {
        setLoading(true);
        setError(null);
        const status = await getKycUserStatus(userId);
        setKycData(status);
        
        // If forceUpdateMode is true and user is approved, show confirmation dialog
        // Explain that updating documents requires re-verification
        if (forceUpdateMode && status.kyc_status === 'approved') {
          console.log('Force update mode - showing update confirmation');
          setView('update_confirm');
          setLoading(false);
          return;
        }
        
        // Determine initial view based on status
        switch (status.kyc_status) {
          case 'approved':
            if (status.is_in_cooling_off) {
              setView('cooling_off');
            } else {
              setView('approved');
            }
            break;
          case 'rejected':
            setView('rejected');
            break;
          case 'resubmission_requested':
            setView('resubmission');
            break;
          case 'pending':
          case 'on_hold':
            // Documents submitted, waiting for review
            setView('pending');
            break;
          case 'started':
            // User started but hasn't submitted - show SDK to continue
            setView('kyc');
            break;
          case 'not_started':
          default:
            setView('intro');
            break;
        }
      } catch (err: any) {
        console.error('Failed to fetch KYC status:', err);
        setError(err.message);
        setView('intro');
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
  }, [isOpen, userId, forceUpdateMode]);

  // Handle KYC completion from Sumsub SDK
  // NOTE: This is only called when user manually triggers completion, NOT automatically
  // The SDK stays open and user must click X to close
  const handleKycComplete = (data: any) => {
    console.log('KYC Complete (manual close):', data);
    const status = data.kycStatus as KycStatus;
    
    // Update local state but DON'T change the view or close the modal
    // Let the SDK show its own success/failure screen
    // User will click X when ready to close
    if (status === 'approved') {
      // Don't change view - let SDK show success screen
      // Don't call onKycComplete - don't auto-close the modal
      console.log('✅ KYC approved - SDK stays open for user to see result');
    } else if (status === 'rejected') {
      // Update rejection data for when user eventually sees the rejected view
      setKycData(prev => prev ? {
        ...prev,
        kyc_status: 'rejected',
        reject_labels: data.rejectLabels || [],
        reject_type: data.reviewRejectType,
        moderation_comment: data.moderationComment,
        button_ids: data.buttonIds,
      } : null);
      console.log('❌ KYC rejected - SDK stays open for user to see result');
    } else {
      console.log('⏳ KYC pending - SDK stays open');
    }
    // NEVER auto-close - user must click X button
  };

  const handleStartKyc = () => {
    setView('kyc');
  };

  const handleRetryKyc = () => {
    setView('kyc');
  };

  // Handle reset and update for approved users
  const handleResetAndUpdate = async () => {
    try {
      setResetting(true);
      setError(null);
      console.log('🔄 Resetting KYC for user:', userId);
      
      await resetKycApplicant(userId);
      
      console.log('✅ KYC reset successful, opening SDK');
      setResetting(false);
      setView('kyc');
    } catch (err: any) {
      console.error('❌ Failed to reset KYC:', err);
      setError(err.message || 'Failed to reset verification. Please try again.');
      setResetting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />

      {/* Modal Content */}
      <div
        className="relative w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
        style={{
          borderRadius: '24px',
          background: 'rgba(4, 34, 34, 0.95)',
          backdropFilter: 'blur(40px)',
          WebkitBackdropFilter: 'blur(40px)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-6 h-6 text-[#3AA189]" />
            <h2 className="text-xl font-semibold text-white">Identity Verification</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center p-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#3AA189]"></div>
            </div>
          ) : view === 'intro' ? (
            <IntroView onStart={handleStartKyc} />
          ) : view === 'kyc' ? (
            <div className="p-2">
              <SumsubKYC
                userId={userId}
                onComplete={handleKycComplete}
                onError={(err) => {
                  console.error('KYC Error:', err);
                  setError(err?.message || 'Verification failed');
                }}
                onClose={onClose}
              />
            </div>
          ) : view === 'pending' ? (
            <PendingView onClose={onClose} />
          ) : view === 'approved' ? (
            <ApprovedView onClose={onClose} />
          ) : view === 'cooling_off' ? (
            <CoolingOffView coolingOffUntil={kycData?.cooling_off_until} onClose={onClose} />
          ) : view === 'rejected' ? (
            <RejectedView 
              kycData={kycData} 
              onRetry={handleRetryKyc}
              onClose={onClose}
            />
          ) : view === 'resubmission' ? (
            <ResubmissionView 
              kycData={kycData} 
              onRetry={handleRetryKyc}
              onClose={onClose}
            />
          ) : view === 'update_confirm' ? (
            <UpdateConfirmView 
              onProceed={handleResetAndUpdate}
              onClose={onClose}
              isResetting={resetting}
              error={error}
            />
          ) : null}

          {error && view !== 'kyc' && (
            <div className="p-4 mx-6 mb-6 bg-red-500/20 border border-red-500/50 rounded-lg">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Intro View - explains what KYC is and why it's needed
const IntroView: React.FC<{ onStart: () => void }> = ({ onStart }) => (
  <div className="p-8 text-center">
    <div className="w-20 h-20 bg-[#3AA189]/20 rounded-full flex items-center justify-center mx-auto mb-6">
      <ShieldCheck className="w-10 h-10 text-[#3AA189]" />
    </div>
    
    <h3 className="text-2xl font-bold text-white mb-4">
      Verify Your Identity
    </h3>
    
    <p className="text-gray-400 mb-8 max-w-md mx-auto">
      To ensure a secure trading environment and comply with regulations, 
      we need to verify your identity before you can start trading.
    </p>

    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 max-w-2xl mx-auto">
      <div className="p-4 bg-gray-800/50 rounded-xl">
        <div className="text-2xl mb-2">📄</div>
        <div className="text-sm text-gray-300">Government ID</div>
        <div className="text-xs text-gray-500">Passport or ID card</div>
      </div>
      <div className="p-4 bg-gray-800/50 rounded-xl">
        <div className="text-2xl mb-2">🤳</div>
        <div className="text-sm text-gray-300">Selfie</div>
        <div className="text-xs text-gray-500">Quick photo verification</div>
      </div>
      <div className="p-4 bg-gray-800/50 rounded-xl">
        <div className="text-2xl mb-2">⏱️</div>
        <div className="text-sm text-gray-300">~2 Minutes</div>
        <div className="text-xs text-gray-500">Quick & easy process</div>
      </div>
    </div>

    <button
      onClick={onStart}
      className="px-8 py-3 bg-[#3AA189] text-white rounded-full font-semibold hover:bg-[#2d8a73] transition-colors"
    >
      Start Verification
    </button>
  </div>
);

// Pending View - KYC submitted, waiting for review
const PendingView: React.FC<{ onClose: () => void }> = ({ onClose }) => (
  <div className="p-8 text-center">
    <div className="w-20 h-20 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
      <Clock className="w-10 h-10 text-yellow-500" />
    </div>
    
    <h3 className="text-2xl font-bold text-white mb-4">
      Verification In Progress
    </h3>
    
    <p className="text-gray-400 mb-8 max-w-md mx-auto">
      Your documents are being reviewed. This usually takes a few minutes, 
      but can take up to 24 hours in some cases. We'll notify you once complete.
    </p>

    <button
      onClick={onClose}
      className="px-8 py-3 bg-gray-700 text-white rounded-full font-semibold hover:bg-gray-600 transition-colors"
    >
      Close
    </button>
  </div>
);

// Approved View - KYC passed
const ApprovedView: React.FC<{ onClose: () => void }> = ({ onClose }) => (
  <div className="p-8 text-center">
    <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
      <CheckCircle className="w-10 h-10 text-green-500" />
    </div>
    
    <h3 className="text-2xl font-bold text-white mb-4">
      Verification Complete!
    </h3>
    
    <p className="text-gray-400 mb-8 max-w-md mx-auto">
      Your identity has been verified. You can now access all features 
      of the platform and start trading.
    </p>

    <button
      onClick={onClose}
      className="px-8 py-3 bg-[#3AA189] text-white rounded-full font-semibold hover:bg-[#2d8a73] transition-colors"
    >
      Start Trading
    </button>
  </div>
);

// Cooling Off View - approved but in 24-hour waiting period
const CoolingOffView: React.FC<{ coolingOffUntil: string | null; onClose: () => void }> = ({ coolingOffUntil, onClose }) => {
  const endTime = coolingOffUntil ? new Date(coolingOffUntil) : null;
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    if (!endTime) return;

    const updateTime = () => {
      const now = new Date();
      const diff = endTime.getTime() - now.getTime();
      
      if (diff <= 0) {
        setTimeLeft('Ready!');
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      setTimeLeft(`${hours}h ${minutes}m remaining`);
    };

    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, [endTime]);

  return (
    <div className="p-8 text-center">
      <div className="w-20 h-20 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
        <Clock className="w-10 h-10 text-blue-500" />
      </div>
      
      <h3 className="text-2xl font-bold text-white mb-4">
        Verification Approved!
      </h3>
      
      <p className="text-gray-400 mb-4 max-w-md mx-auto">
        Your identity has been verified. As a security measure, there's a 24-hour 
        cooling-off period before you can start trading.
      </p>

      <div className="bg-blue-500/20 rounded-xl p-4 mb-8 max-w-sm mx-auto">
        <div className="text-blue-400 font-semibold">{timeLeft}</div>
      </div>

      <button
        onClick={onClose}
        className="px-8 py-3 bg-gray-700 text-white rounded-full font-semibold hover:bg-gray-600 transition-colors"
      >
        Close
      </button>
    </div>
  );
};

// Rejected View - KYC failed permanently
const RejectedView: React.FC<{ 
  kycData: KycUserStatusResponse | null; 
  onRetry: () => void;
  onClose: () => void;
}> = ({ kycData, onRetry, onClose }) => {
  const canRetry = kycData?.can_resubmit ?? false;
  const rejectLabels = kycData?.reject_labels || [];
  const buttonIds = kycData?.button_ids || [];

  return (
    <div className="p-8 text-center">
      <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
        <XCircle className="w-10 h-10 text-red-500" />
      </div>
      
      <h3 className="text-2xl font-bold text-white mb-4">
        Verification Failed
      </h3>
      
      <p className="text-gray-400 mb-6 max-w-md mx-auto">
        {getRejectionSummary(kycData?.reject_type || null, rejectLabels)}
      </p>

      {(rejectLabels.length > 0 || buttonIds.length > 0) && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6 max-w-md mx-auto text-left">
          <div className="text-red-400 font-medium mb-2 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Issues Found:
          </div>
          <ul className="text-sm text-gray-300 space-y-1">
            {rejectLabels.map((label, i) => (
              <li key={`label-${i}`}>• {getRejectionMessage(label)}</li>
            ))}
            {buttonIds.map((id, i) => (
              <li key={`btn-${i}`}>• {getButtonIdMessage(id)}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex gap-4 justify-center">
        {canRetry && (
          <button
            onClick={onRetry}
            className="px-8 py-3 bg-[#3AA189] text-white rounded-full font-semibold hover:bg-[#2d8a73] transition-colors"
          >
            Try Again
          </button>
        )}
        <button
          onClick={onClose}
          className="px-8 py-3 bg-gray-700 text-white rounded-full font-semibold hover:bg-gray-600 transition-colors"
        >
          {canRetry ? 'Close' : 'Contact Support'}
        </button>
      </div>
    </div>
  );
};

// Resubmission View - KYC needs corrections
const ResubmissionView: React.FC<{ 
  kycData: KycUserStatusResponse | null; 
  onRetry: () => void;
  onClose: () => void;
}> = ({ kycData, onRetry, onClose }) => {
  const rejectLabels = kycData?.reject_labels || [];
  const buttonIds = kycData?.button_ids || [];

  return (
    <div className="p-8 text-center">
      <div className="w-20 h-20 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
        <AlertTriangle className="w-10 h-10 text-yellow-500" />
      </div>
      
      <h3 className="text-2xl font-bold text-white mb-4">
        Action Required
      </h3>
      
      <p className="text-gray-400 mb-6 max-w-md mx-auto">
        We need you to fix some issues with your verification. 
        Please review the details below and try again.
      </p>

      {(rejectLabels.length > 0 || buttonIds.length > 0) && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 mb-6 max-w-md mx-auto text-left">
          <div className="text-yellow-400 font-medium mb-2 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Please Fix:
          </div>
          <ul className="text-sm text-gray-300 space-y-1">
            {rejectLabels.map((label, i) => (
              <li key={`label-${i}`}>• {getRejectionMessage(label)}</li>
            ))}
            {buttonIds.map((id, i) => (
              <li key={`btn-${i}`}>• {getButtonIdMessage(id)}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex gap-4 justify-center">
        <button
          onClick={onRetry}
          className="px-8 py-3 bg-[#3AA189] text-white rounded-full font-semibold hover:bg-[#2d8a73] transition-colors"
        >
          Fix & Resubmit
        </button>
        <button
          onClick={onClose}
          className="px-8 py-3 bg-gray-700 text-white rounded-full font-semibold hover:bg-gray-600 transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );
};

// Update Confirm View - for approved users who want to update documents
const UpdateConfirmView: React.FC<{ 
  onProceed: () => void;
  onClose: () => void;
  isResetting?: boolean;
  error?: string | null;
}> = ({ onProceed, onClose, isResetting = false, error }) => (
  <div className="p-8 text-center">
    <div className="w-20 h-20 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
      {isResetting ? (
        <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
      ) : (
        <AlertTriangle className="w-10 h-10 text-blue-500" />
      )}
    </div>
    
    <h3 className="text-2xl font-bold text-white mb-4">
      {isResetting ? 'Resetting Verification...' : 'Update Your Documents'}
    </h3>
    
    {isResetting ? (
      <p className="text-gray-400 mb-8 max-w-md mx-auto">
        Please wait while we reset your verification status. 
        This will only take a moment.
      </p>
    ) : (
      <>
        <p className="text-gray-400 mb-6 max-w-md mx-auto">
          Your identity is currently verified. If you need to update your documents 
          (e.g., expired ID, address change), your verification will be temporarily 
          reset while we review the new documents.
        </p>

        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 mb-6 max-w-md mx-auto text-left">
          <div className="text-yellow-400 font-medium mb-2 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Please Note:
          </div>
          <ul className="text-sm text-gray-300 space-y-1">
            <li>• Your current verification will be reset</li>
            <li>• You'll need to re-upload your documents</li>
            <li>• Review typically takes a few minutes</li>
            <li>• Trading may be limited during review</li>
          </ul>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6 max-w-md mx-auto">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        <div className="flex gap-4 justify-center">
          <button
            onClick={onProceed}
            disabled={isResetting}
            className="px-8 py-3 bg-[#3AA189] text-white rounded-full font-semibold hover:bg-[#2d8a73] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Proceed to Update
          </button>
          <button
            onClick={onClose}
            disabled={isResetting}
            className="px-8 py-3 bg-gray-700 text-white rounded-full font-semibold hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
        </div>
      </>
    )}
  </div>
);

export default KYCModal;

