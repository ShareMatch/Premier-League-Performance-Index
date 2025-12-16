import React from 'react';
import { Sparkles } from 'lucide-react';

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
            <div className={`absolute inset-0 opacity-20 bg-black/20 ${isActive ? 'opacity-30' : ''}`} />

            {/* Content Container */}
            <div className="relative h-full flex items-center justify-center gap-3 md:gap-1 px-4">

                {/* ShareMatch Logo */}
                <img 
                    src="/logos/white_icon_on_black-removebg-preview.png" 
                    alt="ShareMatch" 
                    className="w-10 h-10 md:w-15 md:h-15 object-contain"
                />

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
                            <span className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold bg-[#00A651] text-white rounded shadow-sm animate-pulse">
                                
                                PREMIUM
                            </span>
                        )}
                        
                    </div>
                    <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        <Sparkles className="w-3 h-3" />
                        </div>
                </div>
            </div>

            {/* Hove Overlay */}
            
        </button>
    );
};

export default AIAnalyticsBanner;
