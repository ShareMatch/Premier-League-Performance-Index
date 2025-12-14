import React from 'react';
import { Sparkles, Brain } from 'lucide-react';

interface AIAnalyticsBannerProps {
    onClick: () => void;
    isActive: boolean;
}

const AIAnalyticsBanner: React.FC<AIAnalyticsBannerProps> = ({ onClick, isActive }) => {
    return (
        <button
            onClick={onClick}
            className={`
        w-full relative overflow-hidden transition-all duration-300 group
        ${isActive
                    ? 'h-16 bg-[#005430] border-b-2 border-[#00A651]'
                    : 'h-14 bg-gradient-to-r from-[#0B1221] via-[#003820] to-[#0B1221] border-b border-[#004225]'
                }
      `}
        >
            {/* Background Effects */}
            <div className={`absolute inset-0 opacity-20 bg-[url('/grid.svg')] ${isActive ? 'opacity-30' : ''}`} />

            {/* Content Container */}
            <div className="relative h-full flex items-center justify-center gap-3 md:gap-4 px-4">

                {/* Animated Icon */}
                <div className={`
          p-2 rounded-full transition-colors
          ${isActive ? 'bg-white/10 text-white' : 'bg-[#005430]/30 text-[#00A651] group-hover:text-white group-hover:bg-[#005430]'}
        `}>
                    <Brain className="w-5 h-5 md:w-6 md:h-6" />
                </div>

                {/* Text */}
                <div className="flex flex-col items-start translate-y-[1px]">
                    <div className="flex items-center gap-2">
                        <span className={`
              font-bold text-base md:text-lg tracking-wide uppercase
              ${isActive ? 'text-white' : 'text-gray-200 group-hover:text-white'}
            `}>
                            AI Analytics Engine
                        </span>
                        {!isActive && (
                            <span className="hidden md:inline-flex px-2 py-0.5 text-[10px] font-bold bg-[#00A651] text-white rounded shadow-sm animate-pulse">
                                PREMIUM
                            </span>
                        )}
                    </div>
                </div>

                {/* Right Arrow / Action Hint (only if not active) */}
                {!isActive && (
                    <Sparkles className="w-4 h-4 text-[#00A651] opacity-0 group-hover:opacity-100 transition-opacity absolute right-6 md:right-1/4" />
                )}
            </div>

            {/* Hove Overlay */}
            <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
        </button>
    );
};

export default AIAnalyticsBanner;
