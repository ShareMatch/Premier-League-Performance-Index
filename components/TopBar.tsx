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
  HelpCircle,
} from "lucide-react";
import { formatCurrency } from "../utils/currencyUtils";
import type { Wallet as WalletType, Team, League } from "../types";
import { supabase } from "../lib/supabase";
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
import HowItWorksModal from "./HowItWorksModal";
import { marketInfoData } from "../lib/marketInfo";

interface TopBarProps {
  wallet: WalletType | null;
  portfolioValue?: number;
  onMobileMenuClick: () => void;
  activeLeague?: League;
  onNavigate?: (league: League) => void;
  allAssets?: Team[];
  onOpenSettings?: () => void;
  onOpenPortfolio?: () => void;
  onViewAsset?: (asset: Team) => void;
  // External triggers for opening auth modals (from HelpCenterModal)
  triggerLoginModal?: boolean;
  onTriggerLoginHandled?: () => void;
  triggerSignUpModal?: boolean;
  onTriggerSignUpHandled?: () => void;
  onHelpCenterClick?: () => void;
  activeHoverMenu?: string | null;
  setActiveHoverMenu?: (menuId: string | null) => void;
  /** True while user data (wallet, portfolio) is still loading */
  isUserDataLoading?: boolean;
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
  onViewAsset,
  triggerLoginModal,
  onTriggerLoginHandled,
  triggerSignUpModal,
  onTriggerSignUpHandled,
  onHelpCenterClick,
  activeHoverMenu: propsActiveHoverMenu,
  setActiveHoverMenu: propsSetActiveHoverMenu,
  isUserDataLoading = false,
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
  const [showHowItWorks, setShowHowItWorks] = useState(false);

  // Use props for activeHoverMenu if provided, otherwise fallback to internal state (for safety)
  const [internalActiveHoverMenu, setInternalActiveHoverMenu] = useState<string | null>(null);
  const activeHoverMenu = propsActiveHoverMenu !== undefined ? propsActiveHoverMenu : internalActiveHoverMenu;
  const setActiveHoverMenu = propsSetActiveHoverMenu || setInternalActiveHoverMenu;

  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = (menuId: string) => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    setActiveHoverMenu(menuId);
  };

  const handleMouseLeave = () => {
    hoverTimeoutRef.current = setTimeout(() => {
      setActiveHoverMenu(null);
    }, 150);
  };

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

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const action = urlParams.get("action");

    if (action === "login" && !user) {
      setShowLoginModal(true);
      // Clean up URL
      window.history.replaceState({}, "", window.location.pathname);
    } else if (action === "signup" && !user) {
      setShowSignUpModal(true);
      // Clean up URL
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  // Search Logic
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setSearchResults([]);
      return;
    }

    const query = searchQuery.toLowerCase();
    const results = allAssets
      .filter((asset) => {
        // Filter by search query
        if (!asset.name.toLowerCase().includes(query)) return false;
        
        // Filter out settled assets
        if (asset.is_settled) return false;
        
        // Only show assets from markets that are explicitly open
        const marketInfo = marketInfoData[asset.market || ""];
        if (!marketInfo || !marketInfo.isOpen) return false;
        
        return true;
      })
      .slice(0, 10); // Limit to 10 results

    setSearchResults(results);
  }, [searchQuery, allAssets]);

  const handleSearchResultClick = (asset: Team) => {
    if (onViewAsset) {
      onViewAsset(asset);
      setSearchQuery("");
      setSearchResults([]);
    } else if (asset.market && onNavigate) {
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

  // Handle external triggers for opening auth modals (from HelpCenterModal via App.tsx)
  useEffect(() => {
    if (triggerLoginModal) {
      setShowLoginModal(true);
      onTriggerLoginHandled?.();
    }
  }, [triggerLoginModal, onTriggerLoginHandled]);

  useEffect(() => {
    if (triggerSignUpModal) {
      setShowSignUpModal(true);
      onTriggerSignUpHandled?.();
    }
  }, [triggerSignUpModal, onTriggerSignUpHandled]);

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
          window.location.pathname + window.location.search,
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

  // Determine if we should show skeleton (user logged in but data not loaded yet)
  const showSkeleton = user && !isPasswordRecovery && (isUserDataLoading || wallet === null);

  // Skeleton Components - Full box skeletons (matching actual component colors)
  const SearchBarSkeleton = () => (
    <div className="w-full h-[34px] bg-black/20 rounded-lg animate-pulse" />
  );

  const BalanceButtonSkeleton = () => (
    <div className="h-[34px] w-24 bg-[#004225] border border-[#006035] rounded animate-pulse" />
  );

  const AvatarButtonSkeleton = () => (
    <div className="h-9 w-9 bg-[#004225] rounded-full animate-pulse" />
  );

  const MobileQuickActionsSkeleton = () => (
    <div className="h-[34px] w-28 bg-[#004225] border border-[#006035]/50 rounded-lg animate-pulse" />
  );

  return (
    <>
      <div
        data-testid="top-bar"
        className="h-14 lg:h-20 bg-[#005430] border-b border-[#004225] flex items-center justify-between px-3 lg:px-6 flex-shrink-0 transition-colors z-50 relative shadow-sm"
      >
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
                aria-label="Clear search query"
                data-testid="topbar-clear-search-mobile"
                className="text-gray-400"
              >
                <X className="h-5 w-5" />
              </button>
            ) : (
              <button
                onClick={startListening}
                aria-label={
                  isListening ? "Stop voice search" : "Start voice search"
                }
                data-testid="topbar-voice-search-mobile"
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
                data-testid="mobile-menu-button"
              >
                <Menu className="h-6 w-6" />
              </button>

              {/* Logo - Always visible now */}
              <img
                src="/logos/mobile-header-logo-matched.svg"
                alt="ShareMatch"
                className="h-8 lg:h-16 w-auto object-contain"
              />
              {!user && (
                <div
                  className="hidden lg:flex items-center gap-4 h-full"
                  onMouseLeave={handleMouseLeave}
                >
                  <div className="relative h-full flex items-center">
                    <button
                      onMouseEnter={() => handleMouseEnter("who-we-are")}
                      className={`
        px-[clamp(0.75rem,2vw,1.5rem)]
    py-[clamp(0.25rem,1vw,0.5rem)]
    text-[clamp(0.625rem,1vw,0.75rem)]
    rounded-full
    text-white
    font-semibold
    bg-transparent
    tracking-wide
    transition-colors
    duration-200
        ${activeHoverMenu === "who-we-are"
                          ? "text-white bg-white/10"
                          : "text-gray-200 bg-transparent hover:bg-white/10 hover:text-white"}
      `}
                      data-testid="topbar-who-we-are"
                    >
                      About Us
                    </button>
                  </div>

                  <div className="relative h-full flex items-center">
                    <button
                      onMouseEnter={() => handleMouseEnter("how-it-works")}
                      className={`
        px-[clamp(0.75rem,2vw,1.5rem)]
    py-[clamp(0.25rem,1vw,0.5rem)]
    text-[clamp(0.625rem,1vw,0.75rem)]
    rounded-full
    text-white
    font-semibold
    bg-transparent
    tracking-wide
    transition-colors
    duration-200
        ${activeHoverMenu === "how-it-works"
                          ? "text-white bg-white/10"
                          : "text-gray-200 bg-transparent hover:bg-white/10 hover:text-white"}
      `}
                      data-testid="topbar-how-it-works"
                    >
                      What We Offer
                    </button>
                  </div>

                  <div className="relative h-full flex items-center">
                    <button
                      onMouseEnter={() => handleMouseEnter("shariah")}
                      className={`
        px-[clamp(0.75rem,2vw,1.5rem)]
    py-[clamp(0.25rem,1vw,0.5rem)]
    text-[clamp(0.625rem,1vw,0.75rem)]
    rounded-full
    text-white
    font-semibold
    bg-transparent
    tracking-wide
    transition-colors
    duration-200
        ${activeHoverMenu === "shariah"
                          ? "text-white bg-white/10"
                          : "text-gray-200 bg-transparent hover:bg-white/10 hover:text-white"}
      `}
                      data-testid="topbar-shariah"
                    >
                      Shariah Compliant
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* Desktop Search - Center (Only for logged in) */}
        {user && !isPasswordRecovery && (
          <div className="hidden lg:flex flex-1 max-w-md mx-8 relative">
            {showSkeleton ? (
              <SearchBarSkeleton />
            ) : (
              <div className="relative w-full group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40 group-focus-within:text-white" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search..."
                  className="w-full bg-black/20 border-none rounded-lg py-1.5 pl-10 pr-10 text-sm text-white placeholder-white/40 focus:outline-none focus:ring-1 focus:ring-white/20 transition-all font-medium"
                />
                {/* Desktop Clear/Mic Actions */}
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                  {searchQuery ? (
                    <button
                      onClick={() => setSearchQuery("")}
                      aria-label="Clear search"
                      className="text-white/40 hover:text-white transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  ) : (
                    <button
                      onClick={startListening}
                      aria-label={isListening ? "Stop voice search" : "Start voice search"}
                      className={`transition-colors ${isListening ? "text-red-500 animate-pulse" : "text-white/40 hover:text-white"}`}
                    >
                      <Mic className="h-4 w-4" />
                    </button>
                  )}
                </div>
                {/* Search Results Dropdown - Desktop */}
                {searchResults.length > 0 && searchQuery && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-gray-900 border border-gray-700 rounded-lg shadow-2xl overflow-hidden z-[60] animate-in fade-in slide-in-from-top-2">
                    {searchResults.map((asset) => (
                      <button
                        key={asset.id}
                        onClick={() => handleSearchResultClick(asset)}
                        className="w-full text-left px-4 py-3 border-b border-gray-800 last:border-0 flex items-center justify-between hover:bg-gray-800 transition-colors"
                      >
                        <div className="flex flex-col">
                          <span className="text-white font-bold text-sm">{asset.name}</span>
                          <span className="text-xs text-gray-400 font-medium">
                            {asset.market || "Market"} Index
                          </span>
                        </div>
                        <span className="text-[9px] bg-[#005430] text-white px-2 py-0.5 rounded font-bold uppercase tracking-widest">
                          View
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Right: Date, Balance, Avatar */}
        <div className="flex items-center gap-1">
          {/* Mobile Search Button - Only for logged in */}
          {user && (
            <button
              onClick={() => setIsMobileSearchOpen(true)}
              className="lg:hidden p-2 text-white/80 hover:text-white transition-colors"
              aria-label="Open search"
            >
              <Search className="h-5 w-5" />
            </button>
          )}

          {/* Date - Desktop Only */}
          {/* <div className="hidden lg:flex flex-col items-end mr-2 text-white/80">
            <span className="text-xs font-medium">
              {formatTime(currentTime)}
            </span>
          </div> */}

          {/* Auth Buttons */}
          {!user && (
            <div className="flex items-center gap-3 sm:gap-3">
              {onHelpCenterClick && (
                <button
                  onClick={onHelpCenterClick}
                  aria-label="Help Center"
                  className="text-white/70 hover:text-white transition-colors flex-shrink-0"
                  data-testid="topbar-help-center"
                >
                  <HelpCircle className="w-[clamp(0.9rem,2.5vw,1.4rem)] h-[clamp(0.9rem,2.5vw,1.4rem)] transition-colors" />
                </button>
              )}
              <button
                onClick={() => setShowLoginModal(true)}
                className="
    px-[clamp(0.75rem,2vw,1.5rem)]
    py-[clamp(0.25rem,1vw,0.5rem)]
    text-[clamp(0.625rem,1vw,0.75rem)]
    rounded-full
    text-white
    font-semibold
    bg-transparent
    tracking-wide
    transition-colors
    duration-200
    bg-white/10
  "
                data-testid="topbar-login-button"
              >
                Log In
              </button>

              <button
                onClick={() => {
                  setShowLoginModal(false);
                  setShowSignUpModal(true);
                }}
                className="
    px-[clamp(0.75rem,2vw,1.5rem)]
    py-[clamp(0.25rem,1vw,0.5rem)]
    text-[clamp(0.625rem,1vw,0.75rem)]
    font-semibold
    text-white
    bg-brand-whiteButtonBg
    rounded-full
    tracking-wide
    shadow-md
    transition-none
    border-none
  "
                data-testid="topbar-signup-button"
              >
                Join Now
              </button>

            </div>
          )}

          {/* Desktop Balance - Only show if user is logged in */}
          {user && !isPasswordRecovery && (
            <div ref={balanceRef} className="hidden lg:flex lg:items-center lg:gap-3 lg:relative">
              {onHelpCenterClick && (
                <button
                  onClick={onHelpCenterClick}
                  aria-label="Help Center"
                  className="text-white/70 hover:text-white transition-colors flex-shrink-0 mr-1"
                  data-testid="topbar-help-center"
                >
                  <HelpCircle className="w-[clamp(1.25rem,2.5vw,1.5rem)] h-[clamp(1.25rem,2.5vw,1.5rem)] transition-colors" />
                </button>
              )}
              {showSkeleton ? (
                <BalanceButtonSkeleton />
              ) : (
                <>
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
                      {formatCurrency(balance)}
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
                          {formatCurrency(balance)}
                        </p>
                      </div>
                      <div className="px-4 py-2">
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-400">Available</span>
                          <span className="font-medium text-gray-200">
                            {formatCurrency(available)}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Active Assets</span>
                          <span className="font-medium text-gray-200">
                            {formatCurrency(portfolioValue)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Desktop Avatar Dropdown */}
          {user && !isPasswordRecovery && (
            <div ref={avatarRef} className="hidden lg:relative lg:block">
              {showSkeleton ? (
                <AvatarButtonSkeleton />
              ) : (
                <>
                  <button
                    aria-label="Open user menu"
                    data-testid="topbar-user-avatar-desktop"
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
                            onOpenPortfolio?.();
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 text-left"
                        >
                          <FileText className="h-4 w-4" /> Portfolio
                        </button>
                        {/* <a
                          href="#"
                          className="flex items-center gap-3 px-4 py-2 text-sm text-gray-300 hover:bg-gray-700"
                        >
                          <Shield className="h-4 w-4" /> Rules & Regulations
                        </a> */}
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
                            signOut();
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-400 hover:bg-gray-700 text-left"
                          data-testid="user-menu-signout"
                        >
                          <LogOut className="h-4 w-4" /> Sign Out
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Mobile: Combined Quick Actions*/}
          {user && !isPasswordRecovery && (
            showSkeleton ? (
              <div className="lg:hidden">
                <MobileQuickActionsSkeleton />
              </div>
            ) : (
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
                    {formatCurrency(balance)}
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
                  aria-label="Open user menu"
                  data-testid="topbar-user-avatar-mobile"
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
                        {formatCurrency(balance)}
                      </p>
                    </div>
                    <div className="px-4 py-2">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-400">Available</span>
                        <span className="font-medium text-gray-200">
                          {formatCurrency(available)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Active Assets</span>
                        <span className="font-medium text-gray-200">
                          {formatCurrency(portfolioValue)}
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
                          onOpenPortfolio?.();
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 text-left"
                      >
                        <FileText className="h-4 w-4" /> Portfolio
                      </button>
                      {/* <a
                        href="#"
                        className="flex items-center gap-3 px-4 py-2 text-sm text-gray-300 hover:bg-gray-700"
                      >
                        <Shield className="h-4 w-4" /> Rules & Regulations
                      </a> */}
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
                          onHelpCenterClick?.();
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 text-left"
                      >
                        <HelpCircle className="h-4 w-4" /> Help
                      </button>
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
            )
          )}
        </div>
      </div>

      {/* Mobile Navigation Row moved to App.tsx to make it not sticky */}

      <div
        className={`fixed inset-0 z-[48] bg-black/40 backdrop-blur-sm transition-opacity duration-500 ${activeHoverMenu ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
        onClick={() => setActiveHoverMenu(null)}
        aria-hidden="true"
      />

      <div
        className={`fixed left-0 right-0 z-[49] bg-[#005430]/30 backdrop-blur-xl border-b border-white/10 transition-all duration-500 overflow-hidden ${activeHoverMenu ? "max-h-[600px] opacity-100 translate-y-0" : "max-h-0 opacity-0 -translate-y-4 pointer-events-none"
          } top-14 lg:top-20`}
        onMouseEnter={() => activeHoverMenu && handleMouseEnter(activeHoverMenu)}
        onMouseLeave={handleMouseLeave}
      >
        <div className="px-6 sm:px-12 lg:px-[clamp(4rem,11vw,20rem)] py-8 sm:py-12">
          {activeHoverMenu === "how-it-works" && (
            <div className="flex animate-in fade-in slide-in-from-top-4 duration-500">
              <div className="flex-1 max-w-2xl">
                <h3 className="text-[10px] font-semibold text-white/50 uppercase tracking-widest mb-4 sm:mb-6">What We Offer</h3>
                <p className="text-white font-semibold text-xl sm:text-2xl mb-4 leading-tight">Unique Seasonal Performance Tokens</p>
                <p className="text-gray-300 text-sm sm:text-lg leading-relaxed">
                  We offer unique Seasonal Performance Tokens for top-tier leagues like EPL, NBA, and F1. Trade these tokens in real-time as performance indexes shift based on real-world outcomes, giving you a chance to capitalize on your expertise.
                </p>
              </div>
            </div>
          )}

          {activeHoverMenu === "who-we-are" && (
            <div className="flex animate-in fade-in slide-in-from-top-4 duration-500">
              <div className="flex-1 max-w-2xl">
                <h3 className="text-[10px] font-semibold text-white/50 uppercase tracking-widest mb-4 sm:mb-6">About Us</h3>
                <p className="text-white font-semibold text-xl sm:text-2xl mb-4 leading-tight">A Cutting-edge Performance Market</p>
                <p className="text-gray-300 text-sm sm:text-lg leading-relaxed">
                  ShareMatch is a cutting-edge digital performance index market. We create a dynamic environment where sports knowledge meets technical analysis, allowing you to engage with the performance of your favorite teams and athletes globally.
                </p>
              </div>
            </div>
          )}

          {activeHoverMenu === "shariah" && (
            <div className="flex animate-in fade-in slide-in-from-top-4 duration-500">
              <div className="flex-1 max-w-2xl">
                <h3 className="text-[10px] font-semibold text-white/50 uppercase tracking-widest mb-4 sm:mb-6">Shariah Compliant</h3>
                <p className="text-white font-semibold text-xl sm:text-2xl mb-4 leading-tight">Built on Ethics & Transparency</p>
                <p className="text-gray-300 text-sm sm:text-lg leading-relaxed">
                  Sustainability and ethics are at our core. Our platform is built on transparency and fairness, utilizing real market data to ensure a non-speculative, skill-based experience that strictly adheres to Shariah compliance guidelines.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Terms & Risk Modals */}
      <HowItWorksModal
        isOpen={showHowItWorks}
        onClose={() => setShowHowItWorks(false)}
      />

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
          formData: SignUpFormData,
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
          formData: SignUpFormData,
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
              code,
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
        onClose={async () => {
          // Sign out to prevent auto-login when closing without resetting password
          await supabase.auth.signOut();
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
