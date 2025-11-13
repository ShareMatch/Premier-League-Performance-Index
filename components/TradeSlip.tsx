
import React, { useState, useEffect } from 'react';
import type { Order } from '../types';

interface TradeSlipProps {
  order: Order;
  onClose: () => void;
}

const SoccerBallIcon: React.FC<{className?: string}> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25ZM8.625 7.5a.375.375 0 0 0-  .375.375v1.5c0 .207.168.375.375.375h1.5a.375.375 0 0 0 .375-.375v-1.5a.375.375 0 0 0-.375-.375h-1.5Zm4.875 0a.375.375 0 0 0-.375.375v1.5c0 .207.168.375.375.375h1.5a.375.375 0 0 0 .375-.375v-1.5a.375.375 0 0 0-.375-.375h-1.5ZM8.25 12a.375.375 0 0 1 .375-.375h1.5a.375.375 0 0 1 .375.375v1.5a.375.375 0 0 1-.375.375h-1.5a.375.375 0 0 1-.375-.375v-1.5Zm3.375 3.375a.375.375 0 0 0-.375.375v1.5c0 .207.168.375.375.375h1.5a.375.375 0 0 0 .375-.375v-1.5a.375.375 0 0 0-.375-.375h-1.5Zm2.625-3.375a.375.375 0 0 1 .375-.375h1.5a.375.375 0 0 1 .375.375v1.5a.375.375 0 0 1-.375.375h-1.5a.375.375 0 0 1-.375-.375v-1.5Z" clipRule="evenodd" />
  </svg>
);

// FIX: Update TimerIcon props to accept `style` to allow for inline styling.
const TimerIcon: React.FC<{className?: string, style?: React.CSSProperties}> = ({ className, style }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className} style={style}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
);

const TradeSlip: React.FC<TradeSlipProps> = ({ order, onClose }) => {
  const [shares, setShares] = useState<number | ''>('');
  const [countdown, setCountdown] = useState<number | null>(null);

  const orderCost = shares !== '' ? (shares * (order.price / 100)).toFixed(2) : '0.00';
  const isBuy = order.type === 'buy';

  useEffect(() => {
    if (countdown === null) return;
    if (countdown === 0) {
      setCountdown(null);
      // Here you would typically submit the order
      onClose(); // Close slip after countdown
      return;
    }
    const timer = setTimeout(() => {
      setCountdown(countdown - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [countdown, onClose]);
  
  const handleShareChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '' || (/^\d+$/.test(value) && parseInt(value) >= 0)) {
      setShares(value === '' ? '' : parseInt(value));
    }
  };

  const addShares = (amount: number) => {
    setShares((current) => (current || 0) + amount);
  };

  const handleConfirm = () => {
    if (shares && shares > 0) {
      setCountdown(5);
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg p-5 flex flex-col gap-4 text-gray-300 shadow-lg shadow-gray-950/50 border border-gray-700 h-full">
      <div className="flex justify-between items-center">
        <h2 className="font-bold text-lg text-gray-200">Transaction Slip</h2>
      </div>
      
      <div className="bg-gray-700/50 rounded-md p-3 flex flex-col gap-3">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-2 text-sm">
            <span className="bg-[#3AA189] text-white text-xs font-bold px-2 py-0.5 rounded">LIVE</span>
            <SoccerBallIcon className="w-4 h-4 text-gray-400" />
            <span className="font-semibold text-gray-300">Premier League Performance Index</span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white" aria-label="Close trade slip">&times;</button>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gray-600 rounded-full p-2">
              <SoccerBallIcon className="w-6 h-6 text-gray-300" />
            </div>
            <div>
              <p className="text-xs text-gray-400">Asset - <span className={isBuy ? 'text-[#3AA189]' : 'text-red-400'}>{isBuy ? 'Buy' : 'Sell'}</span></p>
              <p className="font-bold text-gray-200 truncate">{order.team.name}</p>
            </div>
          </div>
          <p className={`text-2xl font-bold ${isBuy ? 'text-[#3AA189]' : 'text-red-400'}`}>{order.price.toFixed(1)}%</p>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex justify-between items-baseline">
            <label htmlFor="shares" className="text-sm font-medium text-gray-400">Number of Units</label>
            <p className="text-xs text-gray-500">Total Value: £{orderCost}</p>
        </div>
        <input 
          id="shares"
          type="number"
          value={shares}
          onChange={handleShareChange}
          placeholder="Enter Number"
          className="w-full bg-gray-700 border border-gray-600 rounded-md p-3 text-white placeholder-gray-500 focus:ring-2 focus:ring-[#3AA189] focus:outline-none"
          min="0"
        />
      </div>

      <div className="grid grid-cols-3 gap-2">
        <button onClick={() => addShares(10)} className="bg-gray-700 hover:bg-gray-600 rounded-md p-2 text-sm transition-colors">+ 10</button>
        <button onClick={() => addShares(50)} className="bg-gray-700 hover:bg-gray-600 rounded-md p-2 text-sm transition-colors">+ 50</button>
        <button onClick={() => addShares(100)} className="bg-gray-700 hover:bg-gray-600 rounded-md p-2 text-sm transition-colors">+ 100</button>
      </div>

      <div className="mt-auto">
        <button
          onClick={handleConfirm}
          disabled={!shares || shares <= 0 || countdown !== null}
          className={`w-full font-bold py-3 rounded-full text-lg transition-colors duration-200 flex items-center justify-center gap-2 ${
            !shares || shares <= 0 
              ? 'bg-gray-700 text-gray-500 cursor-not-allowed' 
              : countdown !== null
              ? 'bg-[#1C7D83] text-gray-300 cursor-wait'
              : 'bg-[#3AA189] hover:bg-[#47b89e] text-white'
          }`}
        >
          {countdown !== null ? (
            <>
              <TimerIcon className="w-6 h-6 animate-spin" style={{animationDuration: '5s'}} />
              <span>Confirming... ({countdown}s)</span>
            </>
          ) : (
            'Confirm Transaction'
          )}
        </button>
      </div>
    </div>
  );
};

export default TradeSlip;
