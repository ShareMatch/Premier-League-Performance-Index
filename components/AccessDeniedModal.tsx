import React from 'react';
import { X, Sparkles, ShieldCheck } from 'lucide-react';

interface AccessDeniedModalProps {
    isOpen: boolean;
    onClose: () => void;
    onViewMarket: () => void;
}

const AccessDeniedModal: React.FC<AccessDeniedModalProps> = ({ isOpen, onClose, onViewMarket }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal Content */}
            <div className="relative bg-[#0B1221] border border-[#005430] w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">

                {/* Header Enhancement */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#005430] via-[#00A651] to-[#005430]" />

                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors p-1 rounded-full hover:bg-white/10"
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="p-8 text-center space-y-6">

                    {/* Icon Area */}
                    <div className="relative mx-auto w-20 h-20 flex items-center justify-center">
                        <div className="absolute inset-0 bg-[#005430]/20 rounded-full animate-pulse z-0" />
                        <div className="absolute inset-2 bg-[#005430]/40 rounded-full z-10" />
                        <Sparkles className="w-10 h-10 text-[#00A651] relative z-20" />
                    </div>

                    <div className="space-y-3">
                        <h2 className="text-2xl font-bold text-white tracking-tight">
                            Unlock AI Analytics
                        </h2>
                        <p className="text-gray-300 leading-relaxed text-sm">
                            The ShareMatch AI Analytics Engine is a premium utility designed exclusively for active market participants.
                        </p>
                        <p className="text-gray-400 text-xs px-4">
                            To access these advanced predictive insights, you must own at least one token asset.
                        </p>
                    </div>

                    <div className="flex items-center justify-center gap-2 text-[#00A651] text-xs font-medium bg-[#005430]/10 py-2 px-4 rounded-full mx-auto w-fit border border-[#005430]/30">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Shariah Compliant Utility</span>
                    </div>

                    <button
                        onClick={() => {
                            onViewMarket();
                            onClose();
                        }}
                        className="w-full py-3.5 px-6 bg-[#005430] hover:bg-[#006838] active:bg-[#004225] text-white font-bold rounded-xl transition-all shadow-lg hover:shadow-[#005430]/50 transform hover:-translate-y-0.5"
                    >
                        Explore Markets & Buy Tokens
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AccessDeniedModal;
