import React, { useState, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import { requestPasswordReset } from '../../lib/api';
import Button from '../Button';

// Mask email address (e.g., john@example.com -> j***n@example.com)
const maskEmail = (email: string): string => {
  const [localPart, domain] = email.split('@');
  if (!domain || localPart.length <= 2) {
    return email;
  }
  const firstChar = localPart[0];
  const lastChar = localPart[localPart.length - 1];
  return `${firstChar}***${lastChar}@${domain}`;
};

// Format seconds to MM:SS
const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

// Email Icon SVG
const EmailIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M20 4H4C2.9 4 2.01 4.9 2.01 6L2 18C2 19.1 2.9 20 4 20H20C21.1 20 22 19.1 22 18V6C22 4.9 21.1 4 20 4ZM20 8L12 13L4 8V6L12 11L20 6V8Z" fill="currentColor"/>
  </svg>
);

// Input Field Component
const InputField = ({
  id,
  label,
  type = 'text',
  placeholder,
  value,
  onChange,
  showIcon = true,
  disabled = false,
}: {
  id: string;
  label: string;
  type?: string;
  placeholder: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  showIcon?: boolean;
  disabled?: boolean;
}) => (
  <div className="flex flex-col w-full gap-1.5">
    <label 
      htmlFor={id} 
      className="capitalize text-white text-sm font-medium font-sans"
    >
      {label}
    </label>
    <div className="flex items-center w-full bg-gray-200 rounded-full shadow-inner h-9 px-4 focus-within:ring-2 focus-within:ring-brand-emerald500">
      <input
        id={id}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        disabled={disabled}
        className="flex-1 min-w-0 bg-transparent text-gray-900 placeholder-gray-500 outline-none disabled:opacity-50 font-sans text-sm"
        required
      />
      {showIcon && (
        <span className="text-gray-900 flex-shrink-0 ml-2">
          <EmailIcon />
        </span>
      )}
    </div>
  </div>
);

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBackToLogin?: () => void;
  onSwitchToSignUp?: () => void;
}

export const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({ 
  isOpen, 
  onClose,
  onBackToLogin,
  onSwitchToSignUp,
}) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);
  const [countdown, setCountdown] = useState(300); // 5 minutes code validity
  const [resendCooldown, setResendCooldown] = useState(0); // 30 seconds resend internal cooldown
  const [canResend, setCanResend] = useState(true);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setEmail('');
      setLoading(false);
      setError(null);
      setEmailSent(false);
      setCountdown(300);
      setResendCooldown(0);
      setCanResend(true);
    }
  }, [isOpen]);

  const canSubmit = email.trim().length > 0 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  // Countdown timer effect
  useEffect(() => {
    if (!isOpen || !emailSent) return;
    
    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
      setResendCooldown((prev) => {
        if (prev <= 1) {
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, emailSent]);

  const sendResetEmail = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      await requestPasswordReset(email.trim().toLowerCase());
      setEmailSent(true);
      setCountdown(300); // Reset to 5 minutes
      setResendCooldown(30); // 30s resend cooldown
      setCanResend(false);
    } catch (err: any) {
      console.error('Password reset error:', err);
      setError(err.message || 'Failed to request password reset');
      setEmailSent(false); // Ensure we stay in form state
    } finally {
      setLoading(false);
    }
  }, [email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || loading) return;
    await sendResetEmail();
  };

  const handleResend = async () => {
    if (!canResend || loading) return;
    await sendResetEmail();
  };

  const handleClose = () => {
    // Reset state when closing
    setEmail('');
    setEmailSent(false);
    setError(null);
    setCountdown(300);
    setResendCooldown(0);
    setCanResend(true);
    onClose();
  };

  const handleBackToLogin = () => {
    setEmail('');
    setEmailSent(false);
    setError(null);
    setCountdown(300);
    setResendCooldown(0);
    setCanResend(true);
    onBackToLogin?.();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-y-auto w-full h-full">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={handleClose}
      />
      
      {/* Modal Content */}
      <div
        className="relative w-full flex flex-col items-center bg-[#005430] rounded-modal p-6 md:p-8 gap-6 z-[101]"
        style={{ maxWidth: "min(90vw, 550px)", maxHeight: '95vh' }}
      >
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-5 right-5 text-gray-500 hover:text-white transition-colors z-10"
        >
          <X className="w-5 h-5" strokeWidth={2} />
        </button>

        {/* Title */}
        <h1 className="text-white text-center leading-tight whitespace-nowrap font-bold font-sans text-2xl md:text-3xl">
          {emailSent ? 'Check Your Email' : 'Enter your email address'}
        </h1>

        {emailSent ? (
          // Success State
          <div className="flex flex-col w-full rounded-xl p-5">
            <div className="flex flex-col items-center text-center gap-4">
              <p className="text-white font-sans text-sm leading-relaxed">
                We've sent a password reset link to your email address{' '}
                <span className="text-white font-medium">{maskEmail(email)}</span>.{' '}
                Please check your inbox and click the link to reset your password.
              </p>
              
              
              {/* Resend Section */}
              <div className="flex flex-col items-center gap-3">
                <span className="text-white/60 font-sans text-xs">
                  Haven't received a request?
                </span>
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={!canResend || loading}
                  className={`px-6 py-2 rounded-full font-medium transition-all duration-300 text-sm font-sans ${
                    canResend && !loading
                      ? 'bg-gray-700 text-white hover:bg-gray-600 cursor-pointer shadow-sm transform active:scale-95'
                      : 'bg-gray-700/30 text-white/20 cursor-not-allowed'
                  }`}
                >
                  {loading ? 'Sending...' : 'Resend Link'}
                </button>
              </div>
            </div>
          </div>
        ) : (
          // Form State
          <>
            {/* Form Container */}
            <div className="flex flex-col w-full rounded-xl p-5 gap-4">
              <p className="text-gray-300 text-center font-sans text-sm leading-relaxed">
                We will send you a link to reset your password.
              </p>
              
              <InputField
                id="forgot-email"
                label="Email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />

              {error && (
                <p className="text-left text-red-400 font-sans text-sm -mt-2">
                  {error}
                </p>
              )}

              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleBackToLogin}
                  className="text-white underline transition-colors hover:text-brand-emerald500 font-sans text-xs"
                >
                  Login
                </button>
                <button
                  type="button"
                  onClick={onSwitchToSignUp}
                  className="text-white underline transition-colors hover:text-brand-emerald500 font-sans text-xs"
                >
                  Sign up
                </button>
              </div>
            </div>

            {/* Button outside inner container */}
            <form onSubmit={handleSubmit} className="w-full flex justify-center">
              <button
                type="submit"
                disabled={!canSubmit || loading}
                className={`px-6 py-2 rounded-full flex items-center gap-2 font-medium transition-all duration-300 text-sm font-sans ${
                  canSubmit && !loading
                    ? "bg-gray-700 text-white hover:bg-gray-600 cursor-pointer shadow-sm"
                    : "bg-gray-700/50 text-white/40 cursor-not-allowed"
                }`}
              >
                {loading ? "Sending..." : "Send Link"}
                {!loading && (
                  <svg width="18" height="7" viewBox="0 0 48 14" fill="none" className="transition-colors">
                    <line x1="0" y1="7" x2="40" y2="7" stroke="currentColor" strokeWidth="2" />
                    <path d="M40 1L47 7L40 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default ForgotPasswordModal;
