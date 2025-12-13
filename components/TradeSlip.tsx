import React, { useState, useEffect } from 'react';
import type { Order } from '../types';
import TermsConditionsModal from './TermsConditionsModal';

interface TradeSlipProps {
  order: Order;
  onClose: () => void;
  onConfirm: (quantity: number) => Promise<void>;
  leagueName: string;
}

const SoccerBallIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25ZM8.625 7.5a.375.375 0 0 0-  .375.375v1.5c0 .207.168.375.375.375h1.5a.375.375 0 0 0 .375-.375v-1.5a.375.375 0 0 0-.375-.375h-1.5Zm4.875 0a.375.375 0 0 0-.375.375v1.5c0 .207.168.375.375.375h1.5a.375.375 0 0 0 .375-.375v-1.5a.375.375 0 0 0-.375-.375h-1.5ZM8.25 12a.375.375 0 0 1 .375-.375h1.5a.375.375 0 0 1 .375.375v1.5a.375.375 0 0 1-.375.375h-1.5a.375.375 0 0 1-.375-.375v-1.5Zm3.375 3.375a.375.375 0 0 0-.375.375v1.5c0 .207.168.375.375.375h1.5a.375.375 0 0 0 .375-.375v-1.5a.375.375 0 0 0-.375-.375h-1.5Zm2.625-3.375a.375.375 0 0 1 .375-.375h1.5a.375.375 0 0 1 .375.375v1.5a.375.375 0 0 1-.375.375h-1.5a.375.375 0 0 1-.375-.375v-1.5Z" clipRule="evenodd" />
  </svg>
);

const TimerIcon: React.FC<{ className?: string, style?: React.CSSProperties }> = ({ className, style }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className} style={style}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
  </svg>
);

const TradeSlip: React.FC<TradeSlipProps> = ({ order, onClose, onConfirm, leagueName }) => {
  const [shares, setShares] = useState<number | ''>(order.holding || '');
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [modalType, setModalType] = useState<'terms' | 'risk' | null>(null);

  const orderCost = shares !== '' ? (shares * order.price).toFixed(2) : '0.00';
  const isBuy = order.type === 'buy';

  // Calculate returns
  const maxReturn = shares !== '' ? (shares * 100).toFixed(2) : '0.00';
  const minReturn = shares !== '' ? (shares * 0.1).toFixed(2) : '0.00';

  useEffect(() => {
    if (countdown === null) return;
    if (countdown === 0) {
      setCountdown(null);
      handleSubmit();
      return;
    }
    const timer = setTimeout(() => {
      setCountdown(countdown - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleSubmit = async () => {
    if (shares === '' || shares <= 0) return;
    setIsSubmitting(true);
    try {
      await onConfirm(shares);
      onClose();
    } catch (error) {
      console.error('Trade failed:', error);
      alert('Trade failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleShareChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '' || (/^\d+$/.test(value) && parseInt(value) >= 0)) {
      const numValue = value === '' ? '' : parseInt(value);
      // Limit sell amount to holding
      if (!isBuy && order.holding && typeof numValue === 'number' && numValue > order.holding) {
        return;
      }
      setShares(numValue);
    }
  };

  const addShares = (amount: number) => {
    setShares((current) => {
      const newVal = (current || 0) + amount;
      if (!isBuy && order.holding && newVal > order.holding) return order.holding;
      return newVal;
    });
  };

  const handleConfirm = () => {
    if (shares && shares > 0) {
      setCountdown(5);
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4 flex flex-col gap-3 text-gray-300 shadow-lg shadow-gray-950/50 border border-gray-700">
      <div className="flex justify-between items-center">
        <h2 className="font-bold text-lg text-gray-200">Transaction Slip</h2>
      </div>

      <div className="bg-gray-700/50 rounded-md p-3 flex flex-col gap-3">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-2 text-sm">
            <span className="bg-[#005430] text-white text-xs font-bold px-2 py-0.5 rounded">LIVE</span>
            <SoccerBallIcon className="w-4 h-4 text-gray-400" />
            <span className="font-semibold text-gray-300">{leagueName} Performance Index</span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white" aria-label="Close trade slip">&times;</button>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gray-600 rounded-full p-2">
              <SoccerBallIcon className="w-6 h-6 text-gray-300" />
            </div>
            <div>
              <p className="text-xs text-gray-400">Asset - <span className={isBuy ? 'text-[#005430]' : 'text-red-400'}>{isBuy ? 'Buy' : 'Sell'}</span></p>
              <p className="font-bold text-gray-200 truncate">{order.team.name}</p>
            </div>
          </div>
          <p className={`text-2xl font-bold ${isBuy ? 'bg-[#005430] text-white px-2 py-1 rounded' : 'text-red-400'}`}>${order.price.toFixed(1)}</p>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex justify-between items-baseline">
          <label htmlFor="shares" className="text-sm font-medium text-gray-400">Number of Units</label>
          <div className="text-right">
            <p className="text-xs text-gray-500">Total Value: ${orderCost}</p>
            {!isBuy && order.holding && (
              <p className="text-xs text-gray-400">Max Sell: {order.holding}</p>
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
          max={!isBuy && order.holding ? order.holding : undefined}
        />
      </div>

      {isBuy && shares !== '' && (
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-gray-700/30 p-2 rounded border border-gray-700">
            <p className="text-gray-400">Max Return</p>
            <p className="text-[#005430] font-bold">${maxReturn}</p>
          </div>
          <div className="bg-gray-700/30 p-2 rounded border border-gray-700">
            <p className="text-gray-400">Min Return</p>
            <p className="text-red-400 font-bold">${minReturn}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-2">
        <button onClick={() => addShares(10)} className="bg-gray-700 hover:bg-gray-600 rounded-md p-2 text-sm transition-colors">+ 10</button>
        <button onClick={() => addShares(50)} className="bg-gray-700 hover:bg-gray-600 rounded-md p-2 text-sm transition-colors">+ 50</button>
        <button onClick={() => addShares(100)} className="bg-gray-700 hover:bg-gray-600 rounded-md p-2 text-sm transition-colors">+ 100</button>
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
              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
        </div>
        <span className="text-xs text-gray-400 leading-tight">
          I accept the{' '}
          <button
            type="button"
            className="text-[#005430] hover:underline"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setModalType('terms');
            }}
          >
            Terms & Conditions
          </button>{' '}
          and{' '}
          <button
            type="button"
            className="text-[#005430] hover:underline"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setModalType('risk');
            }}
          >
            Risk & Performance Statement
          </button>
        </span>
      </label>

      <div className="mt-2">
        <button
          onClick={handleConfirm}
          disabled={!shares || shares <= 0 || countdown !== null || isSubmitting || !termsAccepted}
          className={`w-full font-bold py-3 rounded-full text-lg transition-colors duration-200 flex items-center justify-center gap-2 ${!shares || shares <= 0 || isSubmitting || !termsAccepted
            ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
            : countdown !== null
              ? 'bg-[#1C7D83] text-gray-300 cursor-wait'
              : 'bg-[#005430] hover:bg-[#005430]/90 text-white'
            }`}
        >
          {countdown !== null ? (
            <>
              <TimerIcon className="w-6 h-6 animate-spin" style={{ animationDuration: '5s' }} />
              <span>Confirming... ({countdown}s)</span>
            </>
          ) : isSubmitting ? (
            'Processing...'
          ) : (
            'Confirm Transaction'
          )}
        </button>
      </div>

      {/* Terms & Risk Modals */}
      <TermsConditionsModal
        isOpen={modalType !== null}
        onClose={() => setModalType(null)}
        type={modalType || 'terms'}
      />
    </div>
  );
};

export default TradeSlip;