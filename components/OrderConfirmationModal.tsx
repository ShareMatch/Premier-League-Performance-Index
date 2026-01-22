import React from "react";
import { CheckCircle, X } from "lucide-react";
import { formatCurrency, formatNumberWithCommas } from "../utils/currencyUtils";

interface OrderConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  assetName: string;
  side: "buy" | "sell";
  units: number;
  pricePerUnit: number;
  totalAmount: number;
}

const OrderConfirmationModal: React.FC<OrderConfirmationModalProps> = ({
  isOpen,
  onClose,
  orderId,
  assetName,
  side,
  units,
  pricePerUnit,
  totalAmount,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-[clamp(0.75rem,4vw,1rem)] w-full h-full">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative w-full max-w-[clamp(320px,90vw,520px)] flex flex-col items-center bg-[#005430] rounded-2xl p-[clamp(1rem,5vw,2rem)] gap-[clamp(1rem,4vw,1.5rem)] z-[101]"
        data-testid="order-confirmation-modal"
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-[clamp(0.75rem,3vw,1.25rem)] right-[clamp(0.75rem,3vw,1.25rem)] text-white/70 hover:text-white transition-colors"
          aria-label="Close"
        >
          <X className="w-[clamp(1rem,4vw,1.25rem)] h-[clamp(1rem,4vw,1.25rem)]" />
        </button>

        {/* Success Icon */}
        <div className="flex items-center justify-center">
          <CheckCircle className="w-[clamp(2.5rem,10vw,4rem)] h-[clamp(2.5rem,10vw,4rem)] text-white" />
        </div>

        {/* Title */}
        <h1 className="text-white text-center font-bold text-[clamp(1.25rem,5vw,1.875rem)]">
          Order Confirmed
        </h1>

        {/* Subtitle */}
        <p className="text-white/80 text-center text-[clamp(0.75rem,3vw,0.875rem)]">
          Your transaction has been successfully completed.
        </p>

        {/* Order Summary Card */}
        <div className="w-full bg-white/10 rounded-xl p-[clamp(0.75rem,4vw,1.25rem)] space-y-[clamp(0.5rem,2vw,0.75rem)]">
          <div className="flex justify-between text-[clamp(0.75rem,2.5vw,0.875rem)] text-white/80">
            <span>Order ID</span>
            <span className="font-mono text-white">{orderId}</span>
          </div>

          <div className="flex justify-between text-[clamp(0.75rem,2.5vw,0.875rem)] text-white/80">
            <span>Asset Token</span>
            <span className="font-semibold text-white">{assetName}</span>
          </div>

          <div className="flex justify-between text-[clamp(0.75rem,2.5vw,0.875rem)] text-white/80">
            <span>Type</span>
            <span
              className={`font-bold ${
                side === "buy" ? "text-emerald-400" : "text-red-400"
              }`}
            >
              {side === "buy" ? "Buy" : "Sell"}
            </span>
          </div>

          <div className="flex justify-between text-[clamp(0.75rem,2.5vw,0.875rem)] text-white/80">
            <span>Units</span>
            <span className="text-white">{formatNumberWithCommas(units)}</span>
          </div>

          <div className="flex justify-between text-[clamp(0.75rem,2.5vw,0.875rem)] text-white/80">
            <span>Price / Unit</span>
            <span className="text-white">{formatCurrency(pricePerUnit)}</span>
          </div>

          <div className="border-t border-white/20 pt-[clamp(0.5rem,2vw,0.75rem)] flex justify-between font-bold text-[clamp(0.75rem,2.5vw,0.875rem)] text-white">
            <span>{side === "buy" ? "Total Paid" : "Total Received"}</span>
            <span>{formatCurrency(totalAmount)}</span>
          </div>
        </div>

        {/* Action */}
        <button
          onClick={onClose}
          className="mt-[clamp(0.25rem,1vw,0.5rem)] px-[clamp(1.5rem,6vw,2rem)] py-[clamp(0.5rem,2vw,0.75rem)] rounded-full bg-white text-[#005430] font-bold hover:bg-white/90 transition-colors text-[clamp(0.875rem,3vw,1rem)]"
        >
          Done
        </button>
      </div>
    </div>
  );
};

export default OrderConfirmationModal;
