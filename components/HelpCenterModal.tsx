import React, { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  X,
  ChevronRight,
  HelpCircle,
  LogIn,
  UserPlus,
  ShieldCheck,
  Loader2,
  Settings,
  ArrowUp,
  ArrowDown,
  Globe,
  KeyRound,
  UserCog,
  Mail,
  TrendingUp,
} from "lucide-react";
import {
  GiSoccerBall,
  GiBasketballBall,
  GiAmericanFootballBall,
  GiCricketBat,
  GiTrophy,
  GiFullMotorcycleHelmet,
} from "react-icons/gi";

// Supabase Edge Function URL for fetching video signed URLs
const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL ||
  "https://lbmixnhxerrmecfxdfkx.supabase.co";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

// Translation strings
const TRANSLATIONS = {
  en: {
    helpCenter: "Help Center",
    videoTutorials: "Video tutorials to get you started",
    onboarding: "User Onboarding",
    onboardingDesc: "Get started with ShareMatch",
    customerSettings: "User Settings",
    customerSettingsDesc: "Manage your account and preferences",
    tradingIndexes: "Trading & Indices",
    tradingIndexesDesc: "Learn how to trade and explore our indices",
    howToLogin: "How to Login",
    howToLoginDesc:
      "Step-by-step guide to logging into your ShareMatch account",
    howToSignUp: "How to Sign Up",
    howToSignUpDesc: "Create your ShareMatch account in a few easy steps",
    kycVerification: "KYC Verification",
    kycVerificationDesc:
      "Complete your identity verification to unlock all features",
    howToResetPassword: "How to Reset Password",
    howToResetPasswordDesc: "Easily reset your password if you've forgotten it",
    howToUpdateUserDetails: "How to Update User Details",
    howToUpdateUserDetailsDesc:
      "Learn how to update your user details on ShareMatch",
    howToEditMarketingPreferences: "How to Edit Marketing Preferences",
    howToEditMarketingPreferencesDesc:
      "Learn how to edit your marketing preferences on ShareMatch",
    howToChangePassword: "How to Change Password",
    howToChangePasswordDesc: "Learn how to change your password on ShareMatch",
    howToBuyAssets: "How to Buy Assets",
    howToBuyAssetsDesc: "Learn how to purchase assets on ShareMatch",
    howToSellAssets: "How to Sell Assets",
    howToSellAssetsDesc: "Learn how to sell assets on ShareMatch",
    eplIndex: "EPL Index",
    eplIndexDesc: "Learn about the English Premier League Index",
    splIndex: "SPL Index",
    splIndexDesc: "Learn about the Saudi Pro League Index",
    uefaIndex: "UEFA Champions League Index",
    uefaIndexDesc: "Learn about the UEFA Champions League Index",
    fifaIndex: "FIFA World Cup Index",
    fifaIndexDesc: "Learn about the FIFA World Cup Index",
    islIndex: "ISL Index",
    islIndexDesc: "Learn about the Indonesia Super League Index",
    f1Index: "F1 Index",
    f1IndexDesc: "Learn about the F1 Index",
    nbaIndex: "NBA Index",
    nbaIndexDesc: "Learn about the NBA Index",
    nflIndex: "NFL Index",
    nflIndexDesc: "Learn about the NFL Index",
    t20Index: "T20 Cricket Index",
    t20IndexDesc: "Learn about the T20 Cricket Index",
    unableToLoadVideo: "Unable to load video",
    tryAgain: "Try again",
    readyToLogin: "Ready to",
    readyToSignUp: "Ready to",
    readyToVerify: "Ready to",
    login: "login",
    signUp: "sign up",
    verify: "verify",
  },
  ar: {
    helpCenter: "مركز المساعدة",
    videoTutorials: "دروس فيديو لمساعدتك على البدء",
    onboarding: "التسجيل",
    onboardingDesc: "ابدأ مع ShareMatch",
    customerSettings: "إعدادات العميل",
    customerSettingsDesc: "إدارة حسابك وتفضيلاتك",
    tradingIndexes: "التداول والمؤشرات",
    tradingIndexesDesc: "تعلم كيفية التداول واستكشاف مؤشراتنا",
    howToLogin: "كيفية تسجيل الدخول",
    howToLoginDesc:
      "دليل خطوة بخطوة لتسجيل الدخول إلى حساب ShareMatch الخاص بك",
    howToSignUp: "كيفية التسجيل",
    howToSignUpDesc: "إنشاء حساب ShareMatch الخاص بك في خطوات سهلة",
    kycVerification: "التحقق من الهوية",
    kycVerificationDesc: "أكمل التحقق من هويتك لفتح جميع الميزات",
    howToResetPassword: "كيفية إعادة تعيين كلمة المرور",
    howToResetPasswordDesc:
      "إعادة تعيين كلمة المرور الخاصة بك بسهولة إذا نسيتها",
    howToUpdateUserDetails: "كيفية تحديث تفاصيل المستخدم",
    howToUpdateUserDetailsDesc:
      "تعلم كيفية تحديث تفاصيل المستخدم الخاصة بك على ShareMatch",
    howToEditMarketingPreferences: "كيفية تعديل تفضيلات التسويق",
    howToEditMarketingPreferencesDesc:
      "تعلم كيفية تعديل تفضيلات التسويق الخاصة بك على ShareMatch",
    howToChangePassword: "كيفية تغيير كلمة المرور",
    howToChangePasswordDesc:
      "تعلم كيفية تغيير كلمة المرور الخاصة بك على ShareMatch",
    howToBuyAssets: "كيفية شراء الأصول",
    howToBuyAssetsDesc: "تعلم كيفية شراء الأصول على ShareMatch",
    howToSellAssets: "كيفية بيع الأصول",
    howToSellAssetsDesc: "تعلم كيفية بيع الأصول على ShareMatch",
    eplIndex: "مؤشر الدوري الإنجليزي الممتاز",
    eplIndexDesc: "تعرف على مؤشر الدوري الإنجليزي الممتاز",
    splIndex: "مؤشر دوري روشن السعودي",
    splIndexDesc: "تعرف على مؤشر دوري روشن السعودي",
    uefaIndex: "مؤشر دوري أبطال أوروبا",
    uefaIndexDesc: "تعرف على مؤشر دوري أبطال أوروبا",
    fifaIndex: "مؤشر كأس العالم",
    fifaIndexDesc: "تعرف على مؤشر كأس العالم",
    islIndex: "مؤشر الدوري الإندونيسي",
    islIndexDesc: "تعرف على مؤشر الدوري الإندونيسي الممتاز",
    f1Index: "مؤشر الفورمولا 1",
    f1IndexDesc: "تعرف على مؤشر الفورمولا 1",
    nbaIndex: "مؤشر NBA",
    nbaIndexDesc: "تعرف على مؤشر NBA",
    nflIndex: "مؤشر NFL",
    nflIndexDesc: "تعرف على مؤشر NFL",
    t20Index: "مؤشر كريكيت T20",
    t20IndexDesc: "تعرف على مؤشر كريكيت T20",
    unableToLoadVideo: "تعذر تحميل الفيديو",
    tryAgain: "حاول مرة أخرى",
    readyToLogin: "هل أنت مستعد",
    readyToSignUp: "هل أنت مستعد",
    readyToVerify: "هل أنت مستعد",
    login: "لتسجيل الدخول",
    signUp: "للتسجيل",
    verify: "للتحقق",
  },
};

const HELP_TOPICS = {
  signup: {
    titleKey: "howToSignUp",
    descriptionKey: "howToSignUpDesc",
    icon: <UserPlus className="w-4 h-4 sm:w-5 sm:h-5 text-brand-primary" />,
    videoEn: "Streamline Signup Process With Sharematch Product Demo.mp4",
    videoAr: "Arabic Streamline Signup Process With Sharematch Product Demo.mp4", // Add your Arabic video filename
    section: "onboarding" as const,
  },
  login: {
    titleKey: "howToLogin",
    descriptionKey: "howToLoginDesc",
    icon: <LogIn className="w-4 h-4 sm:w-5 sm:h-5 text-brand-primary" />,
    videoEn: "Streamline Login Process With Sharematch.mp4",
    videoAr: "Arabic Streamline Login Process With Sharematch.mp4", // Add your Arabic video filename
    section: "onboarding" as const,
  },
  kyc: {
    titleKey: "kycVerification",
    descriptionKey: "kycVerificationDesc",
    icon: <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5 text-brand-primary" />,
    videoEn: "Streamline KYC Verification With Sharematch Demo.mp4",
    videoAr: "Arabic Streamline KYC Verification With Sharematch Demo.mp4", // Add your Arabic video filename
    section: "onboarding" as const,
  },
  forgotPassword: {
    titleKey: "howToResetPassword",
    descriptionKey: "howToResetPasswordDesc",
    icon: <KeyRound className="w-4 h-4 sm:w-5 sm:h-5 text-brand-primary" />,
    videoEn: "forgot password.mp4",
    videoAr: "Arabic forgot password.mp4", // Add your Arabic video filename
    section: "onboarding" as const,
  },
  updateUserDetails: {
    titleKey: "howToUpdateUserDetails",
    descriptionKey: "howToUpdateUserDetailsDesc",
    icon: <UserCog className="w-4 h-4 sm:w-5 sm:h-5 text-brand-primary" />,
    videoEn: "How to update user details.mp4",
    videoAr: "Arabic How to update user details.mp4", // Add your Arabic video filename
    section: "customer" as const,
  },
  editMarketingPreferences: {
    titleKey: "howToEditMarketingPreferences",
    descriptionKey: "howToEditMarketingPreferencesDesc",
    icon: <Mail className="w-4 h-4 sm:w-5 sm:h-5 text-brand-primary" />,
    videoEn: "how to edit marketing preferences.mp4",
    videoAr: "Arabic how to edit marketing preferences.mp4", // Add your Arabic video filename
    section: "customer" as const,
  },
  changePassword: {
    titleKey: "howToChangePassword",
    descriptionKey: "howToChangePasswordDesc",
    icon: <KeyRound className="w-4 h-4 sm:w-5 sm:h-5 text-brand-primary" />,
    videoEn: "how to change password.mp4",
    videoAr: "Arabic how to change password.mp4", // Add your Arabic video filename
    section: "customer" as const,
  },
  buyAssets: {
    titleKey: "howToBuyAssets",
    descriptionKey: "howToBuyAssetsDesc",
    icon: <ArrowUp className="w-4 h-4 sm:w-5 sm:h-5 text-brand-primary" />,
    videoEn: "How to buy.mp4",
    videoAr: "Arabic How to buy.mp4", // Add your Arabic video filename
    section: "trading" as const,
  },
  sellAssets: {
    titleKey: "howToSellAssets",
    descriptionKey: "howToSellAssetsDesc",
    icon: <ArrowDown className="w-4 h-4 sm:w-5 sm:h-5 text-brand-primary" />,
    videoEn: "How to sell.mp4",
    videoAr: "Arabic How to sell.mp4", // Add your Arabic video filename
    section: "trading" as const,
  },
  eplIndex: {
    titleKey: "eplIndex",
    descriptionKey: "eplIndexDesc",
    icon: <GiSoccerBall className="w-4 h-4 sm:w-5 sm:h-5 text-brand-primary" />,
    videoEn: "English epl.mp4",
    videoAr: "Arabic epl.mp4", // Add your Arabic video filename
    section: "trading" as const,
  },
  splIndex: {
    titleKey: "splIndex",
    descriptionKey: "splIndexDesc",
    icon: <GiSoccerBall className="w-4 h-4 sm:w-5 sm:h-5 text-brand-primary" />,
    videoEn: "English SPL.mp4",
    videoAr: "Arabic SPL.mp4", // Add your Arabic video filename
    section: "trading" as const,
  },
  uefaIndex: {
    titleKey: "uefaIndex",
    descriptionKey: "uefaIndexDesc",
    icon: <GiSoccerBall className="w-4 h-4 sm:w-5 sm:h-5 text-brand-primary" />,
    videoEn: "English UEFA.mp4",
    videoAr: "Arabic UEFA.mp4", // Add your Arabic video filename
    section: "trading" as const,
  },
  fifaIndex: {
    titleKey: "fifaIndex",
    descriptionKey: "fifaIndexDesc",
    icon: <GiTrophy className="w-4 h-4 sm:w-5 sm:h-5 text-brand-primary" />,
    videoEn: "English FIFA World Cup.mp4",
    videoAr: "Arabic FIFA World Cup.mp4", // Add your Arabic video filename
    section: "trading" as const,
  },
  islIndex: {
    titleKey: "islIndex",
    descriptionKey: "islIndexDesc",
    icon: <GiSoccerBall className="w-4 h-4 sm:w-5 sm:h-5 text-brand-primary" />,
    videoEn: "English Indonesia Super League.mp4",
    videoAr: "Arabic Indonesia Super League.mp4", // Add your Arabic video filename
    section: "trading" as const,
  },
  f1Index: {
    titleKey: "f1Index",
    descriptionKey: "f1IndexDesc",
    icon: <GiFullMotorcycleHelmet className="w-4 h-4 sm:w-5 sm:h-5 text-brand-primary" />,
    videoEn: "English Formula 1.mp4",
    videoAr: "Arabic Formula 1.mp4", // Add your Arabic video filename
    section: "trading" as const,
  },
  nbaIndex: {
    titleKey: "nbaIndex",
    descriptionKey: "nbaIndexDesc",
    icon: <GiBasketballBall className="w-4 h-4 sm:w-5 sm:h-5 text-brand-primary" />,
    videoEn: "English NBA Market.mp4",
    videoAr: "Arabic NBA Market.mp4", // Add your Arabic video filename
    section: "trading" as const,
  },
  nflIndex: {
    titleKey: "nflIndex",
    descriptionKey: "nflIndexDesc",
    icon: <GiAmericanFootballBall className="w-4 h-4 sm:w-5 sm:h-5 text-brand-primary" />,
    videoEn: "English NFL.mp4",
    videoAr: "Arabic NFL.mp4", // Add your Arabic video filename
    section: "trading" as const,
  },
  t20Index: {
    titleKey: "t20Index",
    descriptionKey: "t20IndexDesc",
    icon: <GiCricketBat className="w-4 h-4 sm:w-5 sm:h-5 text-brand-primary" />,
    videoEn: "English T20 World Cup.mp4",
    videoAr: "Arabic T20 World Cup.mp4", // Add your Arabic video filename
    section: "trading" as const,
  },
} as const;

const SECTIONS = {
  onboarding: {
    titleKey: "onboarding",
    descriptionKey: "onboardingDesc",
    icon: <UserPlus className="w-5 h-5 sm:w-6 sm:h-6 text-brand-primary" />,
  },
  customer: {
    titleKey: "customerSettings",
    descriptionKey: "customerSettingsDesc",
    icon: <Settings className="w-5 h-5 sm:w-6 sm:h-6 text-brand-primary" />,
  },
  trading: {
    titleKey: "tradingIndexes",
    descriptionKey: "tradingIndexesDesc",
    icon: <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-brand-primary" />,
  },
} as const;

type HelpTopicId = keyof typeof HELP_TOPICS;
type SectionId = keyof typeof SECTIONS;
type Language = "en" | "ar";

interface HelpCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  isLoggedIn?: boolean;
  onOpenLogin?: () => void;
  onOpenSignUp?: () => void;
  onOpenKYC?: () => void;
  defaultExpandedTopic?: HelpTopicId;
}

const HelpCenterModal: React.FC<HelpCenterModalProps> = ({
  isOpen,
  onClose,
  isLoggedIn = false,
  onOpenLogin,
  onOpenSignUp,
  onOpenKYC,
  defaultExpandedTopic,
}) => {
  const [language, setLanguage] = useState<Language>("en");
  const [expandedSections, setExpandedSections] = useState<Set<SectionId>>(
    new Set()
  );
  const [expandedTopics, setExpandedTopics] = useState<Set<HelpTopicId>>(
    new Set()
  );
  const [videoUrls, setVideoUrls] = useState<Partial<Record<string, string>>>(
    {}
  );
  const [loadingVideos, setLoadingVideos] = useState<Set<HelpTopicId>>(
    new Set()
  );
  const [videoErrors, setVideoErrors] = useState<
    Partial<Record<HelpTopicId, string>>
  >({});

  const t = TRANSLATIONS[language];
  const isRTL = language === "ar";

  // Fetch signed URL from Edge Function
  const fetchVideoUrl = useCallback(
    async (topicId: HelpTopicId, lang: Language) => {
      const topic = HELP_TOPICS[topicId];
      const videoName = lang === "en" ? topic.videoEn : topic.videoAr;
      const cacheKey = `${topicId}-${lang}`;

      if (!videoName || videoUrls[cacheKey]) return;

      setLoadingVideos((prev) => new Set(prev).add(topicId));
      setVideoErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[topicId];
        return newErrors;
      });

      try {
        const response = await fetch(
          `${SUPABASE_URL}/functions/v1/getVideo?name=${encodeURIComponent(
            videoName
          )}`,
          {
            headers: {
              Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch video URL: ${response.status}`);
        }

        const data = await response.json();

        if (data.ok && data.url) {
          setVideoUrls((prev) => ({ ...prev, [cacheKey]: data.url }));
        } else {
          throw new Error(data.error || "Failed to get video URL");
        }
      } catch (error) {
        console.error(`Error fetching video for ${topicId}:`, error);
        setVideoErrors((prev) => ({
          ...prev,
          [topicId]:
            error instanceof Error ? error.message : "Failed to load video",
        }));
      } finally {
        setLoadingVideos((prev) => {
          const newSet = new Set(prev);
          newSet.delete(topicId);
          return newSet;
        });
      }
    },
    [videoUrls]
  );

  // Auto-expand section and topic when modal opens with default
  useEffect(() => {
    if (isOpen && defaultExpandedTopic) {
      const section = HELP_TOPICS[defaultExpandedTopic].section;
      setExpandedSections(new Set([section]));
      setExpandedTopics(new Set([defaultExpandedTopic]));
      fetchVideoUrl(defaultExpandedTopic, language);
    } else if (!isOpen) {
      setExpandedSections(new Set());
      setExpandedTopics(new Set());
    }
  }, [isOpen, defaultExpandedTopic, language, fetchVideoUrl]);

  // Refetch videos when language changes for already expanded topics
  useEffect(() => {
    expandedTopics.forEach((topicId) => {
      fetchVideoUrl(topicId, language);
    });
  }, [language, expandedTopics, fetchVideoUrl]);

  // Get topics for a specific section
  const getTopicsForSection = (sectionId: SectionId): HelpTopicId[] => {
    return (Object.keys(HELP_TOPICS) as HelpTopicId[]).filter(
      (key) => HELP_TOPICS[key].section === sectionId
    );
  };

  // Filter sections based on login state
  const visibleSections: SectionId[] = isLoggedIn
    ? ["onboarding", "customer", "trading"]
    : ["onboarding"];

  const toggleSectionExpanded = (sectionId: SectionId) => {
    setExpandedSections((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.clear();
        newSet.add(sectionId);
      }
      return newSet;
    });
  };

  const toggleTopicExpanded = (topicId: HelpTopicId) => {
    setExpandedTopics((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(topicId)) {
        newSet.delete(topicId);
      } else {
        newSet.add(topicId);
        fetchVideoUrl(topicId, language);
      }
      return newSet;
    });
  };

  const ACTION_HANDLERS: Partial<Record<HelpTopicId, () => void>> = {
    login: onOpenLogin,
    signup: onOpenSignUp,
    kyc: onOpenKYC,
  };

  const handleActionClick = (topicId: HelpTopicId, e: React.MouseEvent) => {
    e.stopPropagation();
    onClose();
    ACTION_HANDLERS[topicId]?.();
  };

  if (!isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 overflow-y-auto w-full h-full">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div
        className="relative w-full max-w-2xl bg-[#005430] rounded-xl sm:rounded-modal p-3 sm:p-6 max-h-[95vh] overflow-y-auto scrollbar-hide z-[101]"
        dir={isRTL ? "rtl" : "ltr"}
      >
        {/* Language Toggle - Top Left */}
        <div className="absolute top-2 sm:top-4 left-2 sm:left-4 z-10">
          <div className="flex gap-1 p-1 bg-white/10 rounded-full border border-white/20">
            {isRTL ? ( // Reverse DOM order in RTL to counter visual flip
              <>
                <button
                  onClick={() => setLanguage("ar")}
                  className={`px-2 py-1 sm:px-3 sm:py-1.5 rounded-full text-xs sm:text-sm font-medium transition-all duration-300 ${
                    language === "ar"
                      ? "bg-white text-[#005430]"
                      : "text-white hover:bg-white/10"
                  }`}
                >
                  AR
                </button>
                <button
                  onClick={() => setLanguage("en")}
                  className={`px-2 py-1 sm:px-3 sm:py-1.5 rounded-full text-xs sm:text-sm font-medium transition-all duration-300 ${
                    language === "en"
                      ? "bg-white text-[#005430]"
                      : "text-white hover:bg-white/10"
                  }`}
                >
                  EN
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setLanguage("en")}
                  className={`px-2 py-1 sm:px-3 sm:py-1.5 rounded-full text-xs sm:text-sm font-medium transition-all duration-300 ${
                    language === "en"
                      ? "bg-white text-[#005430]"
                      : "text-white hover:bg-white/10"
                  }`}
                >
                  EN
                </button>
                <button
                  onClick={() => setLanguage("ar")}
                  className={`px-2 py-1 sm:px-3 sm:py-1.5 rounded-full text-xs sm:text-sm font-medium transition-all duration-300 ${
                    language === "ar"
                      ? "bg-white text-[#005430]"
                      : "text-white hover:bg-white/10"
                  }`}
                >
                  AR
                </button>
              </>
            )}
          </div>
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-2 sm:top-4 right-2 sm:right-4 text-gray-500 hover:text-white transition-colors z-10"
        >
          <X className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>

        {/* Content Container */}
        <div className="flex flex-col mt-5 rounded-xl p-3 sm:p-5 gap-3 sm:gap-4">
          {/* Header */}
          <div
            className={`flex items-center gap-2 sm:gap-3 ${
              isRTL ? "pr-0 pl-6" : "pl-0 pr-6"
            }`}
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-brand-emerald500/20 flex items-center justify-center flex-shrink-0">
              <HelpCircle className="w-5 h-5 sm:w-6 sm:h-6 text-brand-primary" />
            </div>
            <div className="min-w-0">
              <h2 className="text-white font-bold font-sans text-base sm:text-xl">
                {t.helpCenter}
              </h2>
              <p className="text-gray-400 text-xs sm:text-sm">
                {t.videoTutorials}
              </p>
            </div>
          </div>

          {/* Main Content - Different structure based on login state */}
          <div className="flex flex-col gap-3 mt-2">
            {!isLoggedIn ? (
              /* LOGGED OUT: Original flat accordion structure */
              <>
                {visibleSections
                  .flatMap((sectionId) => getTopicsForSection(sectionId))
                  .map((topicId) => {
                    const topic = HELP_TOPICS[topicId];
                    const isExpanded = expandedTopics.has(topicId);
                    const cacheKey = `${topicId}-${language}`;

                    return (
                      <div
                        key={topicId}
                        className="rounded-xl border border-white/10 overflow-hidden bg-white/5"
                      >
                        {/* Card Header - Clickable to expand/collapse */}
                        <button
                          onClick={() => toggleTopicExpanded(topicId)}
                          className="w-full flex items-center justify-between gap-2 px-3 py-3 sm:px-4 sm:py-3.5 bg-brand-emerald500/10 hover:bg-brand-emerald500/15 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center bg-brand-emerald500/20">
                              {topic.icon}
                            </div>
                            <div className={isRTL ? "text-right" : "text-left"}>
                              <span className="text-white font-semibold text-sm sm:text-base block">
                                {t[topic.titleKey]}
                              </span>
                              <span className="text-gray-400 text-xs sm:text-sm block">
                                {t[topic.descriptionKey]}
                              </span>
                            </div>
                          </div>
                          <ChevronRight
                            className={`w-5 h-5 sm:w-6 sm:h-6 text-gray-400 transition-transform duration-200 ${
                              isRTL
                                ? isExpanded ? "rotate-90" : "rotate-180"
                                : isExpanded ? "rotate-90" : ""
                            }`}
                          />
                        </button>

                        {/* Video Container - Collapsible */}
                        {isExpanded && (
                          <div className="p-3 sm:p-4 border-t border-white/10">
                            <div
                              className="relative w-full rounded-lg overflow-hidden bg-gray-900"
                              style={{ paddingBottom: "56.25%" }}
                            >
                              {/* Loading State */}
                              {loadingVideos.has(topicId) && (
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <Loader2 className="w-8 h-8 animate-spin text-brand-primary" />
                                </div>
                              )}

                              {/* Error State */}
                              {videoErrors[topicId] &&
                                !loadingVideos.has(topicId) && (
                                  <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 p-4">
                                    <p className="text-sm text-center mb-2">
                                      {t.unableToLoadVideo}
                                    </p>
                                    <button
                                      onClick={() =>
                                        fetchVideoUrl(topicId, language)
                                      }
                                      className="text-brand-primary text-sm hover:underline"
                                    >
                                      {t.tryAgain}
                                    </button>
                                  </div>
                                )}

                              {/* Video Player */}
                              {videoUrls[cacheKey] &&
                                !loadingVideos.has(topicId) &&
                                !videoErrors[topicId] && (
                                  <video
                                    src={videoUrls[cacheKey]}
                                    title={t[topic.titleKey]}
                                    className="absolute inset-0 w-full h-full object-contain"
                                    controls
                                    controlsList="nodownload"
                                    playsInline
                                    preload="metadata"
                                  >
                                    Your browser does not support the video tag.
                                  </video>
                                )}
                            </div>
                            {/* Action link - centered below video (only login/signup for logged-out users) */}
                            {(topicId === "login" || topicId === "signup") && (
                              <p className="text-center text-gray-400 text-xs sm:text-sm mt-3">
                                {topicId === "login" && (
                                  <>
                                    {t.readyToLogin}{" "}
                                    <a
                                      href="#"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        handleActionClick(topicId, e);
                                      }}
                                      className="text-brand-primary hover:underline font-medium"
                                    >
                                      {t.login}
                                    </a>
                                    ?
                                  </>
                                )}
                                {topicId === "signup" && (
                                  <>
                                    {t.readyToSignUp}{" "}
                                    <a
                                      href="#"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        handleActionClick(topicId, e);
                                      }}
                                      className="text-brand-primary hover:underline font-medium"
                                    >
                                      {t.signUp}
                                    </a>
                                    ?
                                  </>
                                )}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </>
            ) : (
              /* LOGGED IN: New nested section structure */
              <>
                {visibleSections.map((sectionId) => {
                  const section = SECTIONS[sectionId];
                  const isSectionExpanded = expandedSections.has(sectionId);
                  const sectionTopics = getTopicsForSection(sectionId);

                  return (
                    <div
                      key={sectionId}
                      className="rounded-xl border border-white/10 overflow-hidden bg-white/5"
                    >
                      {/* Main Section Header */}
                      <button
                        onClick={() => toggleSectionExpanded(sectionId)}
                        className="w-full flex items-center justify-between gap-2 px-3 py-3 sm:px-4 sm:py-4 bg-brand-emerald500/20 hover:bg-brand-emerald500/25 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center bg-brand-emerald500/30">
                            {section.icon}
                          </div>
                          <div className={isRTL ? "text-right" : "text-left"}>
                            <span className="text-white font-bold text-sm sm:text-base block">
                              {t[section.titleKey]}
                            </span>
                            <span className="text-gray-400 text-xs sm:text-sm block">
                              {t[section.descriptionKey]}
                            </span>
                          </div>
                        </div>
                        <ChevronRight
                          className={`w-6 h-6 text-gray-400 transition-transform duration-200 flex-shrink-0 ${
                            isRTL
                              ? isSectionExpanded ? "rotate-90" : "rotate-180"
                              : isSectionExpanded ? "rotate-90" : ""
                          }`}
                        />
                      </button>

                      {/* Sub-topics (nested accordions) */}
                      {isSectionExpanded && (
                        <div className="border-t border-white/10">
                          {sectionTopics.map((topicId) => {
                            const topic = HELP_TOPICS[topicId];
                            const isTopicExpanded = expandedTopics.has(topicId);
                            const cacheKey = `${topicId}-${language}`;

                            return (
                              <div
                                key={topicId}
                                className="border-b border-white/5 last:border-b-0"
                              >
                                {/* Sub-topic Header */}
                                <button
                                  onClick={() => toggleTopicExpanded(topicId)}
                                  className="w-full flex items-center justify-between gap-2 px-3 py-3 sm:px-4 sm:py-3 bg-black/15 hover:bg-black/20 transition-colors"
                                >
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center bg-brand-emerald500/15">
                                      {topic.icon}
                                    </div>
                                    <div
                                      className={
                                        isRTL ? "text-right" : "text-left"
                                      }
                                    >
                                      <span className="text-white font-semibold text-xs sm:text-sm block">
                                        {t[topic.titleKey]}
                                      </span>
                                      <span className="text-gray-400 text-xs block">
                                        {t[topic.descriptionKey]}
                                      </span>
                                    </div>
                                  </div>
                                  <ChevronRight
                                    className={`w-5 h-5 text-gray-400 transition-transform duration-200 flex-shrink-0 ${
                                      isRTL
                                        ? isTopicExpanded ? "rotate-90" : "rotate-180"
                                        : isTopicExpanded ? "rotate-90" : ""
                                    }`}
                                  />
                                </button>

                                {/* Video Container */}
                                {isTopicExpanded && (
                                  <div className="p-3 sm:p-4 bg-black/30">
                                    <div
                                      className="relative w-full rounded-lg overflow-hidden bg-gray-900"
                                      style={{ paddingBottom: "56.25%" }}
                                    >
                                      {loadingVideos.has(topicId) && (
                                        <div className="absolute inset-0 flex items-center justify-center">
                                          <Loader2 className="w-8 h-8 animate-spin text-brand-primary" />
                                        </div>
                                      )}

                                      {videoErrors[topicId] &&
                                        !loadingVideos.has(topicId) && (
                                          <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 p-4">
                                            <p className="text-sm text-center mb-2">
                                              {t.unableToLoadVideo}
                                            </p>
                                            <button
                                              onClick={() =>
                                                fetchVideoUrl(topicId, language)
                                              }
                                              className="text-brand-primary text-sm hover:underline"
                                            >
                                              {t.tryAgain}
                                            </button>
                                          </div>
                                        )}

                                      {videoUrls[cacheKey] &&
                                        !loadingVideos.has(topicId) &&
                                        !videoErrors[topicId] && (
                                          <video
                                            src={videoUrls[cacheKey]}
                                            title={t[topic.titleKey]}
                                            className="absolute inset-0 w-full h-full object-contain"
                                            controls
                                            controlsList="nodownload"
                                            playsInline
                                            preload="metadata"
                                          >
                                            Your browser does not support the
                                            video tag.
                                          </video>
                                        )}
                                    </div>
                                    {topicId === "kyc" && (
                                      <p className="text-center text-gray-400 text-xs sm:text-sm mt-3">
                                        {t.readyToVerify}{" "}
                                        <a
                                          href="#"
                                          onClick={(e) => {
                                            e.preventDefault();
                                            handleActionClick(topicId, e);
                                          }}
                                          className="text-brand-primary hover:underline font-medium"
                                        >
                                          {t.verify}
                                        </a>
                                        ?
                                      </p>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default HelpCenterModal;
