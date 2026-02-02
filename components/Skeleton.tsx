import React from "react";

interface SkeletonProps {
  className?: string;
  /** Width - can be Tailwind class or CSS value */
  width?: string;
  /** Height - can be Tailwind class or CSS value */
  height?: string;
  /** Makes the skeleton circular */
  circle?: boolean;
  /** Number of items to render */
  count?: number;
}

/**
 * Reusable skeleton loading component with shimmer animation
 */
export const Skeleton: React.FC<SkeletonProps> = ({
  className = "",
  width,
  height,
  circle = false,
  count = 1,
}) => {
  const baseClasses = `animate-pulse bg-gray-700/50 ${circle ? "rounded-full" : "rounded"}`;

  const style: React.CSSProperties = {};
  if (width && !width.startsWith("w-")) style.width = width;
  if (height && !height.startsWith("h-")) style.height = height;

  const widthClass = width?.startsWith("w-") ? width : "";
  const heightClass = height?.startsWith("h-") ? height : "";

  const elements = Array.from({ length: count }, (_, i) => (
    <div
      key={i}
      className={`${baseClasses} ${widthClass} ${heightClass} ${className}`}
      style={Object.keys(style).length > 0 ? style : undefined}
    />
  ));

  return count === 1 ? elements[0] : <>{elements}</>;
};

/**
 * Skeleton for OrderBook rows
 */
export const OrderBookRowSkeleton: React.FC<{ count?: number }> = ({ count = 5 }) => {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className="grid grid-cols-3 gap-[clamp(0.5rem,1.5vw,1rem)] items-center p-[clamp(0.5rem,1.25vw,0.75rem)] animate-pulse"
        >
          {/* Asset name with logo skeleton */}
          <div className="flex items-center gap-[clamp(0.375rem,1vw,0.5rem)] min-w-0">
            <div className="w-[clamp(1.75rem,5vw,2.25rem)] h-[clamp(1.75rem,5vw,2.25rem)] rounded-full bg-gray-700/50 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="h-[clamp(0.5rem,1.4vw,0.75rem)] bg-gray-700/50 rounded w-[clamp(3rem,60%,5rem)]" />
            </div>
          </div>

          {/* Sell price skeleton */}
          <div className="flex justify-center">
            <div className="h-[clamp(0.6rem,1.5vw,0.875rem)] bg-gray-700/50 rounded w-[clamp(2rem,50%,3rem)]" />
          </div>

          {/* Buy price skeleton */}
          <div className="flex justify-center">
            <div className="h-[clamp(0.6rem,1.5vw,0.875rem)] bg-gray-700/30 rounded w-[clamp(2rem,50%,3rem)]" />
          </div>
        </div>
      ))}
    </>
  );
};

/**
 * Skeleton for Header component
 */
export const HeaderSkeleton: React.FC = () => {
  return (
    <div className="flex items-center justify-between py-3 sm:py-4 gap-3 sm:gap-4 animate-pulse">
      {/* Left: Avatar & Title */}
      <div className="flex items-center gap-[clamp(0.5rem,2vw,1rem)] min-w-0">
        {/* Index Avatar skeleton */}
        <div className="w-[clamp(2.5rem,10vw,5rem)] h-[clamp(2.5rem,10vw,5rem)] rounded-lg sm:rounded-xl bg-gray-700/50 flex-shrink-0" />

        <div className="flex flex-col min-w-0 gap-2">
          {/* Title skeleton */}
          <div className="h-[clamp(1rem,4.5vw,1.875rem)] bg-gray-700/50 rounded w-[clamp(10rem,40vw,20rem)]" />
          {/* Subtitle skeleton */}
          <div className="h-[clamp(0.5rem,1.5vw,0.75rem)] bg-gray-700/30 rounded w-[clamp(6rem,25vw,10rem)]" />
        </div>
      </div>

      {/* Right: Market Status skeleton */}
      <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
        <div className="w-[clamp(4rem,15vw,6rem)] h-[clamp(1.25rem,3vw,2rem)] bg-gray-700/50 rounded-md" />
        <div className="w-6 h-6 bg-gray-700/30 rounded-full" />
      </div>
    </div>
  );
};

/**
 * Skeleton for Portfolio items
 */
export const PortfolioSkeleton: React.FC<{ count?: number }> = ({ count = 3 }) => {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className="bg-gray-800/50 p-3 rounded-xl border border-gray-700/50 flex items-center gap-3 animate-pulse"
        >
          {/* Avatar skeleton */}
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gray-700/50 border border-gray-600/30" />

          <div className="flex-1 flex justify-between items-center min-w-0 gap-2">
            <div className="min-w-0 flex-1 space-y-2">
              {/* Asset name skeleton */}
              <div className="h-[clamp(0.75rem,2.5vw,0.875rem)] bg-gray-700/50 rounded w-[clamp(4rem,50%,8rem)]" />
              {/* Units & market skeleton */}
              <div className="flex flex-col gap-1">
                <div className="h-[clamp(0.5rem,1.5vw,0.6rem)] bg-gray-700/30 rounded w-12" />
                <div className="h-[clamp(0.5rem,1.2vw,0.5rem)] bg-gray-700/30 rounded w-8" />
              </div>
            </div>

            <div className="text-right flex-shrink-0 space-y-2">
              {/* Value skeleton */}
              <div className="h-[clamp(0.75rem,2.5vw,0.875rem)] bg-gray-700/50 rounded w-16 ml-auto" />
              {/* Price & change skeleton */}
              <div className="flex flex-col items-end gap-1">
                <div className="h-[clamp(0.5rem,1.5vw,0.6rem)] bg-gray-700/30 rounded w-12" />
                <div className="h-[clamp(0.5rem,1.5vw,0.6rem)] bg-gray-700/30 rounded w-10" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

/**
 * Skeleton for Transaction History items
 */
export const TransactionHistorySkeleton: React.FC<{ count?: number }> = ({ count = 3 }) => {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/50 flex items-start gap-3 animate-pulse"
        >
          {/* Avatar skeleton */}
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gray-700/50 border border-gray-600/30 mt-0.5" />

          <div className="flex-1 space-y-2">
            {/* Header row skeleton */}
            <div className="flex justify-between items-start">
              <div className="h-3.5 bg-gray-700/50 rounded w-24" />
              <div className="h-5 bg-gray-700/30 rounded-full w-12" />
            </div>
            {/* Details row skeleton */}
            <div className="flex justify-between items-center">
              <div className="h-3 bg-gray-700/30 rounded w-20" />
              <div className="h-3 bg-gray-700/30 rounded w-16" />
            </div>
            {/* Total row skeleton */}
            <div className="flex justify-between items-center pt-2 border-t border-gray-700/50">
              <div className="h-3 bg-gray-700/30 rounded w-8" />
              <div className="h-3.5 bg-gray-700/50 rounded w-14" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

/**
 * Skeleton for Watchlist items
 */
export const WatchlistSkeleton: React.FC<{ count?: number }> = ({ count = 3 }) => {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className="bg-gray-800/30 rounded-lg p-3 border border-gray-700/30 flex items-center gap-3 animate-pulse"
        >
          {/* Avatar skeleton */}
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-700/50" />

          <div className="flex-1 min-w-0">
            <div className="h-3.5 bg-gray-700/50 rounded w-24 mb-1.5" />
            <div className="h-2.5 bg-gray-700/30 rounded w-12" />
          </div>

          <div className="flex-shrink-0 flex items-center gap-2">
            <div className="h-5 bg-gray-700/30 rounded w-12" />
            <div className="h-5 bg-gray-700/50 rounded w-12" />
          </div>
        </div>
      ))}
    </div>
  );
};

export default Skeleton;
