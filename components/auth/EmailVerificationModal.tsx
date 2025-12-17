import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  ClipboardEvent,
} from "react";
import { X, CheckCircle } from "lucide-react";

// --- Types ---
interface EmailVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  email: string;
  onVerificationSuccess?: () => void;
  onResendCode?: () => Promise<boolean>;
  onVerifyCode?: (code: string) => Promise<boolean>;
  onEditEmail?: () => void; // Navigate to edit modal
}

type VerificationStatus =
  | "idle"
  | "sending"
  | "verifying"
  | "error"
  | "success";

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
            bg-[#E5E5E5] text-gray-800
            rounded-full
            outline-none
            transition-all duration-200
            disabled:opacity-50 disabled:cursor-not-allowed
            ${
              hasError
                ? "ring-2 ring-red-500 focus:ring-red-500"
                : "focus:ring-2 focus:ring-[#005430]"
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
  onVerificationSuccess,
  onResendCode,
  onVerifyCode,
  onEditEmail,
}) => {
  const [code, setCode] = useState<string[]>(Array(CODE_LENGTH).fill(""));
  const [status, setStatus] = useState<VerificationStatus>("idle");
  const [message, setMessage] = useState<string>("");
  const [timeLeft, setTimeLeft] = useState(60); // 60 seconds cooldown before resend
  const [isButtonHovered, setIsButtonHovered] = useState(false);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setCode(Array(CODE_LENGTH).fill(""));
      setStatus("idle");
      setMessage("");
      setTimeLeft(60); // 60 seconds cooldown before resend
      setIsButtonHovered(false);
    }
  }, [isOpen]);

  // Countdown timer
  useEffect(() => {
    if (!isOpen || timeLeft <= 0 || status === "sending") return;

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
          setMessage("Email verified successfully!");
          setTimeout(() => {
            onVerificationSuccess?.();
          }, 1500);
        } else {
          throw new Error("Invalid verification code");
        }
      } else {
        // Default behavior: simulate verification
        await new Promise((resolve) => setTimeout(resolve, 1000));
        setStatus("success");
        setMessage("Email verified successfully!");
        setTimeout(() => {
          onVerificationSuccess?.();
        }, 1500);
      }
    } catch (error: any) {
      setStatus("error");
      setMessage(error.message || "Invalid code. Please try again.");
      setCode(Array(CODE_LENGTH).fill(""));
      setIsButtonHovered(false);
    }
  };

  const handleResend = async () => {
    if (timeLeft > 0 || status === "sending") return;

    setStatus("sending");
    setMessage("Sending new code...");

    try {
      if (onResendCode) {
        const success = await onResendCode();
        if (success) {
          setTimeLeft(60); // 60 seconds cooldown before resend
          setStatus("idle");
          setMessage(`A new code has been sent to ${email}`);
        } else {
          throw new Error("Failed to send code");
        }
      } else {
        // Default behavior: simulate sending
        await new Promise((resolve) => setTimeout(resolve, 1000));
        setTimeLeft(60); // 60 seconds cooldown before resend
        setStatus("idle");
        setMessage(`A new code has been sent to ${email}`);
      }
    } catch (error: any) {
      setStatus("error");
      setMessage(error.message || "Failed to send code. Please try again.");
      setIsButtonHovered(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  const isCodeComplete = code.join("").length === CODE_LENGTH;
  const isVerifyDisabled =
    !isCodeComplete ||
    status === "verifying" ||
    status === "sending" ||
    status === "success";
  const isResendDisabled = timeLeft > 0 || status === "sending";

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-y-auto w-full h-full">
      {/* Backdrop - no click to close to preserve verification state */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Modal Content */}
      <div
        className="relative w-full flex flex-col items-center bg-[#005430] rounded-modal p-6 md:p-8 gap-6 z-[101]"
        style={{ maxWidth: "min(90vw, 550px)", maxHeight: "95vh" }}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-white/70 hover:text-white transition-colors z-10"
        >
          <X className="w-5 h-5" strokeWidth={2} />
        </button>

        {/* Success Toast - Above Title */}
        {status === "success" && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-full animate-in fade-in slide-in-from-top-2 bg-white/10 text-white">
            <CheckCircle className="w-5 h-5 text-white" />
            <p className="font-medium text-white font-sans text-sm">
              Email verified successfully!
            </p>
          </div>
        )}

        {/* Title */}
        <h1 className="text-white text-center leading-tight font-bold font-sans text-2xl md:text-3xl">
          Email Verification
        </h1>

        {/* Form Content */}
        <div className="flex flex-col w-full rounded-xl p-5 gap-4">
          {/* Verification Form - Always visible */}
          <div className="flex flex-col gap-4">
            {/* Description */}
            <p className="text-center text-white font-sans text-sm">
              We've sent a 6-digit verification code to your email address.
              Please enter the code below to continue.
            </p>

            {/* Email Display with Edit Link */}
            <div className="flex flex-col items-center gap-1">
              <p className="text-center text-white font-medium font-sans text-sm">
                {email}
              </p>
              {onEditEmail && status !== "success" && (
                <button
                  onClick={onEditEmail}
                  className="text-xs transition-colors font-sans"
                >
                  <span className="text-white/60">Wrong Email?</span>{" "}
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

            {/* Resend */}
            <div className="text-center">
              <span
                className="text-white text-sm"
                style={{ fontFamily: "'Inter', sans-serif" }}
              >
                Didn't receive the code?{" "}
              </span>
              <button
                type="button"
                onClick={handleResend}
                disabled={isResendDisabled}
                className={`text-sm font-semibold transition-colors ${
                  isResendDisabled
                    ? "text-white/40 cursor-not-allowed"
                    : "text-white underline hover:text-white/80"
                }`}
                style={{ fontFamily: "'Inter', sans-serif" }}
              >
                Resend
              </button>
            </div>

            {/* Verify Button - Inside Container */}
            <div className="flex justify-center pt-2">
              <div
                className={`rounded-full transition-all duration-300 p-0.5 ${
                  isButtonHovered && isCodeComplete
                    ? "border border-white shadow-glow"
                    : "border border-brand-emerald500"
                }`}
                onMouseEnter={() => setIsButtonHovered(true)}
                onMouseLeave={() => setIsButtonHovered(false)}
              >
                <button
                  type="button"
                  onClick={() => handleVerify()}
                  disabled={isVerifyDisabled}
                  className={`px-5 py-1.5 rounded-full flex items-center gap-2 font-medium transition-all duration-300 disabled:opacity-60 text-sm font-sans ${
                    isButtonHovered && isCodeComplete
                      ? "bg-white text-brand-emerald500"
                      : "bg-gradient-primary text-white"
                  }`}
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
    </div>
  );
};

export default EmailVerificationModal;
