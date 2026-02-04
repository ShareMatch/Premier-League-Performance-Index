import React, { useState, useEffect } from "react";
import { X, AlertCircle } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "./AuthProvider";
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

// Password Field Component
const PasswordField = ({
  id,
  label,
  placeholder,
  value,
  onChange,
  error,
  hint,
  autoComplete,
}: {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error?: string;
  hint?: string;
  autoComplete?: string;
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
      <div
        className={`flex items-center w-full bg-gray-200 rounded-full shadow-inner h-9 px-4 ${
          error
            ? "ring-2 ring-red-500"
            : "focus-within:ring-2 focus-within:ring-brand-emerald500"
        }`}
      >
        <input
          id={id}
          type={visible ? "text" : "password"}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          className="flex-1 min-w-0 bg-transparent text-gray-900 placeholder-gray-500 outline-none font-sans text-sm"
          required
          autoComplete={autoComplete}
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
      {hint && !error && (
        <p className="text-brand-emerald500 font-sans text-xs">{hint}</p>
      )}
      {error && <p className="text-red-400 font-sans text-xs">{error}</p>}
    </div>
  );
};

export type ResetPasswordState = "loading" | "ready" | "invalid" | "success";

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
  initialState = "loading",
}) => {
  const { clearPasswordRecovery, session } = useAuth();
  const [state, setState] = useState<ResetPasswordState>(initialState);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isButtonHovered, setIsButtonHovered] = useState(false);

  // Reset states when modal opens
  useEffect(() => {
    if (isOpen) {
      setNewPassword("");
      setConfirmPassword("");
      setLoading(false);
      setError(null);
      setIsButtonHovered(false);
    }
  }, [isOpen]);

  // Listen for PASSWORD_RECOVERY event from Supabase
  useEffect(() => {
    if (!isOpen) return;

    // Check if there's an error flag (link expired/invalid)
    const recoveryError = sessionStorage.getItem("password_recovery_error");
    if (recoveryError === "expired") {
      setState("invalid");
      sessionStorage.removeItem("password_recovery_error");
      return;
    }

    // Listen for auth state changes
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setState("ready");
        if (window.location.hash) {
          window.history.replaceState(
            null,
            "",
            window.location.pathname + window.location.search,
          );
        }
      }
    });

    // Check if we already have a session from AuthProvider (for recovery flow)
    if (session) {
      setState("ready");
      if (window.location.hash) {
        window.history.replaceState(
          null,
          "",
          window.location.pathname + window.location.search,
        );
      }
    }

    // Set a timeout to show invalid state if no recovery event
    const timeout = setTimeout(() => {
      setState((prev) => (prev === "loading" ? "invalid" : prev));
    }, 5000);

    return () => {
      listener.subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [isOpen, session]);

  // Validation
  const passwordsMatch = newPassword === confirmPassword;
  const passwordLongEnough = newPassword.length >= 8;
  const canSubmit =
    state === "ready" &&
    passwordsMatch &&
    passwordLongEnough &&
    confirmPassword.length > 0;

  const GENERIC_RESET_ERROR =
    "Failed to reset password. Please try again or request a new link.";

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
      // console.error("Password reset error:", err);
      setError(GENERIC_RESET_ERROR);
      setIsButtonHovered(false);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = async () => {
    // Sign out user to prevent auto-login when closing without resetting password
    await supabase.auth.signOut();

    // Reset state when closing
    setNewPassword("");
    setConfirmPassword("");
    setError(null);
    setState("loading");
    // Clear recovery mode in AuthProvider
    clearPasswordRecovery();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-y-auto w-full h-full">
      {/* Backdrop - no click to close to preserve password reset state */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

      {/* Modal Content */}
      <div
        data-testid="reset-password-modal"
        className="relative w-full flex flex-col items-center bg-[#005430] rounded-modal p-6 md:p-8 gap-6 z-[101]"
        style={{ maxWidth: "min(90vw, 550px)", maxHeight: "95vh" }}
      >
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-5 right-5 text-gray-500 hover:text-white transition-colors z-10"
          aria-label="Close"
          data-testid="reset-password-close-button"
        >
          <X className="w-5 h-5" strokeWidth={2} />
        </button>

        {/* Title */}
        <h1 className="text-white text-center leading-tight whitespace-nowrap font-bold font-sans text-2xl md:text-3xl">
          {state === "invalid" ? "Link Expired" : "Create New Password"}
        </h1>

        {/* Loading State */}
        {state === "loading" && (
          <div className="flex flex-col w-full rounded-xl p-6">
            <div className="flex flex-col items-center text-center gap-4">
              <div className="w-12 h-12 border-4 border-brand-emerald500/30 border-t-brand-emerald500 rounded-full animate-spin"></div>
              <p className="text-gray-300 font-sans text-sm">
                Verifying reset link...
              </p>
            </div>
          </div>
        )}

        {/* Invalid/Expired State */}
        {state === "invalid" && (
          <>
            <div className="flex flex-col w-full rounded-xl p-5">
              <div className="flex flex-col items-center text-center gap-4">
                <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center">
                  <AlertCircle className="w-8 h-8 text-red-400" />
                </div>

                <p className="text-gray-300 font-sans text-sm leading-relaxed">
                  This reset link is invalid, expired, or has already been used.
                  Please request a new password reset.
                </p>
              </div>
            </div>

            {/* Button outside inner container */}
            <div
              className={`rounded-full transition-all duration-300 ${
                isButtonHovered ? "shadow-glow" : ""
              }`}
              onMouseEnter={() => setIsButtonHovered(true)}
              onMouseLeave={() => setIsButtonHovered(false)}
            >
              <Button
                type="button"
                onClick={handleClose}
                className={`px-5 py-1.5 rounded-full flex items-center gap-2 font-medium transition-all duration-300 text-sm font-sans ${
                  isButtonHovered ? "opacity-90" : ""
                } !disabled:opacity-100 disabled:cursor-not-allowed`}
                variant="white"
                data-testid="reset-password-back-to-login-button"
              >
                Back to Login
                <svg
                  width="18"
                  height="7"
                  viewBox="0 0 48 14"
                  fill="none"
                  className="transition-colors"
                >
                  <line
                    x1="0"
                    y1="7"
                    x2="40"
                    y2="7"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                  <path
                    d="M40 1L47 7L40 13"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </Button>
            </div>
          </>
        )}

        {/* Ready State - Password Form */}
        {state === "ready" && (
          <>
            {/* Form Fields */}
            <div className="flex flex-col w-full rounded-xl p-5 gap-4">
              <PasswordField
                id="new-password"
                label="New Password"
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                hint={
                  newPassword.length > 0 && newPassword.length < 8
                    ? "Must be at least 8 characters"
                    : undefined
                }
                autoComplete="new-password"
              />

              <PasswordField
                id="confirm-password"
                label="Confirm Password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                error={
                  confirmPassword.length > 0 && !passwordsMatch
                    ? "Passwords do not match"
                    : undefined
                }
                autoComplete="confirm-password"
              />

              {error && (
                <p className="text-center text-red-400 font-sans text-sm">
                  {error}
                </p>
              )}
            </div>

            {/* Button outside inner container */}
            <form
              onSubmit={handleSubmit}
              className="w-full flex justify-center"
            >
              <button
                type="submit"
                disabled={!canSubmit || loading}
                className={`px-6 py-2 rounded-full flex items-center gap-2 font-medium transition-all duration-300 text-sm font-sans ${
                  canSubmit && !loading
                    ? "bg-gray-700 text-white hover:bg-gray-600 cursor-pointer shadow-sm"
                    : "bg-gray-700/50 text-white/40 cursor-not-allowed"
                }`}
                data-testid="reset-password-submit-button"
              >
                {loading ? "Updating..." : "Reset Password"}
                {!loading && (
                  <svg
                    width="18"
                    height="7"
                    viewBox="0 0 48 14"
                    fill="none"
                    className="transition-colors"
                  >
                    <line
                      x1="0"
                      y1="7"
                      x2="40"
                      y2="7"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                    <path
                      d="M40 1L47 7L40 13"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
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

export default ResetPasswordModal;
