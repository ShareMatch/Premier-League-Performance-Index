import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { loginUser, LoginResponse } from '../../lib/api';
import { X } from 'lucide-react';

// Email Icon SVG
const EmailIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M20 4H4C2.9 4 2.01 4.9 2.01 6L2 18C2 19.1 2.9 20 4 20H20C21.1 20 22 19.1 22 18V6C22 4.9 21.1 4 20 4ZM20 8L12 13L4 8V6L12 11L20 6V8Z" fill="currentColor" />
  </svg>
);

// Eye Icon for password visibility toggle
const EyeIcon = ({ off = false }: { off?: boolean }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    {off ? (
      <>
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </>
    ) : (
      <>
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </>
    )}
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
  showIcon = true
}: {
  id: string;
  label: string;
  type?: string;
  placeholder: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  showIcon?: boolean;
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
        className="flex-1 min-w-0 bg-transparent text-gray-900 placeholder-gray-500 outline-none font-sans text-sm"
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

// Password Field Component
const PasswordField = ({
  id,
  label,
  placeholder,
  value,
  onChange
}: {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) => {
  const [visible, setVisible] = useState(false);

  return (
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
          type={visible ? 'text' : 'password'}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          className="flex-1 min-w-0 bg-transparent text-gray-900 placeholder-gray-500 outline-none font-sans text-sm"
          required
        />
        <button
          type="button"
          onClick={() => setVisible(!visible)}
          className="text-gray-900 flex-shrink-0 ml-2 transition-colors hover:text-brand-emerald500 focus:outline-none"
          aria-label={visible ? "Hide password" : "Show password"}
        >
          <EyeIcon off={!visible} />
        </button>
      </div>
    </div>
  );
};

export interface VerificationRequiredData {
  email: string;
  verificationType: 'email' | 'whatsapp';
  whatsappData?: {
    masked: string;
    raw: string;
  };
}

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchToSignUp?: () => void;
  onForgotPassword?: () => void;
  onVerificationRequired?: (data: VerificationRequiredData) => void;
  successMessage?: string; // Optional success message to display (e.g., after password reset)
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  onSwitchToSignUp,
  onForgotPassword,
  onVerificationRequired,
  successMessage,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isButtonHovered, setIsButtonHovered] = useState(false);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setEmail('');
      setPassword('');
      setError(null);
      setLoading(false);
      setIsButtonHovered(false);
    }
  }, [isOpen]);

  const canSubmit = email.trim().length > 0 && password.trim().length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || loading) return;

    setLoading(true);
    setError(null);

    try {
      const result: LoginResponse = await loginUser(email.trim().toLowerCase(), password);

      // Handle verification required response
      if (result.requiresVerification && result.verificationType) {
        if (onVerificationRequired) {
          onVerificationRequired({
            email: result.email || email.trim().toLowerCase(),
            verificationType: result.verificationType,
            whatsappData: result.whatsappData,
          });
        }

        // Close login modal - parent will open the appropriate verification modal
        onClose();
        return;
      }

      // Login successful - set session in Supabase client
      if (result.session) {
        await supabase.auth.setSession({
          access_token: result.session.access_token,
          refresh_token: result.session.refresh_token,
        });
      }

      // Success - close modal (AuthProvider will handle the session update)
      onClose();
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
      setIsButtonHovered(false);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-y-auto w-full h-full">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Content - Matching SignUp theme */}
      <div
        className="relative w-full flex flex-col md:flex-row items-stretch overflow-hidden my-4 bg-[#005430] rounded-modal z-[101]"
        style={{ 
          maxWidth: 'min(90vw, 850px)',
          maxHeight: '95vh',
        }}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 text-gray-400 hover:text-white transition-colors z-30"
        >
          <X className="w-5 h-5" strokeWidth={2} />
        </button>

        {/* Left Side - Branding */}
        <div className="hidden md:flex w-5/12 flex-col items-center justify-center p-4 pb-24">
          <img
            src="/logos/mobile-header-logo-matched.svg"
            alt="ShareMatch"
            className="h-32 object-contain mb-3"
          />
          <h1
            className="text-white text-center leading-tight mb-4 whitespace-pre-line font-bold"
            style={{ fontSize: 'clamp(2rem, 2.5vw + 0.5rem, 3rem)' }}
          >
            Welcome <br /> Back
          </h1>
          <p className="mt-8 text-gray-400 text-center font-medium text-lg leading-relaxed px-4">
            Real Markets. Real Transparency.
          </p>
        </div>

        {/* Mobile Header */}
        <div className="md:hidden p-5 flex items-center justify-center">
          <img src="/logos/mobile-header-logo-matched.svg" alt="ShareMatch" className="h-16 object-contain" />
        </div>

        {/* Right Side - Login Form */}
        <div className="flex-1 p-3 pt-10 md:p-4 md:pt-14 md:pr-8 overflow-y-auto flex flex-col" style={{ maxHeight: 'calc(95vh - 2rem)' }}>
          {successMessage && (
            <p className="text-center justify-center items-center text-white bg-white/10 rounded-full px-2 py-2 font-sans text-sm mb-3">
              {successMessage}
            </p>
          )}

          <div
            className="rounded-xl p-3 md:p-4 flex flex-col border-none bg-transparent"
            style={{ minHeight: '300px' }}
          >
            <h2 className="text-white mb-3 font-bold text-xl md:text-2xl">
              Login to Your Account
            </h2>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4 flex-1">
              <InputField
                id="login-email"
                label="Email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />

              <PasswordField
                id="login-password"
                label="Password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />

              <div className="flex justify-between items-center">
                <span className="font-sans text-xs text-white">
                  Don't have an account?{' '}
                  <button
                    type="button"
                    onClick={onSwitchToSignUp}
                    className="underline transition-colors hover:text-gray-300"
                  >
                    Sign up
                  </button>
                </span>
                <button
                  type="button"
                  onClick={onForgotPassword}
                  className="text-white underline transition-colors hover:text-gray-300 font-sans text-xs"
                >
                  Forgot password?
                </button>
              </div>

              {error && (
                <p className="text-center text-red-400 font-sans text-sm">
                  {error}
                </p>
              )}

              <div className="flex justify-center pt-2 mt-auto">
                <div
                  className={`rounded-full transition-all duration-300 ${
                    isButtonHovered && canSubmit ? 'shadow-glow' : ''
                  }`}
                  onMouseEnter={() => setIsButtonHovered(true)}
                  onMouseLeave={() => setIsButtonHovered(false)}
                >
                  <button
                    type="submit"
                    disabled={!canSubmit || loading}
                    className={`px-5 py-1.5 rounded-full flex items-center gap-2 font-medium transition-all duration-300 disabled:opacity-60 text-sm font-sans bg-white text-brand-primary ${
                      isButtonHovered && canSubmit ? 'opacity-90' : ''
                    }`}
                  >
                    {loading ? "Logging in..." : "Login"}
                    {!loading && (
                      <svg width="18" height="7" viewBox="0 0 48 14" fill="none" className="transition-colors">
                        <line x1="0" y1="7" x2="40" y2="7" stroke="currentColor" strokeWidth="2" />
                        <path d="M40 1L47 7L40 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginModal;
