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
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://lbmixnhxerrmecfxdfkx.supabase.co";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

// Map topic IDs to R2 video file names
const VIDEO_FILE_NAMES: Record<string, string> = {
  login: "Streamline Login Process With Sharematch.mp4",
  signup: "Streamline Signup Process With Sharematch Product Demo.mp4",
  kyc: "Streamline KYC Verification With Sharematch Demo.mp4",
};

interface HelpTopic {
  id: "login" | "signup" | "kyc";
  title: string;
  description: string;
  icon: React.ReactNode;
  actionLabel: string;
}

const ALL_HELP_TOPICS: HelpTopic[] = [
  {
    id: "signup",
    title: "How to Sign Up",
    description: "Create your ShareMatch account in a few easy steps",
    icon: <UserPlus className="w-4 h-4 sm:w-5 sm:h-5 text-brand-primary" />,
    actionLabel: "Sign Up",
  },
  {
    id: "login",
    title: "How to Login",
    description: "Step-by-step guide to logging into your ShareMatch account",
    icon: <LogIn className="w-4 h-4 sm:w-5 sm:h-5 text-brand-primary" />,
    actionLabel: "Login",
  },
  {
    id: "kyc",
    title: "KYC Verification",
    description: "Complete your identity verification to unlock all features",
    icon: <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5 text-brand-primary" />,
    actionLabel: "Verify",
  },
];

interface HelpCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  isLoggedIn?: boolean;
  onOpenLogin?: () => void;
  onOpenSignUp?: () => void;
  onOpenKYC?: () => void;
  defaultExpandedTopic?: "login" | "signup" | "kyc"; // Auto-expand this topic when modal opens
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
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set());
  const [videoUrls, setVideoUrls] = useState<Record<string, string>>({});
  const [loadingVideos, setLoadingVideos] = useState<Set<string>>(new Set());
  const [videoErrors, setVideoErrors] = useState<Record<string, string>>({});

  // Fetch signed URL from Edge Function
  const fetchVideoUrl = useCallback(async (topicId: string) => {
    const videoName = VIDEO_FILE_NAMES[topicId];
    if (!videoName || videoUrls[topicId]) return; // Already fetched or no video

    setLoadingVideos((prev) => new Set(prev).add(topicId));
    setVideoErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[topicId];
      return newErrors;
    });

    try {
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/getVideo?name=${encodeURIComponent(videoName)}`,
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
        [topicId]: error instanceof Error ? error.message : "Failed to load video",
      }));
    } finally {
      setLoadingVideos((prev) => {
        const newSet = new Set(prev);
        newSet.delete(topicId);
        return newSet;
      });
    }
  }, [videoUrls]);

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
  const visibleTopics = isLoggedIn
    ? ALL_HELP_TOPICS.filter((t) => t.id === "kyc")
    : ALL_HELP_TOPICS;

  const toggleTopicExpanded = (topicId: string) => {
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

  const handleActionClick = (topicId: "login" | "signup" | "kyc", e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card expansion
    onClose(); // Close help modal first
    
    switch (topicId) {
      case "login":
        onOpenLogin?.();
        break;
      case "signup":
        onOpenSignUp?.();
        break;
      case "kyc":
        onOpenKYC?.();
        break;
    }
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
            {visibleTopics.map((topic) => {
              const isExpanded = expandedTopics.has(topic.id);

              return (
                <div
                  key={topic.id}
                  className="rounded-xl border border-white/10 overflow-hidden bg-white/5"
                >
                  {/* Card Header - Clickable to expand/collapse */}
                  <button
                    onClick={() => toggleTopicExpanded(topic.id)}
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
                      <div className="relative w-full rounded-lg overflow-hidden bg-gray-900" style={{ paddingBottom: "56.25%" }}>
                        {/* Loading State */}
                        {loadingVideos.has(topic.id) && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Loader2 className="w-8 h-8 animate-spin text-brand-primary" />
                          </div>
                        )}
                        
                        {/* Error State */}
                        {videoErrors[topic.id] && !loadingVideos.has(topic.id) && (
                          <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 p-4">
                            <p className="text-sm text-center mb-2">Unable to load video</p>
                            <button
                              onClick={() => fetchVideoUrl(topic.id)}
                              className="text-brand-primary text-sm hover:underline"
                            >
                              Try again
                            </button>
                          </div>
                        )}
                        
                        {/* Video Player */}
                        {videoUrls[topic.id] && !loadingVideos.has(topic.id) && !videoErrors[topic.id] && (
                          <video
                            src={videoUrls[topic.id]}
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
                      {((!isLoggedIn && (topic.id === "login" || topic.id === "signup")) ||
                        (isLoggedIn && topic.id === "kyc")) && (
                        <p className="text-center text-gray-400 text-xs sm:text-sm mt-3">
                          {topic.id === "login" && (
                            <>
                              Ready to{" "}
                              <a
                                href="#"
                                onClick={(e) => {
                                  e.preventDefault();
                                  handleActionClick(topic.id, e);
                                }}
                                className="text-brand-primary hover:underline font-medium"
                              >
                                login
                              </a>
                              ?
                            </>
                          )}
                          {topic.id === "signup" && (
                            <>
                              Ready to{" "}
                              <a
                                href="#"
                                onClick={(e) => {
                                  e.preventDefault();
                                  handleActionClick(topic.id, e);
                                }}
                                className="text-brand-primary hover:underline font-medium"
                              >
                                sign up
                              </a>
                              ?
                            </>
                          )}
                          {topic.id === "kyc" && (
                            <>
                              Ready to{" "}
                              <a
                                href="#"
                                onClick={(e) => {
                                  e.preventDefault();
                                  handleActionClick(topic.id, e);
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
