import React, { useState, useEffect, useRef } from 'react';
import { Wallet, ChevronDown, User, Settings, FileText, Shield, LogOut } from 'lucide-react';
import type { Wallet as WalletType } from '../types';
import { useAuth } from './auth/AuthProvider';
import { LoginModal } from './auth/LoginModal';
import { SignUpModal, EditModeData, FormData as SignUpFormData } from './auth/SignUpModal';
import { EmailVerificationModal } from './auth/EmailVerificationModal';
import { WhatsAppVerificationModal } from './auth/WhatsAppVerificationModal';
import { EditEmailModal } from './auth/EditEmailModal';
import { ForgotPasswordModal } from './auth/ForgotPasswordModal';
import { ResetPasswordModal } from './auth/ResetPasswordModal';
import { sendEmailOtp, verifyEmailOtp, sendWhatsAppOtp, verifyWhatsAppOtp } from '../lib/api';
import type { VerificationRequiredData } from './auth/LoginModal';

interface TopBarProps {
    wallet: WalletType | null;
    portfolioValue?: number;
    onMobileMenuClick: () => void;
}
// ... (props definition continued internally in component, but I'll skip to where needed or use multi_replace for cleaner edit if they are far apart)


// Store pending verification info for verification modals
// Includes all form data so user can return to edit with same state
interface PendingVerification {
    email: string;
    userId: string;
    // Step 1 data
    fullName?: string;
    dob?: string;
    countryOfResidence?: string;
    referralCode?: string;
    // Step 2 data
    phone?: string;
    phoneCode?: string;
    phoneIso?: string;
    whatsappPhone?: string;
    whatsappCode?: string;
    whatsappIso?: string;
    useSameNumber?: boolean;
    agreeToWhatsappOtp?: boolean;
    agreeToTerms?: boolean;
    // Legacy field
    maskedWhatsapp?: string;
}

const TopBar: React.FC<TopBarProps> = ({ wallet, portfolioValue = 0, onMobileMenuClick }) => {
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
    const [showEditEmailModal, setShowEditEmailModal] = useState(false);
    const [pendingVerification, setPendingVerification] = useState<PendingVerification | null>(null);

    // Edit mode state for SignUpModal
    const [isEditMode, setIsEditMode] = useState(false);
    const [editStep, setEditStep] = useState<1 | 2>(1);
    const [editData, setEditData] = useState<EditModeData | undefined>(undefined);

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
            <div className="h-14 md:h-16 bg-[#005430] md:bg-gray-900 border-b border-[#005430] md:border-gray-800 flex items-center justify-between px-3 md:px-6 flex-shrink-0 transition-colors z-50 relative">

                {/* Left: Mobile Menu & Branding (Visible on Mobile Only) */}
                <div className="flex items-center gap-2 md:hidden overflow-hidden">
                    <button
                        onClick={onMobileMenuClick}
                        className="text-white p-1 hover:bg-white/10 rounded-md transition-colors flex-shrink-0"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-menu"><line x1="4" x2="20" y1="12" y2="12" /><line x1="4" x2="20" y1="6" y2="6" /><line x1="4" x2="20" y1="18" y2="18" /></svg>
                    </button>
                    {/* Use Icon only on very small screens if needed, or stick to wordmark but smaller height */}
                    <img
                        src="/logos/mobile-header-logo-matched.svg"
                        alt="ShareMatch"
                        className="h-9 w-auto object-contain max-w-[160px]"
                    />
                </div>

                {/* Spacer for desktop */}
                <div className="hidden md:block"></div>

                {/* Right: Date, Balance, Avatar */}
                <div className="flex items-center gap-3 md:gap-6">
                    <div className="text-sm font-medium text-gray-400 hidden lg:block border-r border-gray-800 pr-6">
                        {formatTime(currentTime)}
                    </div>

                    {/* Mobile: Combined Quick Actions (Betfair style) */}
                    {user && !isPasswordRecovery && (
                        <div className="md:hidden flex items-center bg-[#004225] rounded-lg border border-[#006035]/50 overflow-hidden shadow-sm">
                            {/* Balance Part */}
                            <button
                                className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-[#005430] transition-colors active:bg-[#003820]"
                                onClick={() => setIsBalanceOpen(!isBalanceOpen)}
                            >
                                <span className="font-bold text-white text-sm">{balance.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                <ChevronDown className={`h-3 w-3 text-white/70 transition-transform ${isBalanceOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {/* Divider */}
                            <div className="w-[1px] h-4 bg-[#006035]/50"></div>

                            {/* User Icon Part */}
                            <button
                                className="px-2.5 py-1.5 hover:bg-[#005430] transition-colors active:bg-[#003820]"
                                onClick={() => setIsAvatarOpen(!isAvatarOpen)}
                            >
                                <User className="h-4 w-4 text-white" />
                            </button>
                        </div>
                    )}

                    {/* Desktop: Separate Buttons (Unchanged) */}
                    {user && !isPasswordRecovery && (
                        <div className="hidden md:flex items-center gap-6">
                            <div className="relative">
                                <button
                                    className="flex items-center gap-2 bg-[#005430] text-white px-4 py-2 rounded-lg hover:bg-[#005430]/90 transition-colors"
                                    onClick={() => setIsBalanceOpen(!isBalanceOpen)}
                                >
                                    <Wallet className="h-4 w-4" />
                                    <span className="font-bold">{balance.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</span>
                                    <ChevronDown className={`h-4 w-4 transition-transform ${isBalanceOpen ? 'rotate-180' : ''}`} />
                                </button>
                                {/* Balance Dropdown Logic reused below... actually need to make sure dropdowns position correctly for mobile too */}
                            </div>

                            <div className="relative">
                                <button
                                    className="h-10 w-10 rounded-full bg-[#005430]/10 flex items-center justify-center text-[#005430] hover:bg-[#005430]/20 transition-colors"
                                    onClick={() => setIsAvatarOpen(!isAvatarOpen)}
                                >
                                    <User className="h-5 w-5" />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Sign In Button (Logged Out) */}
                    {!user && (
                        <button
                            onClick={() => setShowLoginModal(true)}
                            className="bg-white text-[#005430] md:bg-gradient-primary md:text-white hover:bg-gray-100 hover:text-[#005430] px-3 py-1.5 md:px-4 md:py-2 rounded-full text-xs md:text-sm font-medium transition-colors border border-transparent md:border-0 shadow-lg"
                        >
                            Sign In
                        </button>
                    )}

                    {/* Shared Dropdowns (Positioned Absolutely) */}
                    {/* NOTE: We need to render these dropdowns OUTSIDE the mobile container if they are to show up correctly, 
                         or ensure the parent containers are relative. 
                         Let's put them here attached to the right side of the main container.
                     */}

                    {/* Balance Dropdown */}
                    {isBalanceOpen && (
                        <div className="absolute top-14 right-2 md:right-20 w-64 bg-gray-800 rounded-lg shadow-xl border border-gray-700 z-[60] py-2 animate-in fade-in slide-in-from-top-2">
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
                                    <span className="text-gray-400">Active Assets</span>
                                    <span className="font-medium text-gray-200">{(reserved + portfolioValue).toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Avatar Dropdown */}
                    {isAvatarOpen && (
                        <div className="absolute top-14 right-2 w-56 bg-gray-800 rounded-lg shadow-xl border border-gray-700 z-[60] py-1 animate-in fade-in slide-in-from-top-2">
                            <div className="px-4 py-3 border-b border-gray-700">
                                <p className="text-sm font-bold text-white truncate">{user?.email}</p>
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
                successMessage={showPasswordResetSuccess ? "Password reset successful! Log in with your new password." : undefined}
            />

            {/* Sign Up Modal */}
            <SignUpModal
                isOpen={showSignUpModal}
                onClose={() => {
                    setShowSignUpModal(false);
                    setIsEditMode(false);
                    setEditData(undefined);
                }}
                onSwitchToLogin={switchToLogin}
                onSuccess={async (email: string, userId: string, formData: SignUpFormData) => {
                    setShowSignUpModal(false);
                    setIsEditMode(false);
                    setEditData(undefined);
                    // Store all form data so user can return to edit with same state
                    setPendingVerification({
                        email,
                        userId,
                        fullName: formData.fullName,
                        dob: formData.dob,
                        countryOfResidence: formData.countryOfResidence,
                        referralCode: formData.referralCode,
                        phone: formData.phone,
                        phoneCode: formData.phoneCode,
                        phoneIso: formData.phoneIso,
                        whatsappPhone: formData.whatsapp,
                        whatsappCode: formData.whatsappCode,
                        whatsappIso: formData.whatsappIso,
                        useSameNumber: formData.useSameNumber,
                        agreeToWhatsappOtp: formData.agreeToWhatsappOtp,
                        agreeToTerms: formData.agreeToTerms,
                    });
                    setShowEmailVerificationModal(true);
                    try {
                        await sendEmailOtp(email);
                    } catch {
                        // Modal will still open, user can click resend
                    }
                }}
                isEditMode={isEditMode}
                editData={editData}
                onEditSuccess={async (email: string, whatsappPhone: string | undefined, formData: SignUpFormData) => {
                    setShowSignUpModal(false);
                    setIsEditMode(false);
                    setEditData(undefined);

                    // Update pending verification with all form data
                    if (pendingVerification) {
                        setPendingVerification({
                            ...pendingVerification,
                            // Update with new form data
                            fullName: formData.fullName,
                            dob: formData.dob,
                            countryOfResidence: formData.countryOfResidence,
                            referralCode: formData.referralCode,
                            phone: formData.phone,
                            phoneCode: formData.phoneCode,
                            phoneIso: formData.phoneIso,
                            whatsappCode: formData.whatsappCode,
                            whatsappIso: formData.whatsappIso,
                            useSameNumber: formData.useSameNumber,
                            agreeToWhatsappOtp: formData.agreeToWhatsappOtp,
                            agreeToTerms: formData.agreeToTerms,
                            email,
                            whatsappPhone: whatsappPhone || pendingVerification.whatsappPhone,
                        });
                    }

                    // Go back to the appropriate verification modal
                    if (editStep === 1) {
                        // Email was edited, go back to email verification
                        setShowEmailVerificationModal(true);
                        // OTP already sent by the update API
                    } else {
                        // Phone was edited, go back to WhatsApp verification
                        setShowWhatsAppVerificationModal(true);
                        // OTP already sent by the update API
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
                onEditEmail={() => {
                    // Open simple email edit modal (not full signup form)
                    setShowEmailVerificationModal(false);
                    setShowEditEmailModal(true);
                }}
            />

            {/* Edit Email Modal - Simple email-only edit */}
            <EditEmailModal
                isOpen={showEditEmailModal}
                onClose={() => {
                    setShowEditEmailModal(false);
                    setShowEmailVerificationModal(true);
                }}
                currentEmail={pendingVerification?.email || ''}
                onSave={async (newEmail) => {
                    if (!pendingVerification) return false;
                    try {
                        const { updateUserProfile } = await import('../lib/api');
                        const result = await updateUserProfile({
                            currentEmail: pendingVerification.email,
                            newEmail: newEmail,
                            sendEmailOtp: true,
                        });
                        if (result.ok) {
                            // Update pending verification with new email
                            setPendingVerification({
                                ...pendingVerification,
                                email: newEmail,
                            });
                            // Close edit modal and return to email verification
                            setShowEditEmailModal(false);
                            setShowEmailVerificationModal(true);
                            return true;
                        }
                        return false;
                    } catch (error: any) {
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
                onEditPhone={() => {
                    // Close verification modal and open SignUp in edit mode at step 2 with all their data
                    setShowWhatsAppVerificationModal(false);
                    setIsEditMode(true);
                    setEditStep(2);
                    setEditData({
                        email: pendingVerification?.email || '',
                        fullName: pendingVerification?.fullName,
                        dob: pendingVerification?.dob,
                        countryOfResidence: pendingVerification?.countryOfResidence,
                        referralCode: pendingVerification?.referralCode,
                        phone: pendingVerification?.phone,
                        phoneCode: pendingVerification?.phoneCode,
                        phoneIso: pendingVerification?.phoneIso,
                        whatsappPhone: pendingVerification?.whatsappPhone,
                        whatsappCode: pendingVerification?.whatsappCode,
                        whatsappIso: pendingVerification?.whatsappIso,
                        useSameNumber: pendingVerification?.useSameNumber,
                        agreeToWhatsappOtp: pendingVerification?.agreeToWhatsappOtp,
                        agreeToTerms: pendingVerification?.agreeToTerms,
                    });
                    setShowSignUpModal(true);
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
