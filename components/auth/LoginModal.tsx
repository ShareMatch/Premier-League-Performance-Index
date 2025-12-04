import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { loginUser, LoginResponse } from '../../lib/api';
import { X } from 'lucide-react';

// Email Icon SVG
const EmailIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M20 4H4C2.9 4 2.01 4.9 2.01 6L2 18C2 19.1 2.9 20 4 20H20C21.1 20 22 19.1 22 18V6C22 4.9 21.1 4 20 4ZM20 8L12 13L4 8V6L12 11L20 6V8Z" fill="#000000"/>
  </svg>
);

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
        className="flex-1 min-w-0 bg-transparent text-black placeholder-gray-400 outline-none"
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
}

export const LoginModal: React.FC<LoginModalProps> = ({ 
  isOpen, 
  onClose,
  onSwitchToSignUp,
  onForgotPassword,
  onVerificationRequired
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isButtonHovered, setIsButtonHovered] = useState(false);

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
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div
        className="relative w-full flex flex-col md:flex-row items-center"
        style={{
          maxWidth: "min(90vw, 900px)",
          borderRadius: "40px",
          background: "rgba(4, 34, 34, 0.60)",
          backdropFilter: "blur(40px)",
          WebkitBackdropFilter: "blur(40px)",
          padding: "clamp(1.5rem, 2.5vh, 3rem) clamp(1.5rem, 2.5vw, 4rem)",
          gap: "clamp(2rem, 3vw, 4rem)",
          border: "1px solid rgba(58, 161, 137, 0.3)",
        }}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors z-10"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Left Side - Logo and Text */}
        <div className="flex flex-col items-center justify-center flex-1" style={{ gap: "clamp(1rem, 2vh, 1.5rem)" }}>
          <img 
            src="/logos/white_wordmark_logo_on_black-removebg-preview.png" 
            alt="ShareMatch" 
            className="h-20 object-contain"
          />
          <h1 
            className="text-[#F1F7F7] text-center leading-tight"
            style={{ 
              fontFamily: "'Playfair Display', serif",
              fontWeight: 600,
              fontSize: "clamp(1.5rem, 2vw + 0.5rem, 2.5rem)",
            }}
          >
            Login to Your<br />Account
          </h1>
        </div>

        {/* Right Side - Login Form */}
        <div
          className="flex flex-col w-full md:w-auto"
          style={{
            flex: "0 0 auto",
            minWidth: "min(100%, 380px)",
            maxWidth: "420px",
            background: "#021A1A",
            border: "1px solid transparent",
            backgroundImage: "linear-gradient(#021A1A, #021A1A), linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.6) 50%, rgba(255,255,255,0) 100%)",
            backgroundOrigin: "border-box",
            backgroundClip: "padding-box, border-box",
            borderRadius: "8px",
            padding: "clamp(1.25rem, 2vh, 2rem) clamp(1.25rem, 1.5vw, 2rem)",
            gap: "clamp(0.875rem, 1.5vh, 1.25rem)",
          }}
        >
          <h2 
            className="text-white"
            style={{ 
              fontFamily: "'Playfair Display', serif",
              fontWeight: 700,
              fontSize: "clamp(1.5rem, 1.5vw + 0.5rem, 2.5rem)" 
            }}
          >
            Login
          </h2>
          
          <form onSubmit={handleSubmit} className="flex flex-col" style={{ gap: "clamp(0.875rem, 1.5vh, 1.25rem)" }}>
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
              <span
                style={{ 
                  fontFamily: "'Inter', sans-serif",
                  fontSize: "0.75rem",
                  color: "white",
                }}
              >
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={onSwitchToSignUp}
                  className="underline transition-colors hover:text-[#3AA189]"
                >
                  Sign up
                </button>
              </span>
              <button
                type="button"
                onClick={onForgotPassword}
                className="text-white underline transition-colors hover:text-[#3AA189]"
                style={{ 
                  fontFamily: "'Inter', sans-serif",
                  fontSize: "0.75rem",
                }}
              >
                Forgot password?
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

            <div className="flex justify-center pt-2">
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
                  {loading ? "Logging in..." : "Login"}
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
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginModal;
