import React, { useState } from "react";
import { X, ChevronRight, Users, Trophy, ShieldCheck, Zap } from "lucide-react";

interface HowItWorksModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const HowItWorksModal: React.FC<HowItWorksModalProps> = ({ isOpen, onClose }) => {
    const [step, setStep] = useState(0);

    if (!isOpen) return null;

    const steps = [
        {
            title: "Who We Are",
            icon: <Users className="w-12 h-12 text-brand-emerald400" />,
            content:
                "ShareMatch is a cutting-edge digital performance index market. We create a dynamic environment where sports knowledge meets technical analysis, allowing you to engage with the performance of your favorite teams and athletes globally.",
        },
        {
            title: "What We Offer",
            icon: <Trophy className="w-12 h-12 text-brand-emerald400" />,
            content:
                "We offer unique Seasonal Performance Tokens for top-tier leagues like EPL, NBA, and F1. Trade these tokens in real-time as performance indexes shift based on real-world outcomes, giving you a chance to capitalize on your expertise.",
        },
        {
            title: "Shariah Compliant",
            icon: <ShieldCheck className="w-12 h-12 text-brand-emerald400" />,
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

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-[clamp(0.5rem,3vw,1rem)]">
            {/* Overlay */}
            <div
                className="absolute inset-0 bg-black/85 backdrop-blur-sm animate-in fade-in duration-300"
                onClick={onClose}
            />

            {/* Modal Card */}
            <div className="relative w-full max-w-[clamp(300px,95vw,512px)] bg-[#0B1221] border border-gray-800 rounded-[clamp(1rem,4vw,1.5rem)] shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-5 sm:slide-in-from-bottom-0 duration-300">
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-[clamp(0.75rem,3vw,1rem)] right-[clamp(0.75rem,3vw,1rem)] p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-full transition-all z-10"
                    aria-label="Close dialog"
                >
                    <X className="w-[clamp(1rem,4vw,1.25rem)] h-[clamp(1rem,4vw,1.25rem)]" />
                </button>

                <div className="flex flex-col items-center">
                    <div className="p-[clamp(1.5rem,6vw,2.5rem)] w-full flex flex-col items-center">
                        {/* Step Icon */}
                        <div className="mb-[clamp(1rem,4vw,1.5rem)] p-[clamp(0.75rem,3vw,1rem)] bg-[#005430]/10 rounded-[clamp(0.75rem,3vw,1.25rem)] border border-[#005430]/20 flex items-center justify-center">
                            {React.cloneElement(steps[step].icon as React.ReactElement, {
                                className: "w-[clamp(2.5rem,8vw,3rem)] h-[clamp(2.5rem,8vw,3rem)] text-[#005430]"
                            })}
                        </div>

                        {/* Content Area - Fixed min-height to prevent jumping */}
                        <div className="w-full min-h-[clamp(140px,40vh,180px)] mb-[clamp(1.5rem,5vw,2rem)] text-center flex flex-col items-center justify-center">
                            <h2 className="text-[clamp(1.35rem,6.5vw,1.5rem)] font-bold text-white mb-[clamp(0.75rem,3vw,1rem)] leading-tight">
                                {steps[step].title}
                            </h2>
                            <p className="text-gray-400 leading-relaxed text-[clamp(0.875rem,4vw,0.9375rem)] max-w-[400px]">
                                {steps[step].content}
                            </p>
                        </div>

                        {/* Progress Dots */}
                        <div className="flex gap-[clamp(0.4rem,1.5vw,0.5rem)] mb-[clamp(1.5rem,5vw,2.5rem)]">
                            {steps.map((_, i) => (
                                <div
                                    key={i}
                                    className={`h-[clamp(4px,1vw,6px)] rounded-full transition-all duration-300 ${i === step ? "w-[clamp(1.5rem,6vw,2.5rem)] bg-[#005430]" : "w-[clamp(4px,1vw,6px)] bg-gray-800"
                                        }`}
                                />
                            ))}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex w-full gap-[clamp(0.5rem,2vw,1rem)]">
                            {step > 0 && (
                                <button
                                    onClick={handleBack}
                                    className="flex-1 py-[clamp(0.75rem,3vw,0.875rem)] px-[clamp(1rem,4vw,1.5rem)] rounded-[clamp(0.5rem,2vw,0.75rem)] border border-gray-700 text-gray-300 font-bold hover:bg-gray-800 hover:text-white transition-all active:scale-[98%] text-[clamp(0.875rem,3.5vw,1rem)]"
                                >
                                    Back
                                </button>
                            )}
                            <button
                                onClick={handleNext}
                                className="flex-[2] py-[clamp(0.75rem,3vw,0.875rem)] px-[clamp(1rem,4vw,1.5rem)] rounded-[clamp(0.5rem,2vw,0.75rem)] bg-[#005430] hover:bg-[#006a3d] text-white font-bold transition-all shadow-lg shadow-[#005430]/10 active:scale-[98%] flex items-center justify-center gap-2 group text-[clamp(0.875rem,3.5vw,1rem)]"
                            >
                                {step === steps.length - 1 ? "Get Started" : "Next"}
                                {step < steps.length - 1 && <ChevronRight className="w-[clamp(1rem,4vw,1.25rem)] h-[clamp(1rem,4vw,1.25rem)] group-hover:translate-x-0.5 transition-transform" />}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HowItWorksModal;
