import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

interface InfoTooltipProps {
    text: string;
    children?: React.ReactNode;
    iconClassName?: string;
}

const InfoTooltip: React.FC<InfoTooltipProps> = ({ text, iconClassName = '' }) => {
    const [isVisible, setIsVisible] = useState(false);
    const [coords, setCoords] = useState({ x: 0, y: 0, arrowOffset: 0 });
    const triggerRef = useRef<HTMLButtonElement>(null);
    const tooltipRef = useRef<HTMLDivElement>(null);

    const updatePosition = useCallback(() => {
        if (!triggerRef.current || !isVisible) return;

        const triggerRect = triggerRef.current.getBoundingClientRect();
        // Initial estimate for centering
        let x = triggerRect.left + triggerRect.width / 2;
        let y = triggerRect.top - 10;
        let arrowOffset = 0;

        // If tooltip is already rendered, we can fine-tune
        if (tooltipRef.current) {
            const tooltipRect = tooltipRef.current.getBoundingClientRect();
            const viewportWidth = window.innerWidth;
            const margin = 12; // Minimal distance from screen edge

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

    // Update position on mount/resize if visible
    useEffect(() => {
        if (isVisible) {
            updatePosition();
            window.addEventListener('resize', updatePosition);
            window.addEventListener('scroll', updatePosition, true);
        }
        return () => {
            window.removeEventListener('resize', updatePosition);
            window.removeEventListener('scroll', updatePosition, true);
        };
    }, [isVisible, updatePosition]);

    const handleMouseEnter = (e: React.MouseEvent) => {
        if (window.matchMedia('(hover: hover)').matches) {
            setIsVisible(true);
        }
    };

    const handleMouseLeave = () => {
        if (window.matchMedia('(hover: hover)').matches) {
            setIsVisible(false);
        }
    };

    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsVisible(!isVisible);
    };

    useEffect(() => {
        if (!isVisible) return;
        const handleClickOutside = (event: Event) => {
            if (triggerRef.current && !triggerRef.current.contains(event.target as Node)) {
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

    const tooltipContent = isVisible && (
        <div
            ref={tooltipRef}
            className="fixed z-[100] px-[clamp(0.625rem,2.5vw,1.25rem)] py-[clamp(0.5rem,2vw,1rem)] text-white bg-[#0B1221]/98 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl pointer-events-none transition-all duration-300 animate-in fade-in zoom-in-95"
            style={{
                left: `${coords.x}px`,
                top: `${coords.y}px`,
                transform: 'translate(-50%, -100%)',
                maxWidth: 'clamp(240px, calc(100vw - 24px), 380px)',
                width: 'max-content',
                // Trigger an update after render to account for actual width
                visibility: coords.x === 0 ? 'hidden' : 'visible'
            }}
        >
            <div className="relative text-center leading-relaxed font-medium text-[clamp(0.7rem,1.8vw,0.875rem)] whitespace-normal break-words overflow-wrap-anywhere select-none">
                {text}
            </div>
            <div
                className="absolute bottom-[-5px] left-1/2 w-2.5 h-2.5 bg-[#0B1221] border-r border-b border-white/10 rotate-45"
                style={{
                    transform: `translateX(calc(-50% + ${coords.arrowOffset}px)) rotate(45deg)`
                }}
            />
        </div>
    );

    return (
        <>
            <button
                ref={triggerRef}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                onClick={handleClick}
                className={`${iconClassName} w-[clamp(1.25rem,4vw,1.5rem)] h-[clamp(1.25rem,4vw,1.5rem)] rounded-full bg-[#005430] hover:bg-[#17B76E] flex items-center justify-center transition-all shadow-lg border border-emerald-500/30 active:scale-90 group/tooltip relative z-20`}
                aria-label="More information"
            >
                <span className="text-white font-serif italic text-[clamp(0.75rem,2.5vw,0.9rem)] font-bold antialiased pr-[0.5px]">i</span>
            </button>

            {isVisible && createPortal(tooltipContent, document.body)}
        </>
    );
};

export default InfoTooltip;
