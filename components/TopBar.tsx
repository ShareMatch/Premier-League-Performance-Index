import React, { useState, useEffect, useRef } from 'react';
import { Wallet, ChevronDown, User, Settings, FileText, Shield, LogOut } from 'lucide-react';
import type { Wallet as WalletType } from '../types';
import { useAuth } from './auth/AuthProvider';
import { LoginModal } from './auth/LoginModal';
import { SignUpModal } from './auth/SignUpModal';
import { EmailVerificationModal } from './auth/EmailVerificationModal';
import { WhatsAppVerificationModal } from './auth/WhatsAppVerificationModal';
import { ForgotPasswordModal } from './auth/ForgotPasswordModal';
import { ResetPasswordModal } from './auth/ResetPasswordModal';
import { sendEmailOtp, verifyEmailOtp, sendWhatsAppOtp, verifyWhatsAppOtp } from '../lib/api';
import type { VerificationRequiredData } from './auth/LoginModal';

interface TopBarProps {
    wallet: WalletType | null;
}

// Store pending verification info for verification modals
interface PendingVerification {
    email: string;
    userId: string;
    whatsappPhone?: string;
    maskedWhatsapp?: string;
}

const TopBar: React.FC<TopBarProps> = ({ wallet }) => {
    const { user, signOut, isPasswordRecovery, clearPasswordRecovery } = useAuth();
    const [currentTime, setCurrentTime] = useState(new Date());
    const [isBalanceOpen, setIsBalanceOpen] = useState(false);
    const [isAvatarOpen, setIsAvatarOpen] = useState(false);
    const [showLoginModal, setShowLoginModal] = useState(false);
    const [showSignUpModal, setShowSignUpModal] = useState(false);
    const [showEmailVerificationModal, setShowEmailVerificationModal] = useState(false);
    const [showWhatsAppVerificationModal, setShowWhatsAppVerificationModal] = useState(false);
    const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
    const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
    const [showPasswordResetSuccess, setShowPasswordResetSuccess] = useState(false);
    const [pendingVerification, setPendingVerification] = useState<PendingVerification | null>(null);
    
    // Ref to store WhatsApp data from email verification response (avoids async state issues)
    const whatsappDataRef = useRef<{ raw: string; masked: string } | null>(null);

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // Close modals when user logs in
    useEffect(() => {
        if (user) {
            setShowLoginModal(false);
            setShowSignUpModal(false);
        }
    }, [user]);

    const switchToSignUp = () => {
        setShowLoginModal(false);
        setShowSignUpModal(true);
    };

    const switchToLogin = () => {
        setShowSignUpModal(false);
        setShowForgotPasswordModal(false);
        setShowLoginModal(true);
    };

    const handleForgotPassword = () => {
        setShowLoginModal(false);
        setShowForgotPasswordModal(true);
    };

    const handleBackToLoginFromForgot = () => {
        setShowForgotPasswordModal(false);
        setShowLoginModal(true);
    };

    const handleResetPasswordSuccess = () => {
        setShowResetPasswordModal(false);
        clearPasswordRecovery(); // Clear recovery mode in AuthProvider
        setShowPasswordResetSuccess(true);
        setShowLoginModal(true);
        // Success message will be cleared when login modal closes
    };

    // Open reset password modal when in password recovery mode
    useEffect(() => {
        if (isPasswordRecovery) {
            setShowResetPasswordModal(true);
            if (window.location.hash) {
                window.history.replaceState(null, '', window.location.pathname + window.location.search);
            }
        }
    }, [isPasswordRecovery]);

    const handleVerificationRequired = async (data: VerificationRequiredData) => {
        setPendingVerification({
            email: data.email,
            userId: '',
            whatsappPhone: data.whatsappData?.raw,
            maskedWhatsapp: data.whatsappData?.masked,
        });

        if (data.verificationType === 'email') {
            setShowEmailVerificationModal(true);
            try {
                await sendEmailOtp(data.email);
            } catch {
                // Modal will still open, user can click resend
            }
        } else if (data.verificationType === 'whatsapp') {
            setShowWhatsAppVerificationModal(true);
            try {
                await sendWhatsAppOtp({ email: data.email });
            } catch {
                // Modal will still open, user can click resend
            }
        }
    };

    const balance = wallet ? wallet.balance : 0;
    const available = wallet ? wallet.available_cents / 100 : 0;
    const reserved = wallet ? wallet.reserved_cents / 100 : 0;

    const formatTime = (date: Date) => {
        return date.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        });
    };

    return (
        <>
            <div className="h-16 bg-gray-900 border-b border-gray-800 flex items-center justify-end px-6 flex-shrink-0">

                {/* Right: Date, Balance, Avatar */}
                <div className="flex items-center gap-6">
                    <div className="text-sm font-medium text-gray-400 hidden lg:block border-r border-gray-800 pr-6">
                        {formatTime(currentTime)}
                    </div>

                    {/* Balance Dropdown - Only show if user is logged in and not in recovery mode */}
                    {user && !isPasswordRecovery && (
                        <div className="relative">
                            <button
                                className="flex items-center gap-2 bg-[#3AA189] text-white px-4 py-2 rounded-lg hover:bg-[#2d826f] transition-colors"
                                onClick={() => setIsBalanceOpen(!isBalanceOpen)}
                            >
                                <Wallet className="h-4 w-4" />
                                <span className="font-bold">{balance.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</span>
                                <ChevronDown className={`h-4 w-4 transition-transform ${isBalanceOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {isBalanceOpen && (
                                <div className="absolute right-0 mt-2 w-64 bg-gray-800 rounded-lg shadow-xl border border-gray-700 z-50 py-2 animate-in fade-in slide-in-from-top-2">
                                    <div className="px-4 py-2 border-b border-gray-700">
                                        <p className="text-xs text-gray-400 uppercase font-semibold">Total Balance</p>
                                        <p className="text-xl font-bold text-white">{balance.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</p>
                                    </div>
                                    <div className="px-4 py-2">
                                        <div className="flex justify-between text-sm mb-1">
                                            <span className="text-gray-400">Available</span>
                                            <span className="font-medium text-gray-200">{available.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-400">In Orders</span>
                                            <span className="font-medium text-gray-200">{reserved.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Avatar Dropdown or Sign In - Hide logged-in state during recovery mode */}
                    {user && !isPasswordRecovery ? (
                        <div className="relative">
                            <button
                                className="h-10 w-10 rounded-full bg-[#3AA189]/10 flex items-center justify-center text-[#3AA189] hover:bg-[#3AA189]/20 transition-colors"
                                onClick={() => setIsAvatarOpen(!isAvatarOpen)}
                            >
                                <User className="h-5 w-5" />
                            </button>

                            {isAvatarOpen && (
                                <div className="absolute right-0 mt-2 w-56 bg-gray-800 rounded-lg shadow-xl border border-gray-700 z-50 py-1 animate-in fade-in slide-in-from-top-2">
                                    <div className="px-4 py-3 border-b border-gray-700">
                                        <p className="text-sm font-bold text-white truncate">{user.email}</p>
                                        <p className="text-xs text-gray-400">Last logged in: Today</p>
                                    </div>
                                    <div className="py-1">
                                        <a href="#" className="flex items-center gap-3 px-4 py-2 text-sm text-gray-300 hover:bg-gray-700">
                                            <Settings className="h-4 w-4" /> Settings
                                        </a>
                                        <a href="#" className="flex items-center gap-3 px-4 py-2 text-sm text-gray-300 hover:bg-gray-700">
                                            <FileText className="h-4 w-4" /> Portfolio
                                        </a>
                                        <a href="#" className="flex items-center gap-3 px-4 py-2 text-sm text-gray-300 hover:bg-gray-700">
                                            <Shield className="h-4 w-4" /> Rules & Regulations
                                        </a>
                                        <button
                                            onClick={() => signOut()}
                                            className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-400 hover:bg-gray-700 text-left"
                                        >
                                            <LogOut className="h-4 w-4" /> Sign Out
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <button
                            onClick={() => setShowLoginModal(true)}
                            className="bg-[#064e3b] hover:bg-[#053d2f] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                        >
                            Sign In
                        </button>
                    )}
                </div>
            </div>

            {/* Login Modal */}
            <LoginModal 
                isOpen={showLoginModal} 
                onClose={() => {
                    setShowLoginModal(false);
                    setShowPasswordResetSuccess(false); // Clear success message when modal closes
                }}
                onSwitchToSignUp={switchToSignUp}
                onForgotPassword={handleForgotPassword}
                onVerificationRequired={handleVerificationRequired}
                successMessage={showPasswordResetSuccess ? "Password reset successful! Please log in with your new password." : undefined}
            />

            {/* Sign Up Modal */}
            <SignUpModal
                isOpen={showSignUpModal}
                onClose={() => setShowSignUpModal(false)}
                onSwitchToLogin={switchToLogin}
                onSuccess={async (email: string, userId: string) => {
                    setShowSignUpModal(false);
                    setPendingVerification({ email, userId });
                    setShowEmailVerificationModal(true);
                    try {
                        await sendEmailOtp(email);
                    } catch {
                        // Modal will still open, user can click resend
                    }
                }}
            />

            {/* Email Verification Modal */}
            <EmailVerificationModal
                isOpen={showEmailVerificationModal && pendingVerification !== null}
                onClose={() => {
                    setShowEmailVerificationModal(false);
                    setPendingVerification(null);
                    whatsappDataRef.current = null;
                }}
                email={pendingVerification?.email || ''}
                onVerificationSuccess={async () => {
                    setShowEmailVerificationModal(false);
                    const whatsappData = whatsappDataRef.current;
                    
                    if (whatsappData && pendingVerification) {
                        setPendingVerification({
                            ...pendingVerification,
                            whatsappPhone: whatsappData.raw,
                            maskedWhatsapp: whatsappData.masked,
                        });
                        setShowWhatsAppVerificationModal(true);
                        try {
                            await sendWhatsAppOtp({ email: pendingVerification.email });
                        } catch {
                            // Modal will still open, user can click resend
                        }
                    } else {
                        setPendingVerification(null);
                        setShowLoginModal(true);
                    }
                    whatsappDataRef.current = null;
                }}
                onVerifyCode={async (code) => {
                    if (!pendingVerification?.email) return false;
                    try {
                        const result = await verifyEmailOtp(pendingVerification.email, code);
                        if (result.whatsappData) {
                            whatsappDataRef.current = result.whatsappData;
                        }
                        return result.ok;
                    } catch (error) {
                        throw error;
                    }
                }}
                onResendCode={async () => {
                    if (!pendingVerification?.email) return false;
                    try {
                        const result = await sendEmailOtp(pendingVerification.email);
                        return result.ok;
                    } catch (error) {
                        throw error;
                    }
                }}
            />

            {/* WhatsApp Verification Modal */}
            <WhatsAppVerificationModal
                isOpen={showWhatsAppVerificationModal}
                onClose={() => {
                    setShowWhatsAppVerificationModal(false);
                    setPendingVerification(null);
                }}
                whatsappPhone={pendingVerification?.whatsappPhone || ''}
                maskedWhatsapp={pendingVerification?.maskedWhatsapp}
                onVerificationSuccess={() => {
                    setShowWhatsAppVerificationModal(false);
                    setPendingVerification(null);
                    setShowLoginModal(true);
                }}
                onVerifyCode={async (code) => {
                    if (!pendingVerification) return false;
                    try {
                        const result = await verifyWhatsAppOtp({
                            email: pendingVerification.email,
                            token: code,
                        });
                        return result.ok;
                    } catch (error) {
                        throw error;
                    }
                }}
                onResendCode={async () => {
                    if (!pendingVerification) return false;
                    try {
                        const result = await sendWhatsAppOtp({
                            email: pendingVerification.email,
                        });
                        return result.ok;
                    } catch (error) {
                        throw error;
                    }
                }}
            />

            {/* Forgot Password Modal */}
            <ForgotPasswordModal
                isOpen={showForgotPasswordModal}
                onClose={() => setShowForgotPasswordModal(false)}
                onBackToLogin={handleBackToLoginFromForgot}
                onSwitchToSignUp={() => {
                    setShowForgotPasswordModal(false);
                    setShowSignUpModal(true);
                }}
            />

            {/* Reset Password Modal */}
            <ResetPasswordModal
                isOpen={showResetPasswordModal}
                onClose={() => {
                    setShowResetPasswordModal(false);
                    clearPasswordRecovery();
                    setShowLoginModal(true);
                }}
                onSuccess={handleResetPasswordSuccess}
            />
        </>
    );
};

export default TopBar;
