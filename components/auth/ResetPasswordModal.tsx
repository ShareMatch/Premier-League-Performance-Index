import React, { useState, useEffect } from 'react';
import { X, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from './AuthProvider';

// Eye Icon for password visibility toggle
const EyeIcon = ({ off = false }: { off?: boolean }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    {off ? (
      <>
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </>
    ) : (
      <>
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </>
    )}
  </svg>
);

// Password Field Component
const PasswordField = ({
  id,
  label,
  placeholder,
  value,
  onChange,
  error,
  hint,
}: {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error?: string;
  hint?: string;
}) => {
  const [visible, setVisible] = useState(false);
  
  return (
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
        className={`flex items-center justify-between rounded-full ${error ? 'ring-2 ring-red-500' : ''}`}
        style={{
          background: "#E5E5E5",
          boxShadow: "0px 0px 30px 0px rgba(0, 0, 0, 0.1)",
          padding: "clamp(0.625rem, 1vh, 0.875rem) clamp(1rem, 1.8vw, 1.5rem)",
        }}
      >
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          className="flex-1 min-w-0 bg-transparent text-black placeholder-gray-400 outline-none"
          style={{ 
            fontFamily: "'Inter', sans-serif",
            fontSize: "0.875rem",
            lineHeight: "1.2",
          }}
          required
        />
        <button
          type="button"
          onClick={() => setVisible(!visible)}
          className="text-black flex-shrink-0 ml-2 transition-colors hover:text-[#019170] focus:outline-none"
          aria-label={visible ? "Hide password" : "Show password"}
        >
          <EyeIcon off={!visible} />
        </button>
      </div>
      {hint && !error && (
        <p 
          className="text-[#3AA189]"
          style={{ 
            fontFamily: "'Inter', sans-serif",
            fontSize: "0.75rem",
          }}
        >
          {hint}
        </p>
      )}
      {error && (
        <p 
          className="text-red-400"
          style={{ 
            fontFamily: "'Inter', sans-serif",
            fontSize: "0.75rem",
          }}
        >
          {error}
        </p>
      )}
    </div>
  );
};

export type ResetPasswordState = 'loading' | 'ready' | 'invalid' | 'success';

interface ResetPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void; // Called when password is reset successfully, should show login modal
  initialState?: ResetPasswordState;
}

export const ResetPasswordModal: React.FC<ResetPasswordModalProps> = ({ 
  isOpen, 
  onClose,
  onSuccess,
  initialState = 'loading',
}) => {
  const { clearPasswordRecovery, session } = useAuth();
  const [state, setState] = useState<ResetPasswordState>(initialState);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isButtonHovered, setIsButtonHovered] = useState(false);

  // Listen for PASSWORD_RECOVERY event from Supabase
  useEffect(() => {
    if (!isOpen) return;

    // Check if there's an error flag (link expired/invalid)
    const recoveryError = sessionStorage.getItem('password_recovery_error');
    if (recoveryError === 'expired') {
      setState('invalid');
      sessionStorage.removeItem('password_recovery_error');
      return;
    }

    // Listen for auth state changes
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setState('ready');
        if (window.location.hash) {
          window.history.replaceState(null, '', window.location.pathname + window.location.search);
        }
      }
    });

    // Check if we already have a session from AuthProvider (for recovery flow)
    if (session) {
      setState('ready');
      if (window.location.hash) {
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
      }
    }

    // Set a timeout to show invalid state if no recovery event
    const timeout = setTimeout(() => {
      setState((prev) => prev === 'loading' ? 'invalid' : prev);
    }, 5000);

    return () => {
      listener.subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [isOpen, session]);

  // Validation
  const passwordsMatch = newPassword === confirmPassword;
  const passwordLongEnough = newPassword.length >= 8;
  const canSubmit = state === 'ready' && passwordsMatch && passwordLongEnough && confirmPassword.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || loading) return;

    setLoading(true);
    setError(null);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) throw updateError;

      // Sign out after successful password reset
      await supabase.auth.signOut();
      
      // Clear recovery mode in AuthProvider
      clearPasswordRecovery();

      // Go directly to login modal with success message
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to update password. The link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    // Reset state when closing
    setNewPassword('');
    setConfirmPassword('');
    setError(null);
    setState('loading');
    // Clear recovery mode in AuthProvider
    clearPasswordRecovery();
    onClose();
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
          {state === 'invalid' ? 'Link Expired' : 'Create New Password'}
        </h1>

        {/* Loading State */}
        {state === 'loading' && (
          <div
            className="flex flex-col w-full"
            style={{
              background: "#021A1A",
              border: "1px solid transparent",
              backgroundImage: "linear-gradient(#021A1A, #021A1A), linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.6) 50%, rgba(255,255,255,0) 100%)",
              backgroundOrigin: "border-box",
              backgroundClip: "padding-box, border-box",
              borderRadius: "8px",
              padding: "clamp(2rem, 3vh, 3rem)",
            }}
          >
            <div className="flex flex-col items-center text-center" style={{ gap: "1rem" }}>
              <div className="w-12 h-12 border-4 border-[#3AA189]/30 border-t-[#3AA189] rounded-full animate-spin"></div>
              <p className="text-gray-300" style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.875rem" }}>
                Verifying reset link...
              </p>
            </div>
          </div>
        )}

        {/* Invalid/Expired State */}
        {state === 'invalid' && (
          <>
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
                <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center">
                  <AlertCircle className="w-8 h-8 text-red-400" />
                </div>
                
                <p 
                  className="text-gray-300"
                  style={{ 
                    fontFamily: "'Inter', sans-serif",
                    fontSize: "0.875rem",
                    lineHeight: "1.6",
                  }}
                >
                  This reset link is invalid, expired, or has already been used. Please request a new password reset.
                </p>
              </div>
            </div>

            {/* Button outside inner container */}
            <div
              className="rounded-full transition-all duration-300"
              style={{
                border: `1px solid ${isButtonHovered ? '#FFFFFF' : '#3AA189'}`,
                boxShadow: isButtonHovered ? "0 0 20px rgba(255, 255, 255, 0.3)" : "none",
                padding: "clamp(0.2rem, 0.3vw, 0.4rem)",
              }}
              onMouseEnter={() => setIsButtonHovered(true)}
              onMouseLeave={() => setIsButtonHovered(false)}
            >
              <button
                type="button"
                onClick={handleClose}
                className="text-white rounded-full flex items-center justify-center transition-all duration-300 whitespace-nowrap font-medium"
                style={{
                  fontFamily: "'Inter', sans-serif",
                  background: isButtonHovered
                    ? "#FFFFFF"
                    : "linear-gradient(0deg, rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.4)), linear-gradient(180deg, #019170 15.254%, #3AA189 49.576%, #019170 83.898%)",
                  color: isButtonHovered ? "#019170" : "#FFFFFF",
                  boxShadow: "0px 4px 12px 0px rgba(0, 0, 0, 0.12)",
                  cursor: "pointer",
                  padding: "clamp(0.5rem, 1vh, 0.75rem) clamp(1.25rem, 2vw, 1.75rem)",
                  fontSize: "clamp(0.875rem, 0.9vw + 0.2rem, 1rem)",
                  gap: "clamp(0.375rem, 0.8vw, 0.625rem)",
                }}
              >
                Back to Login
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
                  <line x1="0" y1="7" x2="40" y2="7" stroke={isButtonHovered ? "#019170" : "#FFFFFF"} strokeWidth="2" />
                  <path d="M40 1L47 7L40 13" stroke={isButtonHovered ? "#019170" : "#FFFFFF"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          </>
        )}

        {/* Ready State - Password Form */}
        {state === 'ready' && (
          <>
            {/* Inner Container with Form Fields */}
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
              <PasswordField
                id="new-password"
                label="New Password"
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                hint={newPassword.length > 0 && newPassword.length < 8 ? 'Must be at least 8 characters' : undefined}
              />
              
              <PasswordField
                id="confirm-password"
                label="Confirm Password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                error={confirmPassword.length > 0 && !passwordsMatch ? 'Passwords do not match' : undefined}
              />

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
            <form onSubmit={handleSubmit} className="flex justify-center">
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
                  {loading ? "Updating..." : "Reset Password"}
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

export default ResetPasswordModal;

