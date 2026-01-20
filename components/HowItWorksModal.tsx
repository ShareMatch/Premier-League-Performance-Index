import React, { useState } from "react";
import { createPortal } from "react-dom";
import { X, ChevronRight, Users, Trophy, ShieldCheck } from "lucide-react";
import Button from "./Button";

interface HowItWorksModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const HowItWorksModal: React.FC<HowItWorksModalProps> = ({
    isOpen,
    onClose,
}) => {
    const [step, setStep] = useState(0);
    const [isButtonHovered, setIsButtonHovered] = useState(false);

    if (!isOpen) return null;

    const steps = [
        {
            title: "Who We Are",
            icon: <Users className="w-12 h-12 text-white" />,
            content:
                "ShareMatch is a cutting-edge digital performance index market. We create a dynamic environment where sports knowledge meets technical analysis, allowing you to engage with the performance of your favorite teams and athletes globally.",
        },
        {
            title: "What We Offer",
            icon: <Trophy className="w-12 h-12 text-white" />,
            content:
                "We offer unique Seasonal Performance Tokens for top-tier leagues like EPL, NBA, and F1. Trade these tokens in real-time as performance indexes shift based on real-world outcomes, giving you a chance to capitalize on your expertise.",
        },
        {
            title: "Shariah Compliant",
            icon: <ShieldCheck className="w-12 h-12 text-white" />,
            content:
                "Sustainability and ethics are at our core. Our platform is built on transparency and fairness, utilizing real market data to ensure a non-speculative, skill-based experience that strictly adheres to Shariah compliance guidelines.",
        },
    ];

    const handleNext = () => {
        if (step < steps.length - 1) {
            setStep(step + 1);
        } else {
            onClose();
            // Reset for next time
            setTimeout(() => setStep(0), 300);
        }
    };

    const handleBack = () => {
        if (step > 0) {
            setStep(step - 1);
        }
    };

    const modalContent = (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 overflow-y-auto w-full h-full">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
                onClick={onClose}
            />

            {/* Modal Content */}
            <div
                className="relative w-full max-w-md bg-[#005430] rounded-xl sm:rounded-modal p-2 sm:p-4 max-h-[95vh] overflow-y-auto scrollbar-hide z-[101] animate-in zoom-in-95 slide-in-from-bottom-5 duration-300"
                data-testid="how-it-works-modal"
            >
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-1 sm:top-3 right-1 sm:right-3 text-gray-400 hover:text-white transition-colors z-10"
                    aria-label="Close"
                    data-testid="how-it-works-modal-close-button"
                >
                    <X className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>

                {/* Content Container */}
                <div className="flex flex-col rounded-lg sm:rounded-xl p-2 sm:p-4 gap-2">
                    <div className="flex flex-col items-center py-2">
                        {/* Step Icon */}
                        <div className="mb-4 p-3 bg-white/10 rounded-2xl border border-white/20 flex items-center justify-center">
                            {steps[step].icon}
                        </div>

                        {/* Content Area - Fixed min-height to prevent jumping */}
                        <div className="w-full min-h-[140px] mb-4 text-center flex flex-col items-center justify-center">
                            <h3 className="text-xl sm:text-2xl font-bold text-white mb-2 leading-tight">
                                {steps[step].title}
                            </h3>
                            <p className="text-gray-200 leading-relaxed text-sm sm:text-base max-w-[400px]">
                                {steps[step].content}
                            </p>
                        </div>

                        {/* Buttons */}
                        <div className="flex w-full justify-center pt-2">
                            <div
                                className={`rounded-full transition-all duration-300 ${isButtonHovered ? "shadow-glow" : ""
                                    }`}
                                onMouseEnter={() => setIsButtonHovered(true)}
                                onMouseLeave={() => setIsButtonHovered(false)}
                            >
                                <Button
                                    onClick={handleNext}
                                    fullWidth={false}
                                    className={`${isButtonHovered ? "opacity-90" : ""} mx-auto px-8 sm:px-10 min-w-[160px]`}
                                >
                                    <div className="flex items-center justify-center gap-2">
                                        {step === steps.length - 1 ? "Get Started" : "Next"}
                                        {step < steps.length - 1 && (
                                            <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                                        )}
                                    </div>
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
};

export default HowItWorksModal;
