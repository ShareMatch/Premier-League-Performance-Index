import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  ClipboardEvent,
} from "react";
import { X, CheckCircle } from "lucide-react";

// --- Types ---
interface WhatsAppVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  whatsappPhone: string;
  onVerificationSuccess?: () => void;
  onResendCode?: () => Promise<boolean>;
  onVerifyCode?: (code: string) => Promise<boolean>;
  onEditPhone?: () => void; // Navigate to edit modal
}

type VerificationStatus =
  | "idle"
  | "sending"
  | "verifying"
  | "error"
  | "success"
  | "accountCreated";

const CODE_LENGTH = 6;

// --- OTP Input Component ---
const OTPInput: React.FC<{
  value: string[];
  onChange: (value: string[]) => void;
  onComplete?: (code: string) => void;
  disabled?: boolean;
  hasError?: boolean;
}> = ({ value, onChange, onComplete, disabled = false, hasError = false }) => {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const focusInput = (index: number) => {
    if (index >= 0 && index < CODE_LENGTH) {
      inputRefs.current[index]?.focus();
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    index: number
  ) => {
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

    // Auto-submit when last digit is entered
    if (inputValue && index === CODE_LENGTH - 1) {
      const fullCode = newValue.join("");
      if (fullCode.length === CODE_LENGTH && onComplete) {
        // Small delay to allow state to update and show the digit
        setTimeout(() => onComplete(fullCode), 50);
      }
    }
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    index: number
  ) => {
    if (e.key === "Backspace") {
      if (!value[index] && index > 0) {
        // If current input is empty, move to previous and clear it
        focusInput(index - 1);
        const newValue = [...value];
        newValue[index - 1] = "";
        onChange(newValue);
      } else if (value[index]) {
        // Clear current input
        const newValue = [...value];
        newValue[index] = "";
        onChange(newValue);
      }
      e.preventDefault();
    } else if (e.key === "ArrowLeft" && index > 0) {
      focusInput(index - 1);
    } else if (e.key === "ArrowRight" && index < CODE_LENGTH - 1) {
      focusInput(index + 1);
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, CODE_LENGTH);

    if (pastedData.length > 0) {
      const newValue = [...value];
      for (let i = 0; i < CODE_LENGTH; i++) {
        newValue[i] = pastedData[i] || "";
      }
      onChange(newValue);

      // Focus the last filled input or the next empty one
      const focusIndex = Math.min(pastedData.length, CODE_LENGTH - 1);
      focusInput(focusIndex);

      // Auto-submit if all digits pasted
      if (pastedData.length === CODE_LENGTH && onComplete) {
        setTimeout(() => onComplete(pastedData), 50);
      }
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
          ref={(el) => {
            inputRefs.current[index] = el;
          }}
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
            bg-gray-200 text-gray-900
            rounded-full shadow-inner
            outline-none
            transition-all duration-200
            disabled:opacity-50 disabled:cursor-not-allowed
            font-sans
            ${
              hasError
                ? "ring-2 ring-red-500 focus:ring-red-500"
                : "focus:ring-2 focus:ring-brand-emerald500"
            }
          `}
        />
      ))}
    </div>
  );
};

// --- Main Modal Component ---
export const WhatsAppVerificationModal: React.FC<
  WhatsAppVerificationModalProps
> = ({
  isOpen,
  onClose,
  whatsappPhone,
  onVerificationSuccess,
  onResendCode,
  onVerifyCode,
  onEditPhone,
}) => {
  const [code, setCode] = useState<string[]>(Array(CODE_LENGTH).fill(""));
  const [status, setStatus] = useState<VerificationStatus>("idle");
  const [message, setMessage] = useState<string>("");
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes validity
  const [resendCooldown, setResendCooldown] = useState(0); // 30 seconds internal cooldown

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setCode(Array(CODE_LENGTH).fill(""));
      setStatus("idle");
      setMessage("");
      setTimeLeft(300); // 5 minutes validity
      setResendCooldown(30); // 30 seconds internal cooldown
    }
  }, [isOpen]);

  // Countdown timer
  useEffect(() => {
    if (!isOpen || status === "sending") return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, status]);

  const handleCodeChange = useCallback(
    (newCode: string[]) => {
      setCode(newCode);
      if (status === "error") {
        setStatus("idle");
        setMessage("");
      }
    },
    [status]
  );

  const handleVerify = async (directCode?: string) => {
    // Use directCode if provided (from onComplete), otherwise use state
    const enteredCode = directCode || code.join("");
    if (enteredCode.length !== CODE_LENGTH || status === "verifying") return;

    setStatus("verifying");
    setMessage("Verifying code...");

    try {
      if (onVerifyCode) {
        const success = await onVerifyCode(enteredCode);
        if (success) {
          setStatus("success");
          setMessage("WhatsApp verified successfully!");
          // After showing success toast, transition to account created screen
          setTimeout(() => {
            setStatus("accountCreated");
          }, 1500);
          // Then redirect to login after showing account created message
          setTimeout(() => {
            onVerificationSuccess?.();
          }, 3500);
        } else {
          throw new Error("Invalid verification code");
        }
      } else {
        // Default behavior: simulate verification
        await new Promise((resolve) => setTimeout(resolve, 1000));
        setStatus("success");
        setMessage("WhatsApp verified successfully!");
        setTimeout(() => {
          setStatus("accountCreated");
        }, 1500);
        setTimeout(() => {
          onVerificationSuccess?.();
        }, 3500);
      }
    } catch (error: any) {
      setStatus("error");
      setMessage(error.message || "Invalid code. Please try again.");
      setCode(Array(CODE_LENGTH).fill(""));
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || status === "sending") return;

    setStatus("sending");
    setMessage("Sending new code...");

    try {
      if (onResendCode) {
        const success = await onResendCode();
        if (success) {
          setTimeLeft(300); // 5 minutes validity
          setResendCooldown(30); // 30 seconds cooldown
          setStatus("idle");
          setMessage(
            `A new code has been sent to ${formatPhoneNumber(whatsappPhone)}`
          );
          setCode(Array(CODE_LENGTH).fill("")); // Clear code on resend
        } else {
          throw new Error("Failed to send code");
        }
      } else {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        setTimeLeft(300); // 5 minutes validity
        setResendCooldown(30); // 30 seconds cooldown
        setStatus("idle");
        setMessage(
          `A new code has been sent to ${formatPhoneNumber(whatsappPhone)}`
        );
        setCode(Array(CODE_LENGTH).fill("")); // Clear code on resend
      }
    } catch (error: any) {
      setStatus("error");
      setMessage(error.message || "Failed to send code. Please try again.");
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  const formatPhoneNumber = (phone: string): string => {
    // Remove all spaces and non-digit characters except +
    const cleaned = phone.replace(/[^\d+]/g, "");

    // If it starts with +, format it
    if (cleaned.startsWith("+")) {
      // Try to match country codes (1-4 digits after +)
      for (let codeLength = 4; codeLength >= 1; codeLength--) {
        const countryCode = cleaned.substring(0, codeLength + 1); // +1, +44, +971, etc.
        const phoneNumber = cleaned.substring(codeLength + 1);

        if (phoneNumber.length > 0) {
          // Format based on common patterns
          let formatted = phoneNumber;

          // UAE (+971): XX XXX XXXX
          if (countryCode === "+971" && phoneNumber.length === 9) {
            formatted = `${phoneNumber.substring(0, 2)} ${phoneNumber.substring(
              2,
              5
            )} ${phoneNumber.substring(5)}`;
          }
          // US/Canada (+1): XXX XXX XXXX
          else if (countryCode === "+1" && phoneNumber.length === 10) {
            formatted = `${phoneNumber.substring(0, 3)} ${phoneNumber.substring(
              3,
              6
            )} ${phoneNumber.substring(6)}`;
          }
          // UK (+44): XXXX XXXXXX
          else if (countryCode === "+44" && phoneNumber.length === 10) {
            formatted = `${phoneNumber.substring(0, 4)} ${phoneNumber.substring(
              4
            )}`;
          }
          // Saudi Arabia (+966): XX XXX XXXX
          else if (countryCode === "+966" && phoneNumber.length === 9) {
            formatted = `${phoneNumber.substring(0, 2)} ${phoneNumber.substring(
              2,
              5
            )} ${phoneNumber.substring(5)}`;
          }
          // India (+91): XXXXX XXXXX
          else if (countryCode === "+91" && phoneNumber.length === 10) {
            formatted = `${phoneNumber.substring(0, 5)} ${phoneNumber.substring(
              5
            )}`;
          }
          // Pakistan (+92): XXX XXXXXXX
          else if (countryCode === "+92" && phoneNumber.length === 10) {
            formatted = `${phoneNumber.substring(0, 3)} ${phoneNumber.substring(
              3
            )}`;
          }
          // Default: group in chunks of 3-4 digits
          else if (phoneNumber.length > 4) {
            formatted = `${phoneNumber.substring(
              0,
              phoneNumber.length - 4
            )} ${phoneNumber.substring(phoneNumber.length - 4)}`;
          }

          return `${countryCode} ${formatted}`;
        }
      }

      // Fallback: try simple pattern matching
      const match = cleaned.match(/^\+(\d{1,3})(\d+)$/);
      if (match) {
        const [, countryCode, rest] = match;
        // Simple formatting: add space after country code, then group digits
        let formatted = rest;
        if (rest.length > 4) {
          formatted = `${rest.substring(0, rest.length - 4)} ${rest.substring(
            rest.length - 4
          )}`;
        }
        return `+${countryCode} ${formatted}`;
      }
      return cleaned; // Return as-is if pattern doesn't match
    }

    // If no +, assume it's a local number and return as-is
    return phone;
  };

  const isCodeComplete = code.join("").length === CODE_LENGTH;
  const isVerifyDisabled =
    !isCodeComplete ||
    status === "verifying" ||
    status === "sending" ||
    status === "success" ||
    status === "accountCreated";
  const isResendDisabled = resendCooldown > 0 || status === "sending";
  const isCodeExpired = timeLeft <= 0;

  if (!isOpen) return null;

  // Account Created Success Screen - Vertical popup with just success message
  if (status === "accountCreated") {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-y-auto w-full h-full">
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

        {/* Modal Content */}
        <div
          className="relative w-full flex flex-col items-center bg-[#005430] rounded-modal p-8 gap-6 z-[101]"
          style={{ maxWidth: "min(90vw, 450px)", maxHeight: "95vh" }}
        >
          {/* Success Icon */}
          <div className="flex items-center justify-center w-20 h-20 rounded-full bg-white/10 border-2 border-white/40">
            <CheckCircle className="w-10 h-10 text-white" />
          </div>

          {/* Success Title */}
          <h1 className="text-white text-center leading-tight font-bold font-sans text-2xl md:text-3xl">
            Verification Successful!
          </h1>

          {/* Success Message */}
          <p className="text-center text-white/80 font-sans text-sm leading-relaxed">
            Your account has been created successfully.
          </p>

          {/* Redirecting indicator */}
          <p className="text-center text-white/50 font-sans text-xs">
            Redirecting to login...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-y-auto w-full h-full">
      {/* Backdrop - no click to close to preserve verification state */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Modal Content */}
      <div
        data-testid="whatsapp-verification-modal"
        className="relative w-full flex flex-col items-center bg-[#005430] rounded-modal p-6 md:p-8 gap-6 z-[101]"
        style={{ maxWidth: "min(90vw, 550px)", maxHeight: "95vh" }}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-white/70 hover:text-white transition-colors z-10"
          aria-label="Close"
          data-testid="whatsapp-verification-close-button"
        >
          <X className="w-5 h-5" strokeWidth={2} />
        </button>

        {/* Success Toast - Above Title */}
        {status === "success" && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-full animate-in fade-in slide-in-from-top-2 bg-white/10 text-white">
            <CheckCircle className="w-5 h-5 text-white" />
            <p className="font-medium text-white font-sans text-sm">
              WhatsApp verified successfully!
            </p>
          </div>
        )}

        {/* Title - Outside Inner Container */}
        <h1 className="text-white text-center leading-tight whitespace-nowrap font-bold font-sans text-2xl md:text-3xl">
          WhatsApp Verification
        </h1>

        {/* Form Content */}
        <div className="flex flex-col w-full rounded-xl p-5 gap-4">
          {/* Verification Form - Always visible */}
          <div className="flex flex-col gap-4">
            {/* Description */}
            <p className="text-center text-white font-sans text-sm leading-relaxed">
              We've sent a 6-digit verification code to your WhatsApp. Please
              enter the code below to continue.
            </p>

            {/* WhatsApp Phone Display with Edit Link */}
            <div className="flex flex-col items-center gap-1">
              <p className="text-center text-white font-medium font-sans text-sm">
                {formatPhoneNumber(whatsappPhone)}
              </p>
              {onEditPhone && status !== "success" && (
                <button
                  onClick={onEditPhone}
                  className="text-xs transition-colors font-sans"
                  aria-label="Edit phone number"
                  data-testid="whatsapp-verification-edit-phone"
                >
                  <span className="text-white/60">Wrong Number?</span>{" "}
                  <span className="text-white hover:text-white/80 underline">
                    Edit
                  </span>
                </button>
              )}
            </div>

            {/* Status Message */}
            {message && status !== "success" && (
              <p
                className={`text-center text-sm font-sans ${
                  status === "error" ? "text-red-400" : "text-white/70"
                }`}
              >
                {message}
              </p>
            )}

            {/* OTP Input */}
            <OTPInput
              value={code}
              onChange={handleCodeChange}
              onComplete={handleVerify}
              disabled={status === "verifying" || status === "success"}
              hasError={status === "error"}
            />

            {/* Timer */}
            <p className="text-center text-white font-semibold font-sans text-lg">
              {formatTime(timeLeft)}
            </p>

            {/* Resend Section */}
            <div className="text-center">
              <span className="text-white text-sm font-sans">
                Didn't receive the code?{" "}
              </span>
              <button
                type="button"
                onClick={handleResend}
                disabled={isResendDisabled}
                className={`text-sm font-semibold transition-colors font-sans ${
                  isResendDisabled
                    ? "text-white/40 cursor-not-allowed"
                    : "text-white hover:text-white/80 cursor-pointer"
                }`}
                data-testid="whatsapp-verification-resend-button"
              >
                Resend
              </button>
            </div>

            {/* Verify Button - Inside Container */}
            <div className="flex justify-center pt-2">
              <button
                type="button"
                onClick={() => handleVerify()}
                disabled={isVerifyDisabled}
                className={`px-6 py-2 rounded-full flex items-center gap-2 font-medium transition-all duration-300 text-sm font-sans ${
                  !isVerifyDisabled
                    ? "bg-gray-700 text-white hover:bg-gray-600 cursor-pointer shadow-sm"
                    : "bg-gray-700/50 text-white/40 cursor-not-allowed"
                }`}
                data-testid="whatsapp-verification-submit-button"
              >
                {status === "verifying" ? "Verifying..." : "Verify"}
                {status !== "verifying" && (
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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WhatsAppVerificationModal;
