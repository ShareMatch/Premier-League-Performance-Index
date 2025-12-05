import React, { useState, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import { requestPasswordReset } from '../../lib/api';

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
    <path d="M20 4H4C2.9 4 2.01 4.9 2.01 6L2 18C2 19.1 2.9 20 4 20H20C21.1 20 22 19.1 22 18V6C22 4.9 21.1 4 20 4ZM20 8L12 13L4 8V6L12 11L20 6V8Z" fill="#000000"/>
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
  <div className="flex flex-col w-full" style={{ gap: "clamp(0.375rem, 0.8vh, 0.625rem)" }}>
    <label 
      htmlFor={id} 
      className="capitalize text-white"
      style={{ 
        fontFamily: "'Inter', sans-serif",
        fontSize: "0.875rem",
        fontWeight: 500,
      }}
    >
      {label}
    </label>
    <div
      className="flex items-center justify-between rounded-full"
      style={{
        background: "#E5E5E5",
        boxShadow: "0px 0px 30px 0px rgba(0, 0, 0, 0.1)",
        padding: "clamp(0.625rem, 1vh, 0.875rem) clamp(1rem, 1.8vw, 1.5rem)",
      }}
    >
      <input
        id={id}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        disabled={disabled}
        className="flex-1 min-w-0 bg-transparent text-black placeholder-gray-400 outline-none disabled:opacity-50"
        style={{ 
          fontFamily: "'Inter', sans-serif",
          fontSize: "0.875rem",
          lineHeight: "1.2",
        }}
        required
      />
      {showIcon && (
        <span className="text-black flex-shrink-0 ml-2">
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
  const [isButtonHovered, setIsButtonHovered] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [countdown, setCountdown] = useState(300); // 5 minutes in seconds
  const [canResend, setCanResend] = useState(false);

  const canSubmit = email.trim().length > 0 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  // Countdown timer effect
  useEffect(() => {
    if (!emailSent) return;
    
    if (countdown <= 0) {
      setCanResend(true);
      return;
    }

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [emailSent, countdown]);

  const sendResetEmail = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      await requestPasswordReset(email.trim().toLowerCase());
      setEmailSent(true);
      setCountdown(300); // Reset to 5 minutes
      setCanResend(false);
    } catch (err: any) {
      // We always show success message for security (don't reveal if email exists)
      setEmailSent(true);
      setCountdown(300);
      setCanResend(false);
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
    setCanResend(false);
    onClose();
  };

  const handleBackToLogin = () => {
    setEmail('');
    setEmailSent(false);
    setError(null);
    setCountdown(300);
    setCanResend(false);
    onBackToLogin?.();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50"
        onClick={handleClose}
      />
      
      {/* Modal Content - Vertical Layout */}
      <div
        className="relative w-full flex flex-col items-center"
        style={{
          maxWidth: "min(90vw, 650px)",
          borderRadius: "40px",
          background: "rgba(4, 34, 34, 0.60)",
          backdropFilter: "blur(40px)",
          WebkitBackdropFilter: "blur(40px)",
          padding: "clamp(2rem, 3vh, 3rem) clamp(2rem, 3vw, 3rem)",
          gap: "clamp(1.5rem, 2vh, 2rem)",
        }}
      >
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-5 right-5 text-gray-400 hover:text-white transition-colors z-10"
        >
          <X className="w-5 h-5" strokeWidth={2} />
        </button>

        {/* Title */}
        <h1 
          className="text-[#F1F7F7] text-center leading-tight whitespace-nowrap"
          style={{ 
            fontFamily: "'Playfair Display', serif",
            fontWeight: 600,
            fontSize: "clamp(2rem, 2.5vw + 0.5rem, 3rem)",
          }}
        >
          {emailSent ? 'Check Your Email' : 'Enter your email address'}
        </h1>

        {emailSent ? (
          // Success State
          <div
            className="flex flex-col w-full"
            style={{
              background: "#021A1A",
              border: "1px solid transparent",
              backgroundImage: "linear-gradient(#021A1A, #021A1A), linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.6) 50%, rgba(255,255,255,0) 100%)",
              backgroundOrigin: "border-box",
              backgroundClip: "padding-box, border-box",
              borderRadius: "8px",
              padding: "clamp(1.5rem, 2vh, 2rem)",
            }}
          >
            <div className="flex flex-col items-center text-center" style={{ gap: "clamp(1rem, 1.5vh, 1.25rem)" }}>
              <p 
                className="text-gray-300"
                style={{ 
                  fontFamily: "'Inter', sans-serif",
                  fontSize: "0.875rem",
                  lineHeight: "1.6",
                }}
              >
                We've sent a password reset link to your email address{' '}
                <span className="text-[#09FFC6] font-medium">{maskEmail(email)}</span>.{' '}
                Please check your inbox and click the link to reset your password.
              </p>
              
              {/* Countdown Timer */}
              <p 
                className="text-white font-medium"
                style={{ 
                  fontFamily: "'Inter', sans-serif",
                  fontSize: "1.25rem",
                  letterSpacing: "0.05em",
                }}
              >
                {formatTime(countdown)}
              </p>
              
              {/* Resend Section */}
              <div className="flex flex-col items-center" style={{ gap: "0.5rem" }}>
                <p 
                  className="text-gray-400"
                  style={{ 
                    fontFamily: "'Inter', sans-serif",
                    fontSize: "0.875rem",
                  }}
                >
                  Haven't received a request?
                </p>
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={!canResend || loading}
                  className={`font-medium transition-colors ${canResend ? 'text-[#09FFC6] hover:text-[#3AA189] cursor-pointer' : 'text-gray-500 cursor-not-allowed'}`}
                  style={{ 
                    fontFamily: "'Inter', sans-serif",
                    fontSize: "0.875rem",
                  }}
                >
                  {loading ? 'Sending...' : 'Resend'}
                </button>
              </div>
            </div>
          </div>
        ) : (
          // Form State
          <>
            {/* Inner Container with Form */}
            <div
              className="flex flex-col w-full"
              style={{
                background: "#021A1A",
                border: "1px solid transparent",
                backgroundImage: "linear-gradient(#021A1A, #021A1A), linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.6) 50%, rgba(255,255,255,0) 100%)",
                backgroundOrigin: "border-box",
                backgroundClip: "padding-box, border-box",
                borderRadius: "8px",
                padding: "clamp(1.5rem, 2vh, 2rem)",
                gap: "clamp(1rem, 1.5vh, 1.25rem)",
              }}
            >
              <p 
                className="text-gray-300 text-center"
                style={{ 
                  fontFamily: "'Inter', sans-serif",
                  fontSize: "0.875rem",
                  lineHeight: "1.5",
                }}
              >
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

              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleBackToLogin}
                  className="text-white underline transition-colors hover:text-[#3AA189]"
                  style={{ 
                    fontFamily: "'Inter', sans-serif",
                    fontSize: "0.75rem",
                  }}
                >
                  Login
                </button>
                <button
                  type="button"
                  onClick={onSwitchToSignUp}
                  className="text-white underline transition-colors hover:text-[#3AA189]"
                  style={{ 
                    fontFamily: "'Inter', sans-serif",
                    fontSize: "0.75rem",
                  }}
                >
                  Sign up
                </button>
              </div>

              {error && (
                <p 
                  className="text-center text-red-400"
                  style={{ 
                    fontFamily: "'Inter', sans-serif",
                    fontSize: "clamp(0.75rem, 0.8vw + 0.25rem, 0.875rem)" 
                  }}
                >
                  {error}
                </p>
              )}
            </div>

            {/* Button outside inner container */}
            <form onSubmit={handleSubmit} className="w-full flex justify-center">
              <div
                className="rounded-full transition-all duration-300"
                style={{
                  border: `1px solid ${isButtonHovered && canSubmit ? '#FFFFFF' : '#3AA189'}`,
                  boxShadow: isButtonHovered && canSubmit ? "0 0 20px rgba(255, 255, 255, 0.3)" : "none",
                  padding: "clamp(0.2rem, 0.3vw, 0.4rem)",
                }}
                onMouseEnter={() => setIsButtonHovered(true)}
                onMouseLeave={() => setIsButtonHovered(false)}
              >
                <button
                  type="submit"
                  disabled={!canSubmit || loading}
                  className="text-white disabled:opacity-60 disabled:cursor-not-allowed rounded-full flex items-center justify-center transition-all duration-300 whitespace-nowrap font-medium"
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    background: isButtonHovered && canSubmit
                      ? "#FFFFFF"
                      : "linear-gradient(0deg, rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.4)), linear-gradient(180deg, #019170 15.254%, #3AA189 49.576%, #019170 83.898%)",
                    color: isButtonHovered && canSubmit ? "#019170" : "#FFFFFF",
                    boxShadow: "0px 4px 12px 0px rgba(0, 0, 0, 0.12)",
                    cursor: canSubmit && !loading ? "pointer" : "not-allowed",
                    padding: "clamp(0.5rem, 1vh, 0.75rem) clamp(1.25rem, 2vw, 1.75rem)",
                    fontSize: "clamp(0.875rem, 0.9vw + 0.2rem, 1rem)",
                    gap: "clamp(0.375rem, 0.8vw, 0.625rem)",
                  }}
                >
                  {loading ? "Sending..." : "Send Link"}
                  {!loading && (
                    <svg 
                      viewBox="0 0 48 14" 
                      fill="none" 
                      xmlns="http://www.w3.org/2000/svg"
                      className="flex-shrink-0"
                      style={{
                        width: "clamp(1.25rem, 1.5vw + 0.3rem, 2.5rem)",
                        height: "clamp(0.4rem, 0.5vw + 0.15rem, 0.875rem)",
                      }}
                    >
                      <line x1="0" y1="7" x2="40" y2="7" stroke={isButtonHovered && canSubmit ? "#019170" : "#FFFFFF"} strokeWidth="2" />
                      <path d="M40 1L47 7L40 13" stroke={isButtonHovered && canSubmit ? "#019170" : "#FFFFFF"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default ForgotPasswordModal;

