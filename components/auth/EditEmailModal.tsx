'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { checkEmailVerificationStatus } from '../../lib/api';

interface EditEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentEmail: string;
  onSave: (newEmail: string) => Promise<boolean>;
}

// Validate email format
const isValidEmailFormat = (email: string): boolean => {
  if (!email.trim()) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

export const EditEmailModal: React.FC<EditEmailModalProps> = ({
  isOpen,
  onClose,
  currentEmail,
  onSave,
}) => {
  const [email, setEmail] = useState(currentEmail);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [isButtonHovered, setIsButtonHovered] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setEmail(currentEmail);
      setError(null);
      setFieldError(null);
      setLoading(false);
      setIsButtonHovered(false);
    }
  }, [isOpen, currentEmail]);

  const canSubmit = email.trim().length > 0 && isValidEmailFormat(email) && email.toLowerCase() !== currentEmail.toLowerCase() && !fieldError;

  // Handle email blur - validate format and check for duplicates
  const handleEmailBlur = async (value: string) => {
    const emailValue = value.trim().toLowerCase();
    
    // Skip if empty
    if (!emailValue) return;
    
    // Check format first
    if (!isValidEmailFormat(emailValue)) {
      setFieldError('Invalid email address');
      return;
    }
    
    // Check if email is same as current
    if (emailValue === currentEmail.toLowerCase()) {
      return;
    }
    
    // Check if email already exists
    try {
      const emailStatus = await checkEmailVerificationStatus(emailValue);
      if (emailStatus.exists) {
        setFieldError('An account with this email already exists');
      }
    } catch (e) {
      console.error('Error checking email status on blur:', e);
    }
  };

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
      setIsButtonHovered(false);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 overflow-y-auto w-full h-full">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="relative w-full max-w-sm bg-[#005430] rounded-xl sm:rounded-modal p-3 sm:p-5 max-h-[95vh] overflow-y-auto scrollbar-hide z-[101]">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-2 sm:top-4 right-2 sm:right-4 text-gray-500 hover:text-white transition-colors z-10"
        >
          <X className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>

        {/* Form Container */}
        <div className="flex flex-col rounded-lg sm:rounded-xl p-2 sm:p-4 gap-1.5 sm:gap-2 items-center">
          <h2 className="text-white font-bold font-sans text-lg sm:text-xl text-center mb-0">
            Edit Email
          </h2>

          <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:gap-3 w-full">
            {/* Email Input */}
            <div className="flex flex-col w-full gap-1 sm:gap-1.5">
              <label htmlFor="edit-email" className="text-white text-xs sm:text-sm font-medium font-sans">
                Email Address
              </label>
              <div className={`flex items-center w-full bg-gray-200 rounded-full shadow-inner h-9 sm:h-10 px-3 sm:px-4 focus-within:ring-2 ${fieldError ? 'ring-2 ring-red-500 focus-within:ring-red-500' : 'focus-within:ring-brand-emerald500'}`}>
                <input
                  id="edit-email"
                  type="email"
                  placeholder="Enter new email address"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error) setError(null);
                    if (fieldError) setFieldError(null);
                  }}
                  onBlur={(e) => handleEmailBlur(e.target.value)}
                  className="flex-1 min-w-0 bg-transparent text-gray-900 placeholder-gray-500 outline-none font-sans text-xs sm:text-sm"
                />
              </div>
              {(fieldError || error) && (
                <p className="text-red-400 text-[10px] sm:text-xs font-sans ml-1">{fieldError || error}</p>
              )}
              {!fieldError && !error && (
                <p className="text-gray-300 text-[10px] sm:text-xs font-sans ml-1">
                  A verification code will be sent to your new email address.
                </p>
              )}
            </div>

            {/* Buttons */}
            <div className="flex gap-2 sm:gap-3 pt-1 sm:pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2 sm:py-2.5 rounded-full border border-brand-emerald500 text-white font-medium font-sans text-xs sm:text-sm hover:bg-brand-emerald500/10 transition-colors"
              >
                Cancel
              </button>
              <div
                className={`flex-1 rounded-full transition-all duration-300 ${
                  isButtonHovered && canSubmit ? 'shadow-glow' : ''
                }`}
                onMouseEnter={() => setIsButtonHovered(true)}
                onMouseLeave={() => setIsButtonHovered(false)}
              >
                <button
                  type="submit"
                  disabled={!canSubmit || loading}
                  className={`w-full py-1.5 sm:py-2 rounded-full font-medium font-sans text-xs sm:text-sm transition-all duration-300 disabled:opacity-60 bg-white text-brand-primary ${
                    isButtonHovered && canSubmit ? 'opacity-90' : ''
                  }`}
                >
                  {loading ? 'Updating...' : 'Update'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default EditEmailModal;
