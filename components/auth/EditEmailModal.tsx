'use client';

import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface EditEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentEmail: string;
  onSave: (newEmail: string) => Promise<boolean>;
}

const EmailIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
    <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
  </svg>
);

export const EditEmailModal: React.FC<EditEmailModalProps> = ({
  isOpen,
  onClose,
  currentEmail,
  onSave,
}) => {
  const [email, setEmail] = useState(currentEmail);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isButtonHovered, setIsButtonHovered] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setEmail(currentEmail);
      setError(null);
      setLoading(false);
      setIsButtonHovered(false);
    }
  }, [isOpen, currentEmail]);

  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const canSubmit = email.trim().length > 0 && isValidEmail(email) && email.toLowerCase() !== currentEmail.toLowerCase();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || loading) return;

    setLoading(true);
    setError(null);

    try {
      const success = await onSave(email.trim().toLowerCase());
      if (success) {
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" />

      {/* Modal Content */}
      <div
        className="relative w-full flex flex-col md:flex-row md:items-stretch items-center bg-modal-outer/60 backdrop-blur-[40px] rounded-modal p-6 md:p-8 gap-6"
        style={{ maxWidth: "min(90vw, 850px)" }}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors z-10"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Left Side - Logo */}
        <div className="hidden md:flex flex-col items-center justify-center w-5/12">
          <img
            src="/logos/white_wordmark_logo_on_black-removebg-preview.png"
            alt="ShareMatch"
            className="h-28 object-contain"
          />
        </div>

        {/* Right Side - Form */}
        <div
          className="flex flex-col w-full md:w-auto gap-4 md:pr-2"
          style={{
            flex: "1 1 auto",
            minWidth: "min(100%, 360px)",
            maxWidth: "400px",
          }}
        >
          <div
            className="flex flex-col bg-modal-inner rounded-xl p-5 gap-4 border border-transparent"
            style={{
              backgroundImage: "linear-gradient(#021A1A, #021A1A), linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.6) 50%, rgba(255,255,255,0) 100%)",
              backgroundOrigin: "border-box",
              backgroundClip: "padding-box, border-box",
            }}
          >
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {/* Email Input */}
              <div className="flex flex-col w-full gap-1.5">
                <label htmlFor="edit-email" className="text-white text-sm font-medium font-sans">
                  Email
                </label>
                <div className="flex items-center w-full bg-gray-200 rounded-full shadow-inner h-9 px-4 focus-within:ring-2 focus-within:ring-brand-emerald500">
                  <input
                    id="edit-email"
                    type="email"
                    placeholder="Enter new email address"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (error) setError(null);
                    }}
                    className="flex-1 min-w-0 bg-transparent text-gray-900 placeholder-gray-500 outline-none font-sans text-sm"
                  />
                  <span className="text-gray-900 flex-shrink-0 ml-2">
                    <EmailIcon />
                  </span>
                </div>
              </div>

              {/* Info Text */}
              <p className="font-sans text-xs text-gray-500">
                A new verification code will be sent to your updated email address.
              </p>

              {error && (
                <p className="text-center text-red-400 font-sans text-sm">
                  {error}
                </p>
              )}

              {/* Buttons */}
              <div className="flex items-center justify-center gap-4 pt-2">
                {/* Secondary Button - Cancel */}
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-full border border-brand-emerald500 text-brand-emerald500 hover:bg-brand-emerald500/10 px-5 py-1.5 font-sans text-sm font-medium transition-colors"
                >
                  Cancel
                </button>

                {/* Primary Button - Update */}
                <div
                  className={`rounded-full transition-all duration-300 p-0.5 ${
                    isButtonHovered && canSubmit
                      ? 'border border-white shadow-glow'
                      : 'border border-brand-emerald500'
                  }`}
                  onMouseEnter={() => setIsButtonHovered(true)}
                  onMouseLeave={() => setIsButtonHovered(false)}
                >
                  <button
                    type="submit"
                    disabled={!canSubmit || loading}
                    className={`px-5 py-1.5 rounded-full flex items-center gap-2 font-medium transition-all duration-300 disabled:opacity-60 text-sm font-sans ${
                      isButtonHovered && canSubmit
                        ? 'bg-white text-brand-emerald500'
                        : 'bg-gradient-primary text-white'
                    }`}
                  >
                    {loading ? 'Updating...' : 'Update'}
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

export default EditEmailModal;
