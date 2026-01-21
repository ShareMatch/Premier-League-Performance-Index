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
            className="w-full relative overflow-hidden transition-all duration-300 group h-14 bg-gradient-to-r from-[#0B1221] via-[#003820] to-[#0B1221] border-b border-[#004225]"
        >
            {/* Background Effects */}
            <div className="absolute inset-0 opacity-20 bg-black/20" />

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
                        <span className="font-bold text-base md:text-lg tracking-wide uppercase text-gray-200 group-hover:text-white">
                            AI Analytics Engine
                        </span>
                        <Sparkles className="w-5 h-5 text-[#00A651] animate-pulse" />

                    </div>

                </div>
            </div>

            {/* Hove Overlay */}

        </button>
    );
};

export default AIAnalyticsBanner;
