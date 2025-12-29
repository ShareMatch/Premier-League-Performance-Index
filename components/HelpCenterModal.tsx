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
} from "lucide-react";

// Supabase Edge Function URL for fetching video signed URLs
const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL ||
  "https://lbmixnhxerrmecfxdfkx.supabase.co";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

const HELP_TOPICS = {
  signup: {
    title: "How to Sign Up",
    description: "Create your ShareMatch account in a few easy steps",
    icon: <UserPlus className="w-4 h-4 sm:w-5 sm:h-5 text-brand-primary" />,
    actionLabel: "Sign Up",
    video: "Streamline Signup Process With Sharematch Product Demo.mp4",
  },
  login: {
    title: "How to Login",
    description: "Step-by-step guide to logging into your ShareMatch account",
    icon: <LogIn className="w-4 h-4 sm:w-5 sm:h-5 text-brand-primary" />,
    actionLabel: "Login",
    video: "Streamline Login Process With Sharematch.mp4",
  },
  kyc: {
    title: "KYC Verification",
    description: "Complete your identity verification to unlock all features",
    icon: <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5 text-brand-primary" />,
    actionLabel: "Verify",
    video: "Streamline KYC Verification With Sharematch Demo.mp4",
  },
  forgotPassword: {
    title: "How to Reset Password",
    description: "Easily reset your password if you've forgotten it",
    icon: <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5 text-brand-primary" />,
    actionLabel: "Reset Password",
    video: "forgot password.mp4",
  },
  buyAssets: {
    title: "How to Buy Assets",
    description: "Learn how to purchase assets on ShareMatch",
    icon: <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5 text-brand-primary" />,
    actionLabel: "Buy Assets",
    video: "How to buy.mp4",
  },
  sellAssets: {
    title: "How to Sell Assets",
    description: "Learn how to sell assets on ShareMatch",
    icon: <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5 text-brand-primary" />,
    actionLabel: "Sell Assets",
    video: "How to sell.mp4",
  },
  updateUserDetails: {
    title: "How to Update User Details",
    description: "Learn how to update your user details on ShareMatch",
    icon: <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5 text-brand-primary" />,
    actionLabel: "Update Details",
    video: "How to update user details.mp4",
  },
  editMarketingPreferences: {
    title: "How to Edit Marketing Preferences",
    description: "Learn how to edit your marketing preferences on ShareMatch",
    icon: <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5 text-brand-primary" />,
    actionLabel: "Edit Preferences",
    video: "how to edit marketing preferences.mp4",
  },
  changePassword: {
    title: "How to Change Password",
    description: "Learn how to change your password on ShareMatch",
    icon: <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5 text-brand-primary" />,
    actionLabel: "Change Password",
    video: "how to change password.mp4",
  },
} as const;

type HelpTopicId = keyof typeof HELP_TOPICS;

interface HelpCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  isLoggedIn?: boolean;
  onOpenLogin?: () => void;
  onOpenSignUp?: () => void;
  onOpenKYC?: () => void;
  onOpenForgotPassword?: () => void;
  defaultExpandedTopic?: HelpTopicId; // Auto-expand this topic when modal opens
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
  const [expandedTopics, setExpandedTopics] = useState<Set<HelpTopicId>>(
    new Set()
  );
  const [videoUrls, setVideoUrls] = useState<
    Partial<Record<HelpTopicId, string>>
  >({});
  const [loadingVideos, setLoadingVideos] = useState<Set<HelpTopicId>>(
    new Set()
  );
  const [videoErrors, setVideoErrors] = useState<
    Partial<Record<HelpTopicId, string>>
  >({});

  // Fetch signed URL from Edge Function
  const fetchVideoUrl = useCallback(
    async (topicId: HelpTopicId) => {
      const videoName = HELP_TOPICS[topicId].video;
      if (!videoName || videoUrls[topicId]) return; // Already fetched or no video

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
          setVideoUrls((prev) => ({ ...prev, [topicId]: data.url }));
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

  // Auto-expand the default topic when modal opens
  useEffect(() => {
    if (isOpen && defaultExpandedTopic) {
      setExpandedTopics(new Set([defaultExpandedTopic]));
      // Fetch video for default expanded topic
      fetchVideoUrl(defaultExpandedTopic);
    } else if (!isOpen) {
      // Reset when modal closes
      setExpandedTopics(new Set());
    }
  }, [isOpen, defaultExpandedTopic, fetchVideoUrl]);

  // Filter topics based on login state
  // Logged out: show login, signup, kyc
  // Logged in: show only kyc
  const visibleTopics: HelpTopicId[] = isLoggedIn
    ? [
        "kyc",
        "buyAssets",
        "sellAssets",
        "updateUserDetails",
        "editMarketingPreferences",
        "changePassword",
      ]
    : ["login", "signup", "kyc", "forgotPassword"];

  const toggleTopicExpanded = (topicId: HelpTopicId) => {
    setExpandedTopics((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(topicId)) {
        newSet.delete(topicId);
      } else {
        newSet.add(topicId);
        // Fetch video URL when expanding
        fetchVideoUrl(topicId);
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
      <div className="relative w-full max-w-2xl bg-[#005430] rounded-xl sm:rounded-modal p-3 sm:p-6 max-h-[95vh] overflow-y-auto scrollbar-hide z-[101]">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-2 sm:top-4 right-2 sm:right-4 text-gray-500 hover:text-white transition-colors z-10"
        >
          <X className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>

        {/* Content Container */}
        <div className="flex flex-col rounded-xl p-3 sm:p-5 gap-3 sm:gap-4">
          {/* Header */}
          <div className="flex items-center gap-2 sm:gap-3 pr-6">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-brand-emerald500/20 flex items-center justify-center flex-shrink-0">
              <HelpCircle className="w-5 h-5 sm:w-6 sm:h-6 text-brand-primary" />
            </div>
            <div className="min-w-0">
              <h2 className="text-white font-bold font-sans text-base sm:text-xl">
                Help Center
              </h2>
              <p className="text-gray-400 text-xs sm:text-sm">
                Video tutorials to get you started
              </p>
            </div>
          </div>

          {/* Help Topic Cards */}
          <div className="flex flex-col gap-3 mt-2">
            {visibleTopics.map((id) => {
              const topic = HELP_TOPICS[id];
              const isExpanded = expandedTopics.has(id);

              return (
                <div
                  key={id}
                  className="rounded-xl border border-white/10 overflow-hidden bg-white/5"
                >
                  {/* Card Header - Clickable to expand/collapse */}
                  <button
                    onClick={() => toggleTopicExpanded(id)}
                    className="w-full flex items-center justify-between gap-2 px-3 py-3 sm:px-4 sm:py-3.5 bg-brand-emerald500/10 hover:bg-brand-emerald500/15 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center bg-brand-emerald500/20">
                        {topic.icon}
                      </div>
                      <div className="text-left">
                        <span className="text-white font-semibold text-sm sm:text-base block">
                          {topic.title}
                        </span>
                        <span className="text-gray-400 text-xs sm:text-sm block">
                          {topic.description}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {/* Action Button - Show for login/signup when logged out, or KYC when logged in */}
                      <ChevronRight
                        className={`w-5 h-5 sm:w-6 sm:h-6 text-gray-400 transition-transform duration-200 ${
                          isExpanded ? "rotate-90" : ""
                        }`}
                      />
                    </div>
                  </button>

                  {/* Video Container - Collapsible */}
                  {isExpanded && (
                    <div className="p-3 sm:p-4 border-t border-white/10">
                      <div
                        className="relative w-full rounded-lg overflow-hidden bg-gray-900"
                        style={{ paddingBottom: "56.25%" }}
                      >
                        {/* Loading State */}
                        {loadingVideos.has(id) && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Loader2 className="w-8 h-8 animate-spin text-brand-primary" />
                          </div>
                        )}

                        {/* Error State */}
                        {videoErrors[id] && !loadingVideos.has(id) && (
                          <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 p-4">
                            <p className="text-sm text-center mb-2">
                              Unable to load video
                            </p>
                            <button
                              onClick={() => fetchVideoUrl(id)}
                              className="text-brand-primary text-sm hover:underline"
                            >
                              Try again
                            </button>
                          </div>
                        )}

                        {/* Video Player */}
                        {videoUrls[id] &&
                          !loadingVideos.has(id) &&
                          !videoErrors[id] && (
                            <video
                              src={videoUrls[id]}
                              title={topic.title}
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
                      {/* Action link - centered below video */}
                      {((!isLoggedIn && (id === "login" || id === "signup")) ||
                        (isLoggedIn && id === "kyc")) && (
                        <p className="text-center text-gray-400 text-xs sm:text-sm mt-3">
                          {id === "login" && (
                            <>
                              Ready to{" "}
                              <a
                                href="#"
                                onClick={(e) => {
                                  e.preventDefault();
                                  handleActionClick(id, e);
                                }}
                                className="text-brand-primary hover:underline font-medium"
                              >
                                login
                              </a>
                              ?
                            </>
                          )}
                          {id === "signup" && (
                            <>
                              Ready to{" "}
                              <a
                                href="#"
                                onClick={(e) => {
                                  e.preventDefault();
                                  handleActionClick(id, e);
                                }}
                                className="text-brand-primary hover:underline font-medium"
                              >
                                sign up
                              </a>
                              ?
                            </>
                          )}
                          {id === "kyc" && (
                            <>
                              Ready to{" "}
                              <a
                                href="#"
                                onClick={(e) => {
                                  e.preventDefault();
                                  handleActionClick(id, e);
                                }}
                                className="text-brand-primary hover:underline font-medium"
                              >
                                verify
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
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default HelpCenterModal;
