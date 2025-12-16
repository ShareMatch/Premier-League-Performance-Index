import React, { useState } from "react";
import { createPortal } from "react-dom";
import { X, CheckCircle } from "lucide-react";
import Button from "../Button";

// Eye Icon for password visibility toggle
const EyeIcon = ({ off = false }: { off?: boolean }) => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    {off ? (
      <>
        <path
          d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <line
          x1="1"
          y1="1"
          x2="23"
          y2="23"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </>
    ) : (
      <>
        <path
          d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle
          cx="12"
          cy="12"
          r="3"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </>
    )}
  </svg>
);

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (currentPassword: string, newPassword: string) => Promise<void>;
}

const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  isOpen,
  onClose,
  onSave,
}) => {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isButtonHovered, setIsButtonHovered] = useState(false);

  if (!isOpen) return null;

  const handleSave = async () => {
    setError("");
    setSuccess(false);

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError("Please fill in all fields");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match");
      return;
    }

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    if (currentPassword === newPassword) {
      setError("New password must be different from current password");
      return;
    }

    setSaving(true);
    try {
      await onSave(currentPassword, newPassword);
      setSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      // Auto close after showing success message
      setTimeout(() => {
        onClose();
        setSuccess(false);
      }, 2000);
    } catch (err: any) {
      setError(err.message || "Failed to update password");
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setError("");
    setSuccess(false);
    onClose();
  };

  const canSubmit =
    currentPassword.length > 0 &&
    newPassword.length > 0 &&
    confirmPassword.length > 0;

  const modalContent = (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 overflow-y-auto w-full h-full">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal Content */}
      <div className="relative w-full max-w-xl bg-[#005430] rounded-xl sm:rounded-modal p-3 sm:p-6 max-h-[95vh] overflow-y-auto scrollbar-hide z-[101]">
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-2 sm:top-4 right-2 sm:right-4 text-gray-500 hover:text-white transition-colors z-10"
        >
          <X className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>

        {/* Form Container */}
        <div className="flex flex-col rounded-lg sm:rounded-xl p-3 sm:p-5 gap-3 sm:gap-4">
          <h2 className="text-white font-bold font-sans text-lg sm:text-2xl pr-6">
            Change Password
          </h2>

          {/* Success Message */}
          {success && (
            <div className="flex items-center justify-center gap-1.5 sm:gap-2 p-2 sm:p-3 rounded-full bg-brand-emerald500/10">
              <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-brand-emerald500" />
              <p className="text-brand-emerald500 font-medium font-sans text-xs sm:text-sm">
                Password updated!
              </p>
            </div>
          )}

          {/* Form Fields - Responsive */}
          <div className="flex flex-col gap-3 sm:gap-4">
            {error && (
              <p className="text-center text-red-400 font-sans text-xs sm:text-sm">
                {error}
              </p>
            )}

            {/* Current Password */}
            <div className="flex flex-col w-full gap-1 sm:gap-1.5">
              <label
                htmlFor="current-password"
                className="capitalize text-white text-xs sm:text-sm font-medium font-sans"
              >
                Current Password
              </label>
              <div
                className={`flex items-center w-full bg-gray-200 rounded-full shadow-inner h-9 sm:h-10 px-3 sm:px-4 focus-within:ring-2 focus-within:ring-brand-emerald500 ${
                  success ? "opacity-50" : ""
                }`}
              >
                <input
                  id="current-password"
                  type={showCurrent ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  disabled={success || saving}
                  className="flex-1 min-w-0 bg-transparent text-gray-900 placeholder-gray-500 outline-none font-sans text-xs sm:text-sm disabled:cursor-not-allowed"
                  placeholder="Enter current password"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  className="text-gray-900 flex-shrink-0 ml-1.5 sm:ml-2 transition-colors hover:text-brand-emerald500 focus:outline-none"
                  aria-label={showCurrent ? "Hide password" : "Show password"}
                >
                  <div className="w-5 h-5 sm:w-6 sm:h-6">
                    <EyeIcon off={!showCurrent} />
                  </div>
                </button>
              </div>
            </div>

            {/* New Password */}
            <div className="flex flex-col w-full gap-1 sm:gap-1.5">
              <label
                htmlFor="new-password"
                className="capitalize text-white text-xs sm:text-sm font-medium font-sans"
              >
                New Password
              </label>
              <div
                className={`flex items-center w-full bg-gray-200 rounded-full shadow-inner h-9 sm:h-10 px-3 sm:px-4 focus-within:ring-2 focus-within:ring-brand-emerald500 ${
                  success ? "opacity-50" : ""
                }`}
              >
                <input
                  id="new-password"
                  type={showNew ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={success || saving}
                  className="flex-1 min-w-0 bg-transparent text-gray-900 placeholder-gray-500 outline-none font-sans text-xs sm:text-sm disabled:cursor-not-allowed"
                  placeholder="Enter new password"
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="text-gray-900 flex-shrink-0 ml-1.5 sm:ml-2 transition-colors hover:text-brand-emerald500 focus:outline-none"
                  aria-label={showNew ? "Hide password" : "Show password"}
                >
                  <div className="w-5 h-5 sm:w-6 sm:h-6">
                    <EyeIcon off={!showNew} />
                  </div>
                </button>
              </div>
            </div>

            {/* Confirm New Password */}
            <div className="flex flex-col w-full gap-1 sm:gap-1.5">
              <label
                htmlFor="confirm-password"
                className="capitalize text-white text-xs sm:text-sm font-medium font-sans"
              >
                Confirm New Password
              </label>
              <div
                className={`flex items-center w-full bg-gray-200 rounded-full shadow-inner h-9 sm:h-10 px-3 sm:px-4 focus-within:ring-2 focus-within:ring-brand-emerald500 ${
                  success ? "opacity-50" : ""
                }`}
              >
                <input
                  id="confirm-password"
                  type={showConfirm ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={success || saving}
                  className="flex-1 min-w-0 bg-transparent text-gray-900 placeholder-gray-500 outline-none font-sans text-xs sm:text-sm disabled:cursor-not-allowed"
                  placeholder="Confirm new password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="text-gray-900 flex-shrink-0 ml-1.5 sm:ml-2 transition-colors hover:text-brand-emerald500 focus:outline-none"
                  aria-label={showConfirm ? "Hide password" : "Show password"}
                >
                  <div className="w-5 h-5 sm:w-6 sm:h-6">
                    <EyeIcon off={!showConfirm} />
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* Buttons - Responsive */}
          <div className="flex gap-2 sm:gap-3 pt-2 sm:pt-4">
            <button
              onClick={handleClose}
              className="flex-1 py-2 sm:py-2.5 rounded-full border border-brand-emerald500 text-white font-medium font-sans text-xs sm:text-sm hover:bg-brand-emerald500/10 transition-colors"
            >
              Cancel
            </button>
            <div
              className={`flex-1 rounded-full transition-all duration-300 ${
                isButtonHovered && canSubmit ? "shadow-glow" : ""
              }`}
              onMouseEnter={() => setIsButtonHovered(true)}
              onMouseLeave={() => setIsButtonHovered(false)}
            >
              <Button
                onClick={handleSave}
                disabled={!canSubmit || saving}
                // keep Update fully opaque; show disabled cursor
                className="!hover:opacity-100 !disabled:opacity-100 disabled:cursor-not-allowed"
              >
                {saving ? "Updating..." : "Update"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default ChangePasswordModal;
