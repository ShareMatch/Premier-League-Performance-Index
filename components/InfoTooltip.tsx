import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';

interface InfoTooltipProps {
    text: string;
    children?: React.ReactNode;
    iconClassName?: string;
}

const InfoTooltip: React.FC<InfoTooltipProps> = ({ text, iconClassName = '' }) => {
    const [isVisible, setIsVisible] = useState(false);
    const [coords, setCoords] = useState({ x: 0, y: 0 });
    const triggerRef = useRef<HTMLButtonElement>(null);

    const handleMouseEnter = () => {
        if (triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            setCoords({
                x: rect.left + rect.width / 2,
                y: rect.top - 10
            });
        }
        setIsVisible(true);
    };

    const handleMouseLeave = () => {
        setIsVisible(false);
    };

    const tooltipContent = isVisible && (
        <div
            className="fixed z-[100] px-3 py-2 text-xs font-medium text-white bg-gray-900/95 backdrop-blur-md border border-white/10 rounded-lg shadow-2xl pointer-events-none transition-all duration-200 animate-in fade-in zoom-in-95"
            style={{
                left: `${coords.x}px`,
                top: `${coords.y}px`,
                transform: 'translate(-50%, -100%)',
                maxWidth: '240px'
            }}
        >
            {text}
            <div
                className="absolute bottom-[-4px] left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 border-r border-b border-white/10 rotate-45"
            />
        </div>
    );

    return (
        <>
            <button
                ref={triggerRef}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                className={`${iconClassName} w-6 h-6 rounded-full bg-[#005430] hover:bg-[#006035] flex items-center justify-center transition-all shadow-sm border border-emerald-800/20 group/tooltip`}
                aria-label="More information"
            >
                <span className="text-white font-serif italic text-sm font-bold antialiased pr-[1px]">i</span>
            </button>

            {isVisible && createPortal(tooltipContent, document.body)}
        </>
    );
};

export default InfoTooltip;
