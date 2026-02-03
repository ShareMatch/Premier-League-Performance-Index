import React, { useState, useEffect } from "react";
import type { Order } from "../types";
import TermsConditionsModal from "./TermsConditionsModal";
import AlertModal from "./AlertModal";
import { TRADING_CONFIG } from "../lib/config";
import { formatCurrency, formatNumberWithCommas } from "../utils/currencyUtils";
import OrderConfirmationModal from "./OrderConfirmationModal";

interface TradeSlipProps {
  order: Order;
  onClose: () => void;
  // now pass side so parent uses the UI-selected side when confirming
  onConfirm: (quantity: number, side: "buy" | "sell") => Promise<void>;
  leagueName: string;
  walletBalance?: number;
}

const SoccerBallIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
  >
    <path
      fillRule="evenodd"
      d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25ZM8.625 7.5a.375.375 0 0 0-.375.375v1.5c0 .207.168.375.375.375h1.5a.375.375 0 0 0 .375-.375v-1.5a.375.375 0 0 0-.375-.375h-1.5Zm4.875 0a.375.375 0 0 0-.375.375v1.5c0 .207.168.375.375.375h1.5a.375.375 0 0 0 .375-.375v-1.5a.375.375 0 0 0-.375-.375h-1.5ZM8.25 12a.375.375 0 0 1 .375-.375h1.5a.375.375 0 0 1 .375.375v1.5a.375.375 0 0 1-.375.375h-1.5a.375.375 0 0 1-.375-.375v-1.5Zm3.375 3.375a.375.375 0 0 0-.375.375v1.5c0 .207.168.375.375.375h1.5a.375.375 0 0 0 .375-.375v-1.5a.375.375 0 0 0-.375-.375h-1.5Zm2.625-3.375a.375.375 0 0 1 .375-.375h1.5a.375.375 0 0 1 .375.375v1.5a.375.375 0 0 1-.375.375h-1.5a.375.375 0 0 1-.375-.375v-1.5Z"
      clipRule="evenodd"
    />
  </svg>
);

const TradeSlip: React.FC<TradeSlipProps> = ({
  order,
  onClose,
  onConfirm,
  leagueName,
  walletBalance = 0,
}) => {
  const [shares, setShares] = useState<number | "">("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [modalType, setModalType] = useState<"terms" | "risk" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");

  // Local side state (buy / sell) so user can toggle within the slip
  const [side, setSide] = useState<"buy" | "sell">(
    order.type === "buy" ? "buy" : "sell",
  );

  // Sync side state when order changes (e.g., user clicks Buy/Sell on a different asset)
  useEffect(() => {
    setSide(order.type === "buy" ? "buy" : "sell");
    // Reset form state when order changes
    setShares("");
    setError(null);
    setTermsAccepted(false);
  }, [order.type, order.team.id]);

  const isBuy = side === "buy";
  const holding = Number(order.holding ?? 0);
  const canSell = holding > 0;

  // Fee percentage from config - ONLY applies to SELL orders
  const FEE_RATE = TRADING_CONFIG.FEE_RATE;

  // Calculate price dynamically based on side
  const currentPrice = isBuy ? order.team.offer : order.team.bid;

  // Calculate costs
  const subtotal = shares !== "" ? shares * currentPrice : 0;
  // Fee only on sell - deducted from what user receives
  const fee = isBuy ? 0 : subtotal * FEE_RATE;
  // For buy: pay exact subtotal. For sell: receive subtotal minus fee
  const totalAmount = isBuy ? subtotal : subtotal - fee;
  const sharesNum = typeof shares === "number" ? shares : 0;

  // No longer using internal toFixed for display
  const orderCost = formatNumberWithCommas(subtotal);
  const feeAmount = formatNumberWithCommas(fee);
  const totalDisplay = formatNumberWithCommas(totalAmount);

  // Calculate returns (based on subtotal, not including fees)
  const maxReturn =
    shares !== "" ? formatNumberWithCommas(shares * 100) : "0.00";
  const minReturn =
    shares !== "" ? formatNumberWithCommas(shares * 0.1) : "0.00";

  const handleSubmit = async () => {
    if (shares === "" || shares <= 0) return;

    setIsSubmitting(true);
    setError(null);

    try {
      // We let the PARENT handle the real trade + set confirmation data
      await onConfirm(shares as number, side);

      // If we reach here → trade was successful
      // Parent already set confirmationData
      // → we just close the slip
      onClose();
    } catch (err: any) {
      console.error("Trade failed:", err);
      setError(err.message || "Trade failed. Please try again.");
      setAlertMessage(err.message || "Trade failed. Please try again.");
      setAlertOpen(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleShareChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === "" || (/^\d+$/.test(value) && parseInt(value) >= 0)) {
      const numValue = value === "" ? "" : parseInt(value);
      setShares(numValue);
      if (!isBuy && typeof numValue === "number" && numValue > holding) {
        setError(`You don't own that many tokens. Max: ${holding}`);
      } else {
        setError(null);
      }
    }
  };

  const addShares = (amount: number) => {
    setShares((current) => {
      const newVal = (current || 0) + amount;
      if (!isBuy && newVal > holding) {
        setError(`You don't own that many tokens. Max: ${holding}`);
      } else {
        setError(null);
      }
      return newVal;
    });
  };
  const handleSideToggle = (newSide: "buy" | "sell") => {
    if (newSide === side) return;
    setSide(newSide);
    // Reset shares and errors when switching side to avoid invalid input states
    setShares("");
    setError(null);
  };

  const handleConfirm = () => {
    if (shares && shares > 0) {
      // Sell-side validation: check if selling more than holding
      if (!isBuy && typeof shares === "number" && shares > holding) {
        setError(`You don't own that many tokens. Max: ${holding}`);
        return;
      }

      // Buy-side validation: check for sufficient funds
      if (isBuy && subtotal > walletBalance) {
        setError(
          `Insufficient funds. You need ${formatCurrency(subtotal)} but only have ${formatCurrency(walletBalance)}`,
        );
        return;
      }

      // All checks passed - submit immediately
      setError(null);
      handleSubmit();
    }
  };

  return (
    <div
      data-testid="trade-slip"
      className="bg-gray-800 rounded-lg p-4 flex flex-col gap-3 text-gray-300 shadow-lg shadow-gray-950/50 border border-gray-700"
    >
      <div className="flex justify-between items-center">
        <h2 className="font-bold text-[clamp(1rem,3vw,1.125rem)] text-gray-200">Transaction Slip</h2>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white flex-shrink-0 text-2xl font-light py-1"
          aria-label="Close trade slip"
        >
          &times;
        </button>
      </div>

      {/* Buy / Sell toggle - styled like RightPanel tabs */}
      <div className="flex w-full rounded-md overflow-hidden">
        <button
          type="button"
          onClick={() => handleSideToggle("buy")}
          className={`flex-1 py-2 text-sm font-medium flex items-center justify-center transition-colors ${isBuy
            ? "text-white bg-gray-800/20 border-b-2 border-[#005430]"
            : "text-gray-400 hover:text-gray-200 hover:bg-gray-800/10"
            }`}
          data-testid="trade-slip-buy-tab"
        >
          Buy
        </button>
        <button
          type="button"
          onClick={() => handleSideToggle("sell")}
          disabled={!canSell}
          className={`flex-1 py-2 text-sm font-medium flex items-center justify-center transition-colors ${!isBuy
            ? "text-white bg-gray-800/20 border-b-2 border-red-600"
            : canSell
              ? "text-gray-400 hover:text-gray-200 hover:bg-gray-800/10"
              : "text-gray-600 cursor-not-allowed"
            } ${!canSell ? "cursor-not-allowed !text-gray-600" : ""}`}
          data-testid="trade-slip-sell-tab"
        >
          Sell
        </button>
      </div>

      <div className="bg-gray-700/50 rounded-md p-3 flex flex-col gap-3">
        <div className="flex justify-between items-start gap-1">
          <div className="flex items-center gap-1 min-w-0 flex-1">
            <span className="bg-[#005430] text-white text-[8px] font-bold px-1 py-0.5 rounded flex-shrink-0">
              LIVE
            </span>
            <SoccerBallIcon className="w-3 h-3 text-gray-400 flex-shrink-0 hidden sm:block" />
            <span className="font-semibold text-gray-300 truncate text-[10px]">
              {leagueName} Performance Index
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between gap-1.5">
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center overflow-hidden">
              {order.team.logo_url ? (
                <img
                  src={order.team.logo_url}
                  alt={order.team.name}
                  className="w-full h-full object-contain"
                />
              ) : (
                <SoccerBallIcon className="w-4 h-4 text-gray-300" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[9px] text-gray-400">
                Asset -{" "}
                <span className={isBuy ? "text-green-400" : "text-red-400"}>
                  {isBuy ? "Buy" : "Sell"}
                </span>
              </p>
              <p className="font-bold text-gray-200 truncate text-xs">
                {order.team.name}
              </p>
            </div>
          </div>
          <p
            className={`text-base font-bold flex-shrink-0 whitespace-nowrap ${isBuy
              ? "bg-[#005430] text-white px-1.5 py-0.5 rounded"
              : "text-red-400"
              }`}
          >
            {formatCurrency(currentPrice)}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex justify-between items-baseline">
          <label htmlFor="shares" className="text-sm font-medium text-gray-400">
            Number of Units
          </label>
          <div className="text-right">
            <p className="text-xs text-gray-500">
              Subtotal: {formatCurrency(subtotal)}
            </p>
            {!isBuy && holding > 0 && (
              <p className="text-xs text-gray-400">
                Avaliable Units: {holding}
              </p>
            )}
          </div>
        </div>
        <input
          id="shares"
          type="number"
          value={shares}
          onChange={handleShareChange}
          placeholder="Enter Number"
          className="w-full bg-gray-700 border border-gray-600 rounded-md p-3 text-white placeholder-gray-500 focus:ring-2 focus:ring-[#005430] focus:outline-none"
          min="0"
          data-testid="trade-slip-quantity-input"
        />
      </div>

      {isBuy && shares !== "" && (
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-gray-700/30 p-2 rounded border border-gray-700">
            <p className="text-gray-400">Max Return</p>
            <p className="text-emerald-400 font-bold">${maxReturn}</p>
          </div>
          <div className="bg-gray-700/30 p-2 rounded border border-gray-700">
            <p className="text-gray-400">Min Return</p>
            <p className="text-red-400 font-bold">${minReturn}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={() => addShares(10)}
          className="bg-gray-700 hover:bg-gray-600 rounded-md p-2 text-sm transition-colors"
          data-testid="trade-slip-add-10"
        >
          + 10
        </button>
        <button
          onClick={() => addShares(50)}
          className="bg-gray-700 hover:bg-gray-600 rounded-md p-2 text-sm transition-colors"
          data-testid="trade-slip-add-50"
        >
          + 50
        </button>
        <button
          onClick={() => addShares(100)}
          className="bg-gray-700 hover:bg-gray-600 rounded-md p-2 text-sm transition-colors"
          data-testid="trade-slip-add-100"
        >
          + 100
        </button>
      </div>

      {/* Terms & Conditions Checkbox */}
      <label className="flex items-center gap-2.5 cursor-pointer mt-2">
        <div className="relative flex-shrink-0">
          <input
            type="checkbox"
            checked={termsAccepted}
            onChange={(e) => setTermsAccepted(e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-5 h-5 border-2 border-gray-500 rounded bg-transparent peer-checked:bg-[#005430] peer-checked:border-[#005430] transition-colors flex items-center justify-center">
            {termsAccepted && (
              <svg
                className="w-3 h-3 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={3}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            )}
          </div>
        </div>
        <span className="text-xs text-gray-400 leading-tight">
          I accept the{" "}
          <button
            type="button"
            className="text-emerald-400 hover:text-emerald-300 font-medium transition-colors cursor-pointer"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setModalType("terms");
            }}
          >
            Terms & Conditions
          </button>{" "}
          and{" "}
          <button
            type="button"
            className="text-emerald-400 hover:text-emerald-300 font-medium transition-colors cursor-pointer"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setModalType("risk");
            }}
          >
            Risk & Performance Statement
          </button>
        </span>
      </label>

      {/* Fee Breakdown - Only show fee for sell orders */}
      {shares !== "" && shares > 0 && (
        <div className="text-xs text-gray-400 space-y-1 border-t border-gray-700 pt-2">
          {isBuy ? (
            // Buy: No fee, just show total
            <div className="flex justify-between font-medium text-gray-200">
              <span>Total Cost:</span>
              <span>${orderCost}</span>
            </div>
          ) : (
            // Sell: Show breakdown with fee deducted
            <>
              <div className="flex justify-between">
                <span>Sale Amount:</span>
                <span>${orderCost}</span>
              </div>
              <div className="flex justify-between">
                <span>Processing Fee (5%):</span>
                <span>-${feeAmount}</span>
              </div>
              <div className="flex justify-between font-medium text-gray-200">
                <span>You Receive:</span>
                <span>${totalDisplay}</span>
              </div>
            </>
          )}
        </div>
      )}

      {/* Fee Notice */}
      {/* <p className="text-xs text-gray-500">
        ShareMatch charges a 5% processing fee on all transactions.
      </p> */}

      {/* Error Message */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-md p-2">
          <p className="text-xs text-red-400">{error}</p>
        </div>
      )}

      <div className="mt-2">
        <button
          onClick={handleConfirm}
          disabled={
            sharesNum <= 0 ||
            isSubmitting ||
            !termsAccepted ||
            (!isBuy && sharesNum > holding)
          }
          className={`w-full font-bold py-3 rounded-full text-lg transition-colors duration-200 flex items-center justify-center gap-2 ${sharesNum <= 0 ||
            isSubmitting ||
            !termsAccepted ||
            (!isBuy && sharesNum > holding)
            ? "bg-gray-700 text-gray-500 cursor-not-allowed"
            : "bg-[#005430] hover:bg-[#005430]/90 text-white"
            }`}
          data-testid="trade-slip-confirm-button"
        >
          {isSubmitting ? "Processing..." : "Confirm Transaction"}
        </button>
      </div>

      {/* Terms & Risk Modals */}
      <TermsConditionsModal
        isOpen={modalType !== null}
        onClose={() => setModalType(null)}
        type={modalType || "terms"}
      />
      <AlertModal
        isOpen={alertOpen}
        onClose={() => setAlertOpen(false)}
        title="Trade Error"
        message={alertMessage}
      />
    </div>
  );
};

export default TradeSlip;
