import React from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, X, Info, CheckCircle, XCircle } from "lucide-react";

type AlertType = "warning" | "info" | "success" | "error";

interface AlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message: string;
  confirmLabel?: string;
  type?: AlertType;
}

const AlertModal: React.FC<AlertModalProps> = ({
  isOpen,
  onClose,
  title = "Action Not Permitted",
  message,
  confirmLabel = "OK",
  type = "warning",
}) => {
  if (!isOpen) return null;

  // Icon and color based on type
  const getIcon = () => {
    switch (type) {
      case "info":
        return <Info className="w-10 h-10 text-blue-400 relative z-20" />;
      case "success":
        return <CheckCircle className="w-10 h-10 text-emerald-400 relative z-20" />;
      case "error":
        return <XCircle className="w-10 h-10 text-red-400 relative z-20" />;
      case "warning":
      default:
        return <AlertTriangle className="w-10 h-10 text-white relative z-20" />;
    }
  };

  const getIconBgColor = () => {
    switch (type) {
      case "info":
        return "bg-blue-500/20";
      case "success":
        return "bg-emerald-500/20";
      case "error":
        return "bg-red-500/20";
      case "warning":
      default:
        return "bg-[#005430]/20";
    }
  };

  const getIconInnerBgColor = () => {
    switch (type) {
      case "info":
        return "bg-blue-500/40";
      case "success":
        return "bg-emerald-500/40";
      case "error":
        return "bg-red-500/40";
      case "warning":
      default:
        return "bg-[#005430]/40";
    }
  };

  const modal = (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
      data-testid="alert-modal-overlay"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal Content */}
      <div
        className="relative bg-[#005430] border border-[#005430] w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
        data-testid="alert-modal"
      >
        {/* Header Enhancement */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-white/20 via-white/40 to-white/20" />

        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors p-1 rounded-full hover:bg-white/10"
          aria-label="Close"
          data-testid="alert-modal-close-button"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-8 text-center space-y-6">
          {/* Icon Area */}
          <div className="relative mx-auto w-20 h-20 flex items-center justify-center">
            <div className={`absolute inset-0 ${getIconBgColor()} rounded-full animate-pulse z-0`} />
            <div className={`absolute inset-2 ${getIconInnerBgColor()} rounded-full z-10`} />
            {getIcon()}
          </div>

          <div className="space-y-3">
            <h2 className="text-2xl font-bold text-white tracking-tight">
              {title}
            </h2>
            <p className="text-gray-200 leading-relaxed text-sm whitespace-pre-line">
              {message}
            </p>
          </div>

          <button
            onClick={onClose}
            className="w-full py-3.5 px-6 bg-white text-gray-900 hover:bg-white/90 active:scale-[0.98] font-bold rounded-full transition-all shadow-lg transform hover:-translate-y-0.5"
            data-testid="alert-modal-ok-button"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
};

export default AlertModal;
