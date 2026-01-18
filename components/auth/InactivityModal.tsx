import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Clock, AlertTriangle } from "lucide-react";

interface InactivityModalProps {
  isOpen: boolean;
  countdownSeconds: number;
  onStayLoggedIn: () => void;
  onTimeout: () => void;
}

const InactivityModal: React.FC<InactivityModalProps> = ({
  isOpen,
  countdownSeconds,
  onStayLoggedIn,
  onTimeout,
}) => {
  const [timeLeft, setTimeLeft] = useState(countdownSeconds);
  const [isButtonHovered, setIsButtonHovered] = useState(false);

  // Reset timer when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeLeft(countdownSeconds);
    }
  }, [isOpen, countdownSeconds]);

  // Countdown timer
  useEffect(() => {
    if (!isOpen) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onTimeout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, onTimeout]);

  if (!isOpen) return null;

  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Calculate progress for the ring
  const progress = (timeLeft / countdownSeconds) * 100;
  const circumference = 2 * Math.PI * 45; // radius = 45
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  const modalContent = (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop - darker to emphasize urgency */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Modal Content */}
      <div className="relative w-full max-w-md bg-modal-outer/80 backdrop-blur-[40px] rounded-modal p-6">
        {/* Inner Container */}
        <div
          className="flex flex-col items-center bg-modal-inner rounded-xl p-8 gap-6 border border-transparent"
          style={{
            backgroundImage:
              "linear-gradient(#021A1A, #021A1A), linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.6) 50%, rgba(255,255,255,0) 100%)",
            backgroundOrigin: "border-box",
            backgroundClip: "padding-box, border-box",
          }}
        >
          {/* Timer Circle */}
          <div className="relative w-28 h-28">
            <svg className="w-28 h-28 transform -rotate-90">
              {/* Background circle */}
              <circle
                cx="56"
                cy="56"
                r="45"
                stroke="currentColor"
                strokeWidth="6"
                fill="none"
                className="text-gray-700"
              />
              {/* Progress circle */}
              <circle
                cx="56"
                cy="56"
                r="45"
                stroke="currentColor"
                strokeWidth="6"
                fill="none"
                strokeLinecap="round"
                className={`transition-all duration-1000 ${
                  timeLeft <= 30 ? "text-red-500" : "text-brand-amber500"
                }`}
                style={{
                  strokeDasharray: circumference,
                  strokeDashoffset: strokeDashoffset,
                }}
              />
            </svg>
            {/* Timer text */}
            <div className="absolute inset-0 flex items-center justify-center">
              <span
                className={`text-2xl font-bold font-sans ${
                  timeLeft <= 30 ? "text-red-500" : "text-white"
                }`}
              >
                {formatTime(timeLeft)}
              </span>
            </div>
          </div>

          {/* Warning Icon & Text */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <AlertTriangle className="w-5 h-5 text-brand-amber500" />
              <h2 className="text-xl font-bold text-white font-sans">
                Are you still there?
              </h2>
            </div>
            <p className="text-gray-400 text-sm font-sans max-w-xs">
              You've been inactive for a while. For your security, you'll be
              automatically logged out if there's no response.
            </p>
          </div>

          {/* Stay Logged In Button */}
          <div
            className={`w-full max-w-xs rounded-full transition-all duration-300 p-0.5 ${
              isButtonHovered
                ? "border border-white shadow-glow"
                : "border border-brand-emerald500"
            }`}
            onMouseEnter={() => setIsButtonHovered(true)}
            onMouseLeave={() => setIsButtonHovered(false)}
          >
            <button
              onClick={onStayLoggedIn}
              className={`w-full py-3 rounded-full font-semibold font-sans text-sm transition-all duration-300 ${
                isButtonHovered
                  ? "bg-white text-brand-emerald500"
                  : "bg-gradient-primary text-white"
              }`}
              aria-label="Stay logged in"
              data-testid="inactivity-modal-stay-logged-in-button"
            >
              Yes, I'm still here
            </button>
          </div>

          {/* Logout link */}
          <button
            onClick={onTimeout}
            className="text-gray-500 text-xs font-sans hover:text-gray-400 transition-colors"
            aria-label="Log out now"
            data-testid="inactivity-modal-logout-button"
          >
            Log out now
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default InactivityModal;
