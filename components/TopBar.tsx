import React, { useState, useEffect, useRef } from "react";
import {
  Wallet,
  ChevronDown,
  User,
  Settings,
  FileText,
  Shield,
  LogOut,
  Search,
  X,
  Mic,
  Menu,
} from "lucide-react";
import type { Wallet as WalletType, Team, League } from "../types";
import { useAuth } from "./auth/AuthProvider";
import { LoginModal } from "./auth/LoginModal";
import {
  SignUpModal,
  EditModeData,
  FormData as SignUpFormData,
} from "./auth/SignUpModal";
import { EmailVerificationModal } from "./auth/EmailVerificationModal";
import { WhatsAppVerificationModal } from "./auth/WhatsAppVerificationModal";
import { EditEmailModal } from "./auth/EditEmailModal";
import { ForgotPasswordModal } from "./auth/ForgotPasswordModal";
import { ResetPasswordModal } from "./auth/ResetPasswordModal";
import {
  sendEmailOtp,
  verifyEmailOtp,
  sendWhatsAppOtp,
  verifyWhatsAppOtp,
} from "../lib/api";
import type { VerificationRequiredData } from "./auth/LoginModal";

interface TopBarProps {
  wallet: WalletType | null;
  portfolioValue?: number;
  onMobileMenuClick: () => void;
  activeLeague?: League;
  onNavigate?: (league: League) => void;
  allAssets?: Team[];
  onOpenSettings?: () => void;
  onOpenPortfolio?: () => void;
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

const TopBar: React.FC<TopBarProps> = ({
  wallet,
  portfolioValue = 0,
  onMobileMenuClick,
  activeLeague,
  onNavigate,
  allAssets = [],
  onOpenSettings,
  onOpenPortfolio,
}) => {
  const { user, signOut, isPasswordRecovery, clearPasswordRecovery } =
    useAuth();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isBalanceOpen, setIsBalanceOpen] = useState(false);
  const [isAvatarOpen, setIsAvatarOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showSignUpModal, setShowSignUpModal] = useState(false);
  const [showEmailVerificationModal, setShowEmailVerificationModal] =
    useState(false);
  const [showWhatsAppVerificationModal, setShowWhatsAppVerificationModal] =
    useState(false);
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [showPasswordResetSuccess, setShowPasswordResetSuccess] =
    useState(false);
  const [showEditEmailModal, setShowEditEmailModal] = useState(false);
  const [pendingVerification, setPendingVerification] =
    useState<PendingVerification | null>(null);

  // Edit mode state for SignUpModal
  const [isEditMode, setIsEditMode] = useState(false);
  const [editStep, setEditStep] = useState<1 | 2>(1);
  const [editData, setEditData] = useState<EditModeData | undefined>(undefined);

  // Ref to store WhatsApp data from email verification response (avoids async state issues)
  const whatsappDataRef = useRef<{ raw: string; masked: string } | null>(null);

  // Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Team[]>([]);
  const [isListening, setIsListening] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const balanceRef = useRef<HTMLDivElement | null>(null);
  const avatarRef = useRef<HTMLDivElement | null>(null);
  const mobileQuickRef = useRef<HTMLDivElement | null>(null);

  // Search Logic
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setSearchResults([]);
      return;
    }

    const query = searchQuery.toLowerCase();
    const results = allAssets
      .filter((asset) => asset.name.toLowerCase().includes(query))
      .slice(0, 10); // Limit to 10 results

    setSearchResults(results);
  }, [searchQuery, allAssets]);

  const handleSearchResultClick = (asset: Team) => {
    if (asset.market && onNavigate) {
      onNavigate(asset.market as League);
      setSearchQuery("");
      setSearchResults([]);
    }
  };

  // Voice Search Logic
  const startListening = () => {
    if (
      !("webkitSpeechRecognition" in window) &&
      !("SpeechRecognition" in window)
    ) {
      alert("Voice search is not supported in this browser.");
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setSearchQuery(transcript);
      if (searchInputRef.current) {
        searchInputRef.current.focus();
      }
    };

    recognition.start();
  };

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Click-outside & Escape handler for dropdowns
  useEffect(() => {
    if (!isBalanceOpen && !isAvatarOpen) return; // Only add listener when dropdown is open

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;

      // Check if click is inside any of our dropdown containers
      const isInsideBalance = balanceRef.current?.contains(target);
      const isInsideAvatar = avatarRef.current?.contains(target);
      const isInsideMobileQuick = mobileQuickRef.current?.contains(target);

      // Close dropdowns if click is outside all containers
      if (!isInsideBalance && !isInsideAvatar && !isInsideMobileQuick) {
        setIsBalanceOpen(false);
        setIsAvatarOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsBalanceOpen(false);
        setIsAvatarOpen(false);
      }
    };

    // Use click only - it works for both mouse and touch (synthesized from touch)
    // Adding a small delay to let button onClick handlers fire first
    const timeoutId = setTimeout(() => {
      document.addEventListener("click", handleClickOutside);
    }, 10);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener("click", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isBalanceOpen, isAvatarOpen]);

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
        window.history.replaceState(
          null,
          "",
          window.location.pathname + window.location.search
        );
      }
    }
  }, [isPasswordRecovery]);

  const handleVerificationRequired = async (data: VerificationRequiredData) => {
    setPendingVerification({
      email: data.email,
      userId: "",
      whatsappPhone: data.whatsappData?.raw,
      maskedWhatsapp: data.whatsappData?.masked,
    });

    if (data.verificationType === "email") {
      setShowEmailVerificationModal(true);
      try {
        await sendEmailOtp(data.email);
      } catch {
        // Modal will still open, user can click resend
      }
    } else if (data.verificationType === "whatsapp") {
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
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  };

  return (
    <>
      <div className="h-14 lg:h-20 bg-[#005430] border-b border-[#004225] flex items-center justify-between px-3 lg:px-6 flex-shrink-0 transition-colors z-50 relative shadow-sm">
        {/* Mobile Search Overlay */}
        {isMobileSearchOpen ? (
          <div className="absolute inset-0 bg-[#005430] z-[60] flex items-center px-3 gap-2 animate-in fade-in slide-in-from-top-2">
            <Search className="h-5 w-5 text-gray-400" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="flex-1 bg-transparent border-none text-white placeholder-gray-400 focus:ring-0 text-base"
              autoFocus
            />
            {searchQuery ? (
              <button
                onClick={() => setSearchQuery("")}
                className="text-gray-400"
              >
                <X className="h-5 w-5" />
              </button>
            ) : (
              <button
                onClick={startListening}
                className={`text-gray-400 ${isListening ? "text-[#005430] animate-pulse" : ""
                  }`}
              >
                <Mic className={`h-5 w-5 ${isListening ? "text-white" : ""}`} />
              </button>
            )}
            <button
              onClick={() => {
                setIsMobileSearchOpen(false);
                setSearchQuery("");
              }}
              className="text-white font-medium text-sm ml-2"
            >
              Cancel
            </button>
            {/* Mobile Search Results Dropdown (Attached to overlay) */}
            {searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 bg-gray-900 border-t border-gray-800 shadow-xl max-h-[60vh] overflow-y-auto z-50">
                {searchResults.map((asset) => (
                  <button
                    key={asset.id}
                    onClick={() => {
                      handleSearchResultClick(asset);
                      setIsMobileSearchOpen(false);
                    }}
                    className="w-full text-left px-4 py-4 border-b border-gray-800 flex items-center justify-between text-gray-200 active:bg-gray-800"
                  >
                    <span className="font-medium">{asset.name}</span>
                    {asset.market && (
                      <span className="text-xs bg-gray-800 px-2 py-1 rounded text-gray-400">
                        {asset.market}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Normal Header Content */
          <>
            {/* Left: Mobile Menu & Logo */}
            <div className="flex items-center gap-3">
              <button
                className="lg:hidden text-white/80 hover:text-white transition-colors"
                onClick={onMobileMenuClick}
              >
                <Menu className="h-6 w-6" />
              </button>

              {/* Logo - Always visible now */}
              <img
                src="/logos/mobile-header-logo-matched.svg"
                alt="ShareMatch"
                className="h-8 lg:h-16 w-auto object-contain"
              />
            </div>

            {/* Mobile Search Trigger Icon */}
            <button
              className="lg:hidden ml-auto mr-3 text-white/80 hover:text-white"
              onClick={() => setIsMobileSearchOpen(true)}
            >
              <Search className="h-5 w-5" />
            </button>

            {/* Center: Search Bar (Desktop) */}
            <div className="hidden lg:flex flex-1 max-w-xl mx-6 relative z-50">
              <div className="relative w-full group">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-[#005430] h-4 w-4 transition-colors pointer-events-none" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={
                    isListening
                      ? "Listening..."
                      : "Find assets and indices..."
                  }
                  className={`w-full pl-10 pr-10 py-2.5 bg-[#004225]/50 border border-[#006035] hover:border-[#007040] focus:bg-white focus:border-white focus:text-gray-900 rounded-[4px] text-sm text-gray-100 placeholder-gray-400 transition-all outline-none shadow-inner`}
                />

                {/* Search Actions */}
                {searchQuery ? (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-[#005430]"
                  >
                    <X className="h-4 w-4" />
                  </button>
                ) : (
                  <button
                    onClick={startListening}
                    className={`absolute right-3 top-1/2 transform -translate-y-1/2 ${isListening
                        ? "text-[#005430]"
                        : "text-gray-400 hover:text-gray-200"
                      }`}
                  >
                    <Mic className="h-4 w-4" />
                  </button>
                )}

                {/* Search Results Dropdown */}
                {searchResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-b-md shadow-xl overflow-hidden max-h-80 overflow-y-auto z-50 animate-in fade-in slide-in-from-top-1">
                    {searchResults.map((asset) => (
                      <button
                        key={asset.id}
                        onClick={() => handleSearchResultClick(asset)}
                        className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-0 transition-colors flex items-center justify-between group"
                      >
                        <span className="text-sm text-gray-800 font-medium">
                          {asset.name}
                        </span>
                        {asset.market && (
                          <span className="text-[10px] uppercase font-bold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                            {asset.market}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Right: Date, Balance, Avatar */}
        <div className="flex items-center gap-3 lg:gap-4">
          {/* Date - Desktop Only */}
          <div className="hidden lg:flex flex-col items-end mr-2 text-white/80">
            <span className="text-xs font-medium">
              {formatTime(currentTime)}
            </span>
          </div>

          {/* Auth Buttons */}
          {!user && (
            <div className="flex items-center gap-1 sm:gap-2">
              <button
                onClick={() => setShowLoginModal(true)}
                className="px-2 sm:px-3 lg:px-4 py-1 sm:py-1.5 text-[10px] sm:text-xs font-bold text-white bg-[#2e3742] hover:bg-[#3e4856] rounded-[2px] transition-colors uppercase tracking-wide border-b-2 border-black/20"
              >
                Log In
              </button>
              <button
                onClick={() => {
                  setShowLoginModal(false);
                  setShowSignUpModal(true);
                }}
                className="px-2 sm:px-3 lg:px-4 py-1 sm:py-1.5 text-[10px] sm:text-xs font-bold text-white bg-[#2e3742] hover:bg-[#3e4856] rounded-[2px] transition-colors uppercase tracking-wide border-b-2 border-black/20"
              >
                Join Now
              </button>
            </div>
          )}

          {/* Desktop Balance - Only show if user is logged in */}
          {user && !isPasswordRecovery && (
            <div ref={balanceRef} className="hidden lg:relative lg:block">
              <button
                className={`flex items-center gap-2 px-3 py-1.5 rounded bg-[#004225] hover:bg-[#003820] transition-colors border border-[#006035] ${isBalanceOpen ? "bg-[#003820]" : ""
                  }`}
                onClick={(e) => {
                  e.stopPropagation();
                  setIsBalanceOpen(!isBalanceOpen);
                  // ensure the avatar dropdown is closed to avoid overlap
                  setIsAvatarOpen(false);
                }}
              >
                <span className="font-bold text-white text-sm">
                  {balance.toLocaleString("en-US", {
                    style: "currency",
                    currency: "USD",
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
                <ChevronDown
                  className={`h-4 w-4 text-white/70 transition-transform ${isBalanceOpen ? "rotate-180" : ""
                    }`}
                />
              </button>

              {isBalanceOpen && (
                <div className="absolute top-full right-0 mt-1 w-64 bg-gray-800 rounded-lg shadow-xl border border-gray-700 z-[60] py-2 animate-in fade-in slide-in-from-top-2">
                  <div className="px-4 py-2 border-b border-gray-700">
                    <p className="text-xs text-gray-400 uppercase font-semibold">
                      Total Balance
                    </p>
                    <p className="text-xl font-bold text-white">
                      {balance.toLocaleString("en-US", {
                        style: "currency",
                        currency: "USD",
                      })}
                    </p>
                  </div>
                  <div className="px-4 py-2">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-400">Available</span>
                      <span className="font-medium text-gray-200">
                        {available.toLocaleString("en-US", {
                          style: "currency",
                          currency: "USD",
                        })}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Active Assets</span>
                      <span className="font-medium text-gray-200">
                        {reserved.toLocaleString("en-US", {
                          style: "currency",
                          currency: "USD",
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Desktop Avatar Dropdown */}
          {user && !isPasswordRecovery && (
            <div ref={avatarRef} className="hidden lg:relative lg:block">
              <button
                className={`p-2 rounded-full hover:bg-[#004225] text-white/80 hover:text-white transition-colors ${isAvatarOpen ? "bg-[#004225] text-white" : ""
                  }`}
                onClick={(e) => {
                  e.stopPropagation();
                  setIsAvatarOpen(!isAvatarOpen);
                  setIsBalanceOpen(false);
                }}
              >
                <User className="h-5 w-5" />
              </button>

              {isAvatarOpen && (
                <div className="absolute top-full right-0 mt-1 w-56 bg-gray-800 rounded-lg shadow-xl border border-gray-700 z-[60] py-1 animate-in fade-in slide-in-from-top-2">
                  <div className="px-4 py-3 border-b border-gray-700">
                    <p className="text-sm font-bold text-white truncate">
                      {user?.email}
                    </p>
                    <p className="text-xs text-gray-400">
                      Last logged in: Today
                    </p>
                  </div>
                  <div className="py-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsAvatarOpen(false);
                        onOpenSettings?.();
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 text-left"
                    >
                      <Settings className="h-4 w-4" /> Settings
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsAvatarOpen(false);
                        onOpenPortfolio?.();
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 text-left"
                    >
                      <FileText className="h-4 w-4" /> Portfolio
                    </button>
                    <a
                      href="#"
                      className="flex items-center gap-3 px-4 py-2 text-sm text-gray-300 hover:bg-gray-700"
                    >
                      <Shield className="h-4 w-4" /> Rules & Regulations
                    </a>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        signOut();
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-400 hover:bg-gray-700 text-left"
                    >
                      <LogOut className="h-4 w-4" /> Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Mobile: Combined Quick Actions*/}
          {user && !isPasswordRecovery && (
            <div
              ref={mobileQuickRef}
              className="lg:hidden relative flex items-center bg-[#004225] rounded-lg border border-[#006035]/50 shadow-sm"
            >
              {/* Balance Part */}
              <button
                className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-[#005430] transition-colors active:bg-[#003820]"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsBalanceOpen(!isBalanceOpen);
                  setIsAvatarOpen(false);
                }}
              >
                <span className="font-bold text-white text-sm">
                  {balance.toLocaleString("en-US", {
                    style: "currency",
                    currency: "USD",
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
                <ChevronDown
                  className={`h-3 w-3 text-white/70 transition-transform ${isBalanceOpen ? "rotate-180" : ""
                    }`}
                />
              </button>

              {/* Divider */}
              <div className="w-[1px] h-4 bg-[#006035]/50"></div>

              {/* User Icon Part */}
              <button
                className="px-2.5 py-1.5 hover:bg-[#005430] transition-colors active:bg-[#003820]"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsAvatarOpen(!isAvatarOpen);
                  setIsBalanceOpen(false);
                }}
              >
                <User className="h-4 w-4 text-white" />
              </button>

              {/* Mobile Balance Dropdown */}
              {isBalanceOpen && (
                <div className="absolute top-full right-0 mt-1 w-64 bg-gray-800 rounded-lg shadow-xl border border-gray-700 z-[60] py-2 animate-in fade-in slide-in-from-top-2">
                  <div className="px-4 py-2 border-b border-gray-700">
                    <p className="text-xs text-gray-400 uppercase font-semibold">
                      Total Balance
                    </p>
                    <p className="text-xl font-bold text-white">
                      {balance.toLocaleString("en-US", {
                        style: "currency",
                        currency: "USD",
                      })}
                    </p>
                  </div>
                  <div className="px-4 py-2">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-400">Available</span>
                      <span className="font-medium text-gray-200">
                        {available.toLocaleString("en-US", {
                          style: "currency",
                          currency: "USD",
                        })}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Active Assets</span>
                      <span className="font-medium text-gray-200">
                        {reserved.toLocaleString("en-US", {
                          style: "currency",
                          currency: "USD",
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Mobile Avatar Dropdown */}
              {isAvatarOpen && (
                <div className="absolute top-full right-0 mt-1 w-56 bg-gray-800 rounded-lg shadow-xl border border-gray-700 z-[60] py-1 animate-in fade-in slide-in-from-top-2">
                  <div className="px-4 py-3 border-b border-gray-700">
                    <p className="text-sm font-bold text-white truncate">
                      {user?.email}
                    </p>
                    <p className="text-xs text-gray-400">
                      Last logged in: Today
                    </p>
                  </div>
                  <div className="py-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsAvatarOpen(false);
                        onOpenSettings?.();
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 text-left"
                    >
                      <Settings className="h-4 w-4" /> Settings
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsAvatarOpen(false);
                        onOpenPortfolio?.();
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 text-left"
                    >
                      <FileText className="h-4 w-4" /> Portfolio
                    </button>
                    <a
                      href="#"
                      className="flex items-center gap-3 px-4 py-2 text-sm text-gray-300 hover:bg-gray-700"
                    >
                      <Shield className="h-4 w-4" /> Rules & Regulations
                    </a>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        signOut();
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-400 hover:bg-gray-700 text-left"
                    >
                      <LogOut className="h-4 w-4" /> Sign Out
                    </button>
                  </div>
                </div>
              )}
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
        successMessage={
          showPasswordResetSuccess
            ? "Password reset successful! Log in with your new password."
            : undefined
        }
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
        onSuccess={async (
          email: string,
          userId: string,
          formData: SignUpFormData
        ) => {
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
        onEditSuccess={async (
          email: string,
          whatsappPhone: string | undefined,
          formData: SignUpFormData
        ) => {
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
        email={pendingVerification?.email || ""}
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
            const result = await verifyEmailOtp(
              pendingVerification.email,
              code
            );
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
        currentEmail={pendingVerification?.email || ""}
        onSave={async (newEmail) => {
          if (!pendingVerification) return false;
          try {
            const { updateUserProfile } = await import("../lib/api");
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
        whatsappPhone={pendingVerification?.whatsappPhone || ""}
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
            email: pendingVerification?.email || "",
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
