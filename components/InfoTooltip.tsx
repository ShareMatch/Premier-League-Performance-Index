import React, { useState, useRef, useEffect, useCallback, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';

interface InfoTooltipProps {
    text: string;
    iconClassName?: string;
}

const InfoTooltip: React.FC<InfoTooltipProps> = ({ text, iconClassName = '' }) => {
    const [isVisible, setIsVisible] = useState(false);
    const [coords, setCoords] = useState({ x: 0, y: 0, arrowOffset: 0 });
    const triggerRef = useRef<HTMLButtonElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const tooltipRef = useRef<HTMLDivElement>(null);

    const updatePosition = useCallback(() => {
        if (!triggerRef.current || !isVisible) return;

        const triggerRect = triggerRef.current.getBoundingClientRect();
        let x = triggerRect.left + triggerRect.width / 2;
        let y = triggerRect.top - 10;
        let arrowOffset = 0;

        if (tooltipRef.current) {
            const tooltipRect = tooltipRef.current.getBoundingClientRect();
            const viewportWidth = window.innerWidth;
            const margin = 12;

            const halfWidth = tooltipRect.width / 2;
            const idealLeft = x - halfWidth;
            const idealRight = x + halfWidth;

            if (idealLeft < margin) {
                const shift = margin - idealLeft;
                x += shift;
                arrowOffset = -shift;
            } else if (idealRight > viewportWidth - margin) {
                const shift = idealRight - (viewportWidth - margin);
                x -= shift;
                arrowOffset = shift;
            }
        }

        setCoords({ x, y, arrowOffset });
    }, [isVisible]);

    useLayoutEffect(() => {
        if (isVisible) updatePosition();
    }, [isVisible, updatePosition]);

    useEffect(() => {
        if (isVisible) {
            window.addEventListener('resize', updatePosition);
            window.addEventListener('scroll', updatePosition, true);
        }
        return () => {
            window.removeEventListener('resize', updatePosition);
            window.removeEventListener('scroll', updatePosition, true);
        };
    }, [isVisible, updatePosition]);

    const handleMouseEnter = () => {
        if (window.matchMedia('(hover: hover)').matches) setIsVisible(true);
    };

    const handleMouseLeave = () => {
        if (window.matchMedia('(hover: hover)').matches) setIsVisible(false);
    };

    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsVisible(!isVisible);
    };

    useEffect(() => {
        if (!isVisible) return;
        const handleClickOutside = (event: Event) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsVisible(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('touchstart', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('touchstart', handleClickOutside);
        };
    }, [isVisible]);

    const tooltipContent = isVisible && createPortal(
        <div
            ref={tooltipRef}
            className="fixed z-[9999] px-3 py-2 text-white bg-[#0B1221] backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl animate-in fade-in zoom-in-95 origin-bottom pointer-events-none w-max max-w-[clamp(200px,80vw,320px)] -translate-x-1/2 -translate-y-full"
            style={{
                left: `${coords.x}px`,
                top: `${coords.y}px`,
            }}
        >
            <div className="relative text-center leading-relaxed font-semibold text-[clamp(0.75rem,2vw,0.85rem)] whitespace-normal break-words">
                {text}
            </div>
            {/* Arrow with dynamic alignment shift */}
            <div
                className="absolute bottom-[-5px] left-1/2 w-2.5 h-2.5 bg-[#0B1221] border-r border-b border-white/10 rotate-45"
                style={{
                    transform: `translateX(calc(-50% + ${coords.arrowOffset}px)) rotate(45deg)`
                }}
            />
        </div>,
        document.body
    );

    return (
        <div
            ref={containerRef}
            className="relative inline-block"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            <button
                ref={triggerRef}
                onClick={handleClick}
                className={`${iconClassName} w-[clamp(1.15rem,3vw,1.35rem)] h-[clamp(1.15rem,3vw,1.35rem)] rounded-full bg-[#005430] hover:bg-[#17B76E] flex items-center justify-center transition-all shadow-lg border border-emerald-500/30 active:scale-90 relative z-20`}
                aria-label="More information"
            >
                <span className="text-white font-serif italic text-[clamp(0.7rem,2vw,0.8rem)] font-bold antialiased pr-[0.5px]">i</span>
            </button>

            {tooltipContent}
        </div>
    );
};

export default InfoTooltip;
