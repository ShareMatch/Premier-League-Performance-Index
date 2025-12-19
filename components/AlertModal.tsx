import React from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, X } from "lucide-react";

interface AlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message: string;
  confirmLabel?: string;
}

const AlertModal: React.FC<AlertModalProps> = ({
  isOpen,
  onClose,
  title = "Alert",
  message,
  confirmLabel = "OK",
}) => {
  if (!isOpen) return null;

  const modal = (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-3"
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
    >
      <div
        className="max-w-[90vw] sm:max-w-sm w-full overflow-hidden animate-in zoom-in-95 duration-150 rounded-lg"
        style={{
          background: "rgba(4, 34, 34, 0.92)",
          backdropFilter: "blur(40px)",
          WebkitBackdropFilter: "blur(40px)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="px-4 py-3 flex items-center justify-between border-b border-white/10 bg-[#021A1A]"
        >
          <div className="flex items-center gap-2 text-white">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <h3 className="font-bold text-sm">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-4 py-4 text-gray-200 text-sm whitespace-pre-line">
          {message}
        </div>
        <div className="px-4 py-3 border-t border-white/10 flex justify-end bg-[#021A1A]">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded bg-[#005430] text-white font-semibold text-sm hover:bg-[#005430]/90"
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
