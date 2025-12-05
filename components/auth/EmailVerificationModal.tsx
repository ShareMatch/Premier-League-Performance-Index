import React, { useState, useRef, useEffect, useCallback, ClipboardEvent } from 'react';
import { X, CheckCircle } from 'lucide-react';

// --- Types ---
interface EmailVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  email: string;
  maskedEmail?: string;
  onVerificationSuccess?: () => void;
  onResendCode?: () => Promise<boolean>;
  onVerifyCode?: (code: string) => Promise<boolean>;
}

type VerificationStatus = 'idle' | 'sending' | 'verifying' | 'error' | 'success';

const CODE_LENGTH = 6;

// --- OTP Input Component ---
const OTPInput: React.FC<{
  value: string[];
  onChange: (value: string[]) => void;
  disabled?: boolean;
  hasError?: boolean;
}> = ({ value, onChange, disabled = false, hasError = false }) => {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const focusInput = (index: number) => {
    if (index >= 0 && index < CODE_LENGTH) {
      inputRefs.current[index]?.focus();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const inputValue = e.target.value;
    
    // Only allow digits
    if (!/^\d*$/.test(inputValue)) return;

    const newValue = [...value];
    newValue[index] = inputValue.slice(-1); // Take only the last character
    onChange(newValue);

    // Auto-focus next input
    if (inputValue && index < CODE_LENGTH - 1) {
      focusInput(index + 1);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Backspace') {
      if (!value[index] && index > 0) {
        // If current input is empty, move to previous and clear it
        focusInput(index - 1);
        const newValue = [...value];
        newValue[index - 1] = '';
        onChange(newValue);
      } else if (value[index]) {
        // Clear current input
        const newValue = [...value];
        newValue[index] = '';
        onChange(newValue);
      }
      e.preventDefault();
    } else if (e.key === 'ArrowLeft' && index > 0) {
      focusInput(index - 1);
    } else if (e.key === 'ArrowRight' && index < CODE_LENGTH - 1) {
      focusInput(index + 1);
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, CODE_LENGTH);
    
    if (pastedData.length > 0) {
      const newValue = [...value];
      for (let i = 0; i < CODE_LENGTH; i++) {
        newValue[i] = pastedData[i] || '';
      }
      onChange(newValue);
      
      // Focus the last filled input or the next empty one
      const focusIndex = Math.min(pastedData.length, CODE_LENGTH - 1);
      focusInput(focusIndex);
    }
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.select();
  };

  return (
    <div className="flex justify-center items-center gap-2 sm:gap-3">
      {Array.from({ length: CODE_LENGTH }).map((_, index) => (
        <input
          key={index}
          ref={(el) => (inputRefs.current[index] = el)}
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={1}
          value={value[index]}
          onChange={(e) => handleChange(e, index)}
          onKeyDown={(e) => handleKeyDown(e, index)}
          onPaste={handlePaste}
          onFocus={handleFocus}
          disabled={disabled}
          autoFocus={index === 0}
          className={`
            w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14
            text-center text-lg sm:text-xl md:text-2xl font-semibold
            bg-[#E5E5E5] text-gray-800
            rounded-full
            outline-none
            transition-all duration-200
            disabled:opacity-50 disabled:cursor-not-allowed
            ${hasError 
              ? 'ring-2 ring-red-500 focus:ring-red-500' 
              : 'focus:ring-2 focus:ring-[#3AA189]'
            }
          `}
          style={{ fontFamily: "'Inter', sans-serif" }}
        />
      ))}
    </div>
  );
};

// --- Main Modal Component ---
export const EmailVerificationModal: React.FC<EmailVerificationModalProps> = ({
  isOpen,
  onClose,
  email,
  maskedEmail,
  onVerificationSuccess,
  onResendCode,
  onVerifyCode,
}) => {
  const [code, setCode] = useState<string[]>(Array(CODE_LENGTH).fill(''));
  const [status, setStatus] = useState<VerificationStatus>('idle');
  const [message, setMessage] = useState<string>('');
  const [timeLeft, setTimeLeft] = useState(120); // 2 minutes OTP validity
  const [isButtonHovered, setIsButtonHovered] = useState(false);

  // Derive masked email if not provided
  const displayEmail = maskedEmail || (email ? maskEmail(email) : '');

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setCode(Array(CODE_LENGTH).fill(''));
      setStatus('idle');
      setMessage('');
      setTimeLeft(120); // 2 minutes OTP validity
    }
  }, [isOpen]);

  // Countdown timer
  useEffect(() => {
    if (!isOpen || timeLeft <= 0 || status === 'sending') return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, timeLeft, status]);

  const handleCodeChange = useCallback((newCode: string[]) => {
    setCode(newCode);
    if (status === 'error') {
      setStatus('idle');
      setMessage('');
    }
  }, [status]);

  const handleVerify = async () => {
    const enteredCode = code.join('');
    if (enteredCode.length !== CODE_LENGTH || status === 'verifying') return;

    setStatus('verifying');
    setMessage('Verifying code...');

    try {
      if (onVerifyCode) {
        const success = await onVerifyCode(enteredCode);
        if (success) {
          setStatus('success');
          setMessage('Email verified successfully!');
          setTimeout(() => {
            onVerificationSuccess?.();
          }, 1500);
        } else {
          throw new Error('Invalid verification code');
        }
      } else {
        // Default behavior: simulate verification
        await new Promise((resolve) => setTimeout(resolve, 1000));
        setStatus('success');
        setMessage('Email verified successfully!');
        setTimeout(() => {
          onVerificationSuccess?.();
        }, 1500);
      }
    } catch (error: any) {
      setStatus('error');
      setMessage(error.message || 'Invalid code. Please try again.');
      setCode(Array(CODE_LENGTH).fill(''));
    }
  };

  const handleResend = async () => {
    if (timeLeft > 0 || status === 'sending') return;

    setStatus('sending');
    setMessage('Sending new code...');

    try {
      if (onResendCode) {
        const success = await onResendCode();
        if (success) {
          setTimeLeft(120); // 2 minutes OTP validity
          setStatus('idle');
          setMessage(`A new code has been sent to ${displayEmail}`);
        } else {
          throw new Error('Failed to send code');
        }
      } else {
        // Default behavior: simulate sending
        await new Promise((resolve) => setTimeout(resolve, 1000));
        setTimeLeft(120); // 2 minutes OTP validity
        setStatus('idle');
        setMessage(`A new code has been sent to ${displayEmail}`);
      }
    } catch (error: any) {
      setStatus('error');
      setMessage(error.message || 'Failed to send code. Please try again.');
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const isCodeComplete = code.join('').length === CODE_LENGTH;
  const isVerifyDisabled = !isCodeComplete || status === 'verifying' || status === 'sending' || status === 'success';
  const isResendDisabled = timeLeft > 0 || status === 'sending';

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal Content - Vertical Layout */}
      <div
        className="relative w-full flex flex-col items-center"
        style={{
          maxWidth: "min(90vw, 550px)",
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
          onClick={onClose}
          className="absolute top-5 right-5 text-gray-400 hover:text-white transition-colors z-10"
        >
          <X className="w-5 h-5" strokeWidth={2} />
        </button>

        {/* Success Toast - Above Title */}
        {status === 'success' && (
          <div 
            className="flex items-center gap-2 px-4 py-3 rounded-lg animate-in fade-in slide-in-from-top-2"
            style={{
              background: 'rgba(1, 145, 112, 0.15)',
              border: '1px solid rgba(58, 161, 137, 0.4)',
            }}
          >
            <CheckCircle className="w-5 h-5 text-[#3AA189]" />
            <p 
              className="font-medium text-[#3AA189]"
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: 'clamp(0.875rem, 1vw, 1rem)',
              }}
            >
              Email verified successfully!
            </p>
          </div>
        )}

        {/* Title - Outside Inner Container */}
        <h1 
          className="text-[#F1F7F7] text-center leading-tight whitespace-nowrap"
          style={{ 
            fontFamily: "'Playfair Display', serif",
            fontWeight: 600,
            fontSize: "clamp(2rem, 2.5vw + 0.5rem, 3rem)",
          }}
        >
          Email Verification
        </h1>

        {/* Inner Container - Form Content */}
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
          {/* Verification Form - Always visible */}
          <div className="flex flex-col" style={{ gap: 'clamp(1rem, 1.5vh, 1.5rem)' }}>
            {/* Description */}
            <p 
              className="text-center text-white"
              style={{ 
                fontFamily: "'Inter', sans-serif",
                fontSize: 'clamp(0.75rem, 0.9vw, 0.875rem)',
                lineHeight: 1.5,
              }}
            >
              We've sent a 6-digit verification code to your email address. Please enter the code below to continue.
            </p>

            {/* Masked Email */}
            <p 
              className="text-center text-[#3AA189] font-medium"
              style={{ 
                fontFamily: "'Inter', sans-serif",
                fontSize: 'clamp(0.75rem, 0.9vw, 0.875rem)',
              }}
            >
              {displayEmail}
            </p>

            {/* Status Message */}
            {message && status !== 'success' && (
              <p 
                className={`text-center text-sm ${
                  status === 'error' ? 'text-red-400' : 'text-gray-400'
                }`}
                style={{ fontFamily: "'Inter', sans-serif" }}
              >
                {message}
              </p>
            )}

            {/* OTP Input */}
            <OTPInput
              value={code}
              onChange={handleCodeChange}
              disabled={status === 'verifying' || status === 'success'}
              hasError={status === 'error'}
            />

            {/* Timer */}
            <p 
              className="text-center text-white font-semibold"
              style={{ 
                fontFamily: "'Inter', sans-serif",
                fontSize: 'clamp(1rem, 1.2vw, 1.25rem)',
              }}
            >
              {formatTime(timeLeft)}
            </p>

            {/* Resend */}
            <div className="text-center">
              <span 
                className="text-white text-sm"
                style={{ fontFamily: "'Inter', sans-serif" }}
              >
                Didn't receive the code?{' '}
              </span>
              <button
                type="button"
                onClick={handleResend}
                disabled={isResendDisabled}
                className={`text-sm font-semibold transition-colors ${
                  isResendDisabled 
                    ? 'text-gray-500 cursor-not-allowed' 
                    : 'text-[#3AA189] hover:text-white'
                }`}
                style={{ fontFamily: "'Inter', sans-serif" }}
              >
                Resend
              </button>
            </div>

            {/* Verify Button - Inside Container */}
            <div className="flex justify-center pt-2">
              <div
                className="rounded-full transition-all duration-300"
                style={{
                  border: `1px solid ${isButtonHovered && isCodeComplete ? '#FFFFFF' : '#3AA189'}`,
                  boxShadow: isButtonHovered && isCodeComplete ? '0 0 20px rgba(255, 255, 255, 0.3)' : 'none',
                  padding: 'clamp(0.2rem, 0.3vw, 0.4rem)',
                }}
                onMouseEnter={() => setIsButtonHovered(true)}
                onMouseLeave={() => setIsButtonHovered(false)}
              >
                <button
                  type="button"
                  onClick={handleVerify}
                  disabled={isVerifyDisabled}
                  className="text-white disabled:opacity-60 disabled:cursor-not-allowed rounded-full flex items-center justify-center transition-all duration-300 whitespace-nowrap font-medium"
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    background: isButtonHovered && isCodeComplete
                      ? '#FFFFFF'
                      : 'linear-gradient(0deg, rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.4)), linear-gradient(180deg, #019170 15.254%, #3AA189 49.576%, #019170 83.898%)',
                    color: isButtonHovered && isCodeComplete ? '#019170' : '#FFFFFF',
                    boxShadow: '0px 4px 12px 0px rgba(0, 0, 0, 0.12)',
                    cursor: !isVerifyDisabled ? 'pointer' : 'not-allowed',
                    padding: 'clamp(0.5rem, 1vh, 0.75rem) clamp(1.5rem, 2.5vw, 2rem)',
                    fontSize: 'clamp(0.875rem, 0.9vw + 0.2rem, 1rem)',
                    gap: 'clamp(0.375rem, 0.8vw, 0.625rem)',
                  }}
                >
                  {status === 'verifying' ? 'Verifying...' : 'Verify'}
                  {status !== 'verifying' && (
                    <svg 
                      viewBox="0 0 48 14" 
                      fill="none" 
                      xmlns="http://www.w3.org/2000/svg"
                      className="flex-shrink-0"
                      style={{
                        width: 'clamp(1.25rem, 1.5vw + 0.3rem, 2.5rem)',
                        height: 'clamp(0.4rem, 0.5vw + 0.15rem, 0.875rem)',
                      }}
                    >
                      <line x1="0" y1="7" x2="40" y2="7" stroke={isButtonHovered && isCodeComplete ? '#019170' : '#FFFFFF'} strokeWidth="2" />
                      <path d="M40 1L47 7L40 13" stroke={isButtonHovered && isCodeComplete ? '#019170' : '#FFFFFF'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Helper Functions ---
function maskEmail(email: string): string {
  const [localPart, domain] = email.split('@');
  if (!localPart || !domain) return email;
  
  const visibleStart = localPart.slice(0, 1);
  const visibleEnd = localPart.length > 2 ? localPart.slice(-1) : '';
  const maskedPart = '*'.repeat(Math.max(localPart.length - 2, 1));
  
  return `${visibleStart}${maskedPart}${visibleEnd}@${domain}`;
}

export default EmailVerificationModal;
