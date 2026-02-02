import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  Sparkles,
  AlertTriangle,
  Send,
  ChevronDown,
  ChevronRight,
  User,
  ArrowUp,
} from "lucide-react";
import { FaCheck } from "react-icons/fa6";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import type { Team } from "../types";
import { supabase } from "../lib/supabase";
import { getIndexAvatarUrl } from "../lib/logoHelper";
import { marketInfoData } from "../lib/marketInfo";
import { useR2Config } from "../hooks/useR2Config";

interface AIAnalyticsPageProps {
  teams: Team[];
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  market?: string;
  timestamp: Date;
}

interface Category {
  id: string;
  label: string;
  markets: string[];
}

const InputArea: React.FC<{
  inputRef: React.RefObject<HTMLInputElement | null>;
  inputValue: string;
  setInputValue: (value: string) => void;
  clicked: boolean;
  setClicked: React.Dispatch<React.SetStateAction<boolean>>;
  handleKeyDown: (e: React.KeyboardEvent) => void;
  handleSendMessage: () => void;
  selectedMarket: string;
  selectedCategory: string;
  currentCategory: Category;
  isLoading: boolean;
  openDropdown: string | null;
  setOpenDropdown: (value: string | null) => void;
  handleCategoryChange: (id: string) => void;
  handleMarketSelect: (market: string) => void;
  showGenerateButton?: boolean;
  onGenerateAnalysis?: () => void;
  categories: Category[];
  marketLabels: Record<string, string>;
}> = ({
  inputRef,
  inputValue,
  setInputValue,
  clicked,
  setClicked,
  handleKeyDown,
  handleSendMessage,
  selectedMarket,
  selectedCategory,
  currentCategory,
  isLoading,
  openDropdown,
  setOpenDropdown,
  handleCategoryChange,
  handleMarketSelect,
  showGenerateButton = false,
  onGenerateAnalysis,
  categories,
  marketLabels,
}) => {
  const displayLabel =
    selectedMarket === "ALL_INDEX"
      ? "All Index"
      : selectedMarket === "ALL"
        ? `${currentCategory.label} • All`
        : `${currentCategory.label} • ${
            marketLabels[selectedMarket] || selectedMarket
          }`;

  return (
    <div className="w-full">
      {/* Combined Input Container */}
      <div className="bg-gray-800/60 border border-gray-700 rounded-xl sm:rounded-2xl">
        {/* Input Field */}
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Ask about ${
              selectedMarket === "ALL_INDEX"
                ? "All Index"
                : selectedMarket === "ALL"
                  ? currentCategory.label
                  : marketLabels[selectedMarket] || selectedMarket
            }`}
            disabled={isLoading}
            className="w-full px-3 sm:px-4 py-3 sm:py-4 bg-transparent text-[clamp(0.8125rem,2vw,0.875rem)] text-white placeholder-gray-500 appearance-none outline-none ring-0 border-0 shadow-none focus:outline-none focus:ring-0 focus:border-0 focus:shadow-none focus-visible:outline-none focus-visible:ring-0 active:outline-none disabled:opacity-50 transition-all pr-12"
          />
        </div>

        {/* Filters Row - Inside the same container */}
        <div className="flex items-center justify-between px-2 sm:px-3 pb-2 pt-1 gap-2">
          <div className="flex gap-2 min-w-0 flex-1">
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button
                  disabled={isLoading}
                  className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 rounded-full text-[clamp(0.625rem,1.5vw,0.75rem)] font-semibold transition-all border bg-gray-800 text-white border-gray-700 hover:border-brand-emerald500/50 disabled:opacity-50 group/trigger shadow-lg min-w-0"
                >
                  <div className="flex items-center gap-1 sm:gap-1.5 min-w-0">
                    {selectedMarket !== "ALL" &&
                      selectedMarket !== "ALL_INDEX" &&
                      getIndexAvatarUrl(selectedMarket) && (
                        <img
                          src={getIndexAvatarUrl(selectedMarket)!}
                          alt={selectedMarket}
                          className="w-5 h-5 sm:w-6 sm:h-6 object-contain flex-shrink-0"
                        />
                      )}
                    <span className="font-bold truncate max-w-[120px] xs:max-w-[150px] sm:max-w-none">
                      {displayLabel}
                    </span>
                  </div>
                  <ChevronDown className="w-3 h-3 sm:w-3.5 sm:h-3.5 opacity-50 group-hover/trigger:opacity-100 transition-opacity flex-shrink-0" />
                </button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  className="z-50 min-w-[160px] sm:min-w-[180px] bg-gray-900/95 backdrop-blur-xl border border-gray-700/50 rounded-xl p-1.5 shadow-2xl animate-in fade-in zoom-in-95 duration-200 origin-top"
                  sideOffset={8}
                  align="start"
                >
                  {/* Top-level All Index option */}
                  <DropdownMenu.Item
                    onSelect={() => {
                      handleCategoryChange("football"); // Default to football for "All Index" logic or handle specially
                      handleMarketSelect("ALL_INDEX");
                    }}
                    className={`flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-lg cursor-pointer transition-colors outline-none mb-0.5 ${
                      selectedMarket === "ALL_INDEX"
                        ? "bg-brand-emerald500 text-white"
                        : "text-gray-400 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span>All Index</span>
                    </div>
                    {selectedMarket === "ALL_INDEX" && (
                      <FaCheck className="w-3 h-3" />
                    )}
                  </DropdownMenu.Item>

                  <div className="h-px bg-gray-800 my-1 mx-1" />

                  {categories.map((cat) => {
                    // Filter out closed markets from this category
                    const openMarkets = cat.markets.filter((marketId) => {
                      const marketInfo = marketInfoData[marketId];
                      return marketInfo && marketInfo.isOpen;
                    });

                    // Don't show category if no open markets
                    if (openMarkets.length === 0) return null;

                    return (
                      <DropdownMenu.Sub key={cat.id}>
                        <DropdownMenu.SubTrigger
                          className={`flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-lg cursor-pointer transition-colors outline-none mb-0.5 data-[state=open]:bg-brand-emerald500/20 data-[state=open]:text-white focus:bg-brand-emerald500/20 ${
                            selectedCategory === cat.id
                              ? "text-brand-emerald500"
                              : "text-gray-400 hover:text-white hover:bg-white/5"
                          }`}
                        >
                          <span>{cat.label}</span>
                          <ChevronRight className="w-3 h-3" />
                        </DropdownMenu.SubTrigger>
                        <DropdownMenu.Portal>
                          <DropdownMenu.SubContent
                            className="z-50 min-w-[160px] sm:min-w-[180px] bg-gray-900/95 backdrop-blur-xl border border-gray-700/50 rounded-xl p-1.5 shadow-2xl animate-in fade-in zoom-in-95 duration-200 origin-left ml-1"
                            sideOffset={0}
                            alignOffset={-8}
                          >
                            {/* "All" Option for the category - only shown if multiple open markets exist */}
                            {openMarkets.length > 1 && (
                              <>
                                <DropdownMenu.Item
                                  onSelect={() => {
                                    handleCategoryChange(cat.id);
                                    handleMarketSelect("ALL");
                                  }}
                                  className={`flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-lg cursor-pointer transition-colors outline-none mb-0.5 ${
                                    selectedCategory === cat.id &&
                                    selectedMarket === "ALL"
                                      ? "bg-brand-emerald500 text-white"
                                      : "text-gray-400 hover:text-white hover:bg-white/5"
                                  }`}
                                >
                                  <span>All {cat.label}</span>
                                  {selectedCategory === cat.id &&
                                    selectedMarket === "ALL" && (
                                      <FaCheck className="w-3 h-3" />
                                    )}
                                </DropdownMenu.Item>

                                <div className="h-px bg-gray-800 my-1 mx-1" />
                              </>
                            )}

                            {openMarkets.map((marketId) => {
                              const isSelected =
                                selectedCategory === cat.id &&
                                selectedMarket === marketId;
                              return (
                                <DropdownMenu.Item
                                  key={marketId}
                                  onSelect={() => {
                                    handleCategoryChange(cat.id);
                                    handleMarketSelect(marketId);
                                  }}
                                  className={`flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-lg cursor-pointer transition-colors outline-none mb-0.5 ${
                                    isSelected
                                      ? "bg-brand-emerald500 text-white"
                                      : "text-gray-400 hover:text-white hover:bg-white/5"
                                  }`}
                                >
                                  <div className="flex items-center gap-2">
                                    {getIndexAvatarUrl(marketId) && (
                                      <img
                                        src={getIndexAvatarUrl(marketId)!}
                                        alt={marketId}
                                        className="w-5 h-5 object-contain flex-shrink-0"
                                      />
                                    )}
                                    <span>
                                      {marketLabels[marketId] || marketId}
                                    </span>
                                  </div>
                                  {isSelected && (
                                    <FaCheck className="w-3 h-3" />
                                  )}
                                </DropdownMenu.Item>
                              );
                            })}
                          </DropdownMenu.SubContent>
                        </DropdownMenu.Portal>
                      </DropdownMenu.Sub>
                    );
                  })}
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>

            {/* Generate Analysis Button - Only shown in bottom input view */}
            {showGenerateButton && onGenerateAnalysis && (
              <button
                onClick={onGenerateAnalysis}
                disabled={isLoading}
                className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 rounded-full text-[clamp(0.625rem,1.5vw,0.75rem)] font-semibold whitespace-nowrap transition-all border bg-primary-gradient border-[#005430] text-white hover:bg-[#00A651]/90 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg flex-shrink-0"
              >
                <span>Generate Analysis</span>
              </button>
            )}
          </div>

          {/* Send button - right side */}
          <button
            onClick={() => handleSendMessage()}
            disabled={!inputValue.trim() || isLoading}
            className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-full bg-[#00A651] hover:bg-[#00A651]/90 text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md flex-shrink-0"
          >
            {isLoading ? (
              <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <ArrowUp className="w-4 h-4 sm:w-5 sm:h-5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

const ChatMessageBubble = React.memo<{ message: ChatMessage }>(
  ({ message }) => {
    return (
      <div
        className={`flex gap-2 sm:gap-3 ${message.role === "user" ? "justify-end" : "justify-start"} animate-in fade-in slide-in-from-bottom-2 duration-300`}
      >
        {message.role === "assistant" && (
          <div className="flex-shrink-0 w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-brand-emerald500/20 flex items-center justify-center">
            <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 text-brand-emerald500" />
          </div>
        )}

        <div
          className={`max-w-[88%] xs:max-w-[85%] sm:max-w-[80%] md:max-w-[75%] rounded-xl sm:rounded-2xl px-3 sm:px-4 py-2 sm:py-3 ${
            message.role === "user"
              ? "bg-brand-emerald500 text-white rounded-tr-sm"
              : "bg-gray-800/80 text-gray-200 rounded-tl-sm border border-gray-700/50"
          }`}
        >
          {message.role === "assistant" ? (
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                h1: ({ node, ...props }) => (
                  <h1
                    className="text-[clamp(1rem,3vw,1.25rem)] font-bold text-white mb-2 sm:mb-3 border-b border-gray-700 pb-2"
                    {...props}
                  />
                ),
                h2: ({ node, ...props }) => (
                  <h2
                    className="text-[clamp(0.9375rem,2.5vw,1.125rem)] font-bold text-brand-emerald500 mt-3 sm:mt-4 mb-1.5 sm:mb-2"
                    {...props}
                  />
                ),
                h3: ({ node, ...props }) => (
                  <h3
                    className="text-[clamp(0.875rem,2vw,1rem)] font-semibold text-white mt-2 sm:mt-3 mb-1 sm:mb-1.5"
                    {...props}
                  />
                ),
                p: ({ node, ...props }) => (
                  <p
                    className="text-[clamp(0.75rem,2vw,0.875rem)] text-gray-300 leading-relaxed mb-1.5 sm:mb-2"
                    {...props}
                  />
                ),
                ul: ({ node, ...props }) => (
                  <ul
                    className="list-disc list-outside ml-4 sm:ml-5 space-y-0.5 sm:space-y-1 mb-2 sm:mb-3 text-[clamp(0.75rem,2vw,0.875rem)] text-gray-300"
                    {...props}
                  />
                ),
                ol: ({ node, ...props }) => (
                  <ol
                    className="list-decimal list-outside ml-4 sm:ml-5 space-y-0.5 sm:space-y-1 mb-2 sm:mb-3 text-[clamp(0.75rem,2vw,0.875rem)] text-gray-300"
                    {...props}
                  />
                ),
                li: ({ node, ...props }) => (
                  <li
                    className="pl-0.5 sm:pl-1 text-[clamp(0.75rem,2vw,0.875rem)]"
                    {...props}
                  />
                ),
                strong: ({ node, ...props }) => (
                  <strong className="text-white font-semibold" {...props} />
                ),
                blockquote: ({ node, ...props }) => (
                  <blockquote
                    className="border-l-2 sm:border-l-4 border-brand-emerald500 pl-2 sm:pl-3 italic text-[clamp(0.75rem,2vw,0.875rem)] text-gray-400 my-2 sm:my-3 bg-gray-900/50 p-1.5 sm:p-2 rounded-r-lg"
                    {...props}
                  />
                ),
              }}
            >
              {message.content}
            </ReactMarkdown>
          ) : (
            <p className="text-[clamp(0.75rem,2vw,0.875rem)] leading-relaxed">
              {message.content}
            </p>
          )}
        </div>

        {message.role === "user" && (
          <div className="flex-shrink-0 w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-gray-600 flex items-center justify-center">
            <User className="w-3 h-3 sm:w-4 sm:h-4 text-gray-300" />
          </div>
        )}
      </div>
    );
  },
);

const AIAnalyticsPage: React.FC<AIAnalyticsPageProps> = ({ teams }) => {
  // Get config from R2 (cached)
  const { 
    suggestedQuestions, 
    assetTemplates, 
    categories, 
    marketLabels,
    isLoading: configLoading 
  } = useR2Config();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("football");
  const [selectedMarket, setSelectedMarket] = useState("ALL_INDEX");
  const [isLoading, setIsLoading] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [clicked, setClicked] = useState(false);
  const [hasSentFirstMessage, setHasSentFirstMessage] = useState(false);

  const randomQuestions = useMemo(() => {
    // Filter out questions for closed markets
    const openMarketQuestions = suggestedQuestions.filter((q) => {
      const marketInfo = marketInfoData[q.market];
      return marketInfo && marketInfo.isOpen;
    });
    return [...openMarketQuestions].sort(() => Math.random() - 0.5).slice(0, 4);
  }, [suggestedQuestions]);

  // Generate asset-specific questions based on selected market
  const assetQuestions = useMemo(() => {
    // Get assets for the selected market (exclude settled assets and closed markets)
    let marketAssets: Team[] = [];

    if (selectedMarket === "ALL_INDEX") {
      // Get a sample from all markets (filter out settled)
      marketAssets = teams
        .filter((t) => !t.is_settled)
        .sort(() => Math.random() - 0.5)
        .slice(0, 15);
    } else if (selectedMarket === "ALL") {
      // Get assets from the current category's markets
      const currentCat = categories.find((c) => c.id === selectedCategory);
      if (currentCat) {
        marketAssets = teams
          .filter(
            (t) =>
              t.market &&
              currentCat.markets.includes(t.market) &&
              !t.is_settled,
          )
          .sort(() => Math.random() - 0.5)
          .slice(0, 15);
      }
    } else {
      // Get assets from the specific market
      marketAssets = teams
        .filter((t) => t.market === selectedMarket && !t.is_settled)
        .sort(() => Math.random() - 0.5)
        .slice(0, 15);
    }

    // Generate questions for each asset
    const questions: { text: string; asset: Team }[] = [];
    marketAssets.forEach((asset) => {
      const template =
        assetTemplates[
          Math.floor(Math.random() * assetTemplates.length)
        ];
      questions.push({
        text: template.replace("{asset}", asset.name),
        asset,
      });
    });

    return questions;
  }, [teams, selectedMarket, selectedCategory, categories, assetTemplates]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const sessionIdRef = useRef<string | null>(null);

  const hasStartedChat = messages.length > 0;
  const shouldShowBottomInput = hasSentFirstMessage || hasStartedChat;

  // Get current category config
  const currentCategory = useMemo(() => {
    return categories.find((c) => c.id === selectedCategory) || categories[0];
  }, [selectedCategory, categories]);

  // Always scroll to bottom when new messages arrive (especially during streaming)
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  useEffect(() => {
    return () => {
      sessionIdRef.current = null;
    };
  }, []);

  // Update selected market when category changes
  const handleCategoryChange = (categoryId: string) => {
    setSelectedCategory(categoryId);
    const category = categories.find((c) => c.id === categoryId);
    if (category && category.markets.length > 0) {
      setSelectedMarket(category.markets[0]);
    }
    setOpenDropdown(null);
  };

  const handleMarketSelect = (marketId: string) => {
    setSelectedMarket(marketId);
    setOpenDropdown(null);
  };

  const handleSendMessage = async (messageText?: string) => {
    const text = messageText || inputValue.trim();
    if (!text || isLoading) return;

    setHasSentFirstMessage(true);

    // In handleSendMessage, before the fetch:
    // console.log("📤 Sending message with session ID:", sessionIdRef.current);

    const displayMarket =
      selectedMarket === "ALL_INDEX"
        ? "All Index Tokens"
        : selectedMarket === "ALL"
          ? `All ${currentCategory.label}`
          : marketLabels[selectedMarket] || selectedMarket;

    // Add user message
    const userMessage: ChatMessage = {
      id: `user_${Date.now()}`,
      role: "user",
      content: text,
      market: displayMarket,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    try {
      // Get current session for authentication
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        throw new Error("You must be logged in to use AI Analytics");
      }

      const categoryMarkets = currentCategory.markets;
      const filteredTeams =
        selectedMarket === "ALL_INDEX"
          ? teams
          : selectedMarket === "ALL"
            ? teams.filter(
                (t) => t.market && categoryMarkets.includes(t.market),
              )
            : teams.filter((t) => t.market === selectedMarket);

      const res = await fetch(
        `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.functions.supabase.co/ai-analytics`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({
            teams: filteredTeams,
            selectedMarket,
            userQuery: text,
            chatHistory: messages.length ? messages.slice(-10) : [], // last 10 messages for context
            sessionId: sessionIdRef.current, // Include session ID for conversation continuity
          }),
        },
      );

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(
          errorData.error || `Request failed with status ${res.status}`,
        );
      }

      if (!res.body) throw new Error("No response body");

      // Check for session ID in response header
      // Check for session ID in response header IMMEDIATELY
      const responseSessionId = res.headers.get("X-Session-Id");
      // console.log("🔍 Response headers:", {
      //   hasSessionId: !!responseSessionId,
      //   sessionId: responseSessionId,
      //   allHeaders: Array.from(res.headers.entries()),
      // });

      if (responseSessionId && !sessionIdRef.current) {
        sessionIdRef.current = responseSessionId;
        // console.log("📌 Session ID set from header:", responseSessionId);
      }

      const assistantMessageId = `assistant_${Date.now()}`;
      const assistantMessage: ChatMessage = {
        id: assistantMessageId,
        role: "assistant",
        content: "",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });

          setMessages((prev) => {
            const updated = [...prev];
            const idx = updated.findIndex((m) => m.id === assistantMessageId);
            if (idx !== -1) {
              updated[idx] = {
                ...updated[idx],
                content: updated[idx].content + chunk,
              };
            }
            return updated;
          });
        }
      } finally {
        reader.releaseLock();
      }
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error
          ? err.message
          : "Unable to generate analysis at this time.";
      console.error(err);
      const errorMessage: ChatMessage = {
        id: `error_${Date.now()}`,
        role: "assistant",
        content: `Error: ${errorMsg}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestedQuestion = (
    question: { text: string; market: string },
  ) => {
    // Update market if different
    const category = categories.find((c) =>
      c.markets.includes(question.market),
    );
    if (category) {
      setSelectedCategory(category.id);
      setSelectedMarket(question.market);
    }
    // Send the question
    handleSendMessage(question.text);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Handle clicking on rotating asset questions
  const handleAssetQuestion = (question: { text: string; asset: Team }) => {
    // Set the market to match the asset's market
    if (question.asset.market) {
      const category = categories.find((c) =>
        c.markets.includes(question.asset.market!),
      );
      if (category) {
        setSelectedCategory(category.id);
        setSelectedMarket(question.asset.market);
      }
    }
    // Send the question
    handleSendMessage(question.text);
  };

  // Handle Generate Analysis button click
  const handleGenerateAnalysis = () => {
    const marketLabel =
      selectedMarket === "ALL_INDEX"
        ? "all index tokens"
        : selectedMarket === "ALL"
          ? `all ${currentCategory.label} assets`
          : marketLabels[selectedMarket] || selectedMarket;

    const analysisQuery = `Generate a comprehensive analysis for ${marketLabel}. Include top performers, undervalued assets, recent trends, and investment opportunities.`;
    handleSendMessage(analysisQuery);
  };

  return (
    <div className="h-full flex flex-col bg-gray-900 overflow-hidden">
      {/* Messages Container */}
      <div
        className="flex-1 min-h-0 overflow-y-auto scrollbar-hide"
        style={{ contain: "layout" }}
        ref={messagesEndRef}
      >
        <div className="w-full max-w-[95%] xs:max-w-[90%] sm:max-w-md md:max-w-2xl lg:max-w-3xl xl:max-w-4xl mx-auto px-2 xs:px-3 sm:px-4 py-3 sm:py-4">
          {!shouldShowBottomInput ? (
            /* Initial Welcome State - Input centered */
            <div className="flex flex-col items-center justify-center h-full w-full min-h-[40vh] sm:min-h-[50vh]">
              <div className="inline-flex items-center justify-center p-2 sm:p-3 bg-[#00A651]/10 rounded-full ring-1 ring-[#00A651]/20">
                <Sparkles className="w-6 h-6 sm:w-8 sm:h-8 text-[#00A651]" />
              </div>
              <h2 className="px-2 sm:px-4 text-pretty whitespace-pre-wrap text-[clamp(0.9375rem,3vw,1.125rem)] font-medium text-white mb-6 sm:mb-10 text-center mt-4 sm:mt-6 max-w-[280px] xs:max-w-sm sm:max-w-md md:max-w-lg">
                Ask me anything about sports markets, team performance, or
                player stats.
              </h2>

              {/* Centered Input Area */}
              <div className="w-full mt-4 sm:mt-8">
                {/* Suggested Questions - Responsive Grid */}
                <div className="w-full flex justify-center px-1 xs:px-2 sm:px-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 mb-6 sm:mb-10 pb-2 w-full max-w-5xl">
                    {randomQuestions.map((question, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSuggestedQuestion(question)}
                        className="px-3 sm:px-4 py-2.5 sm:py-3 text-[clamp(0.6875rem,1.8vw,0.75rem)] text-start text-gray-400 bg-gray-800/40 hover:bg-gray-800 hover:text-white border border-gray-700/50 hover:border-brand-emerald500/40 rounded-2xl sm:rounded-full transition-all duration-200 flex items-center justify-start gap-2 sm:gap-2.5 shadow-xl shadow-black/20 group/btn w-full"
                      >
                        {getIndexAvatarUrl(question.market) && (
                          <img
                            src={getIndexAvatarUrl(question.market)!}
                            alt={question.market}
                            className="w-5 h-5 sm:w-5 sm:h-5 object-contain flex-shrink-0"
                          />
                        )}
                        <span className="font-medium text-left leading-snug">
                          {question.text}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <InputArea
                  inputRef={inputRef}
                  inputValue={inputValue}
                  setInputValue={setInputValue}
                  clicked={clicked}
                  setClicked={setClicked}
                  handleKeyDown={handleKeyDown}
                  handleSendMessage={handleSendMessage}
                  selectedMarket={selectedMarket}
                  selectedCategory={selectedCategory}
                  currentCategory={currentCategory}
                  isLoading={isLoading}
                  openDropdown={openDropdown}
                  setOpenDropdown={setOpenDropdown}
                  handleCategoryChange={handleCategoryChange}
                  handleMarketSelect={handleMarketSelect}
                  categories={categories}
                  marketLabels={marketLabels}
                />
              </div>
            </div>
          ) : (
            /* Chat Messages */
            <div className="space-y-3 sm:space-y-4 pb-4 mb-28 sm:mb-32">
              {messages.map((message) => (
                <ChatMessageBubble key={message.id} message={message} />
              ))}

              {/* Loading indicator */}
              {isLoading &&
                messages[messages.length - 1]?.role !== "assistant" && (
                  <div className="flex gap-2 sm:gap-3 justify-start animate-in fade-in duration-200">
                    <div className="flex-shrink-0 w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-brand-emerald500/20 flex items-center justify-center">
                      <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 text-brand-emerald500" />
                    </div>
                    <div className="bg-gray-800/80 px-3 sm:px-4 py-2 sm:py-3 rounded-xl sm:rounded-2xl rounded-tl-sm border border-gray-700/50">
                      <div className="flex gap-1 sm:gap-1.5">
                        <span
                          className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-gray-400 rounded-full animate-bounce"
                          style={{ animationDelay: "0ms" }}
                        />
                        <span
                          className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-gray-400 rounded-full animate-bounce"
                          style={{ animationDelay: "150ms" }}
                        />
                        <span
                          className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-gray-400 rounded-full animate-bounce"
                          style={{ animationDelay: "300ms" }}
                        />
                      </div>
                    </div>
                  </div>
                )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>

      {/* Input Container - Sticky Bottom, after first query */}
      {/* On lg+ screens, offset left for Sidebar and right for RightPanel to avoid overlap */}
      {shouldShowBottomInput && (
        <div className="fixed bottom-0 left-0 right-0 lg:left-[clamp(180px,18vw,240px)] lg:right-[clamp(240px,22vw,320px)] z-[5] bg-gray-900/95 backdrop-blur-xl pt-1.5 xs:pt-2 sm:pt-2.5 md:pt-3 safe-area-inset-bottom">
          <div className="w-full max-w-[96%] xs:max-w-[94%] sm:max-w-[90%] md:max-w-2xl lg:max-w-3xl xl:max-w-4xl mx-auto px-2 xs:px-3 sm:px-4 md:px-5 pb-0">
            {/* Rotating Asset Questions - Ticker Style Carousel */}
            {assetQuestions.length > 0 && (
              <div className="mb-1.5 xs:mb-2 sm:mb-2.5 overflow-hidden relative">
                <div className="flex items-center gap-1.5 xs:gap-2">
                  <span className="text-[clamp(0.5rem,1.2vw,0.625rem)] text-gray-500 flex-shrink-0 bg-gray-900/95 pr-1 xs:pr-2 hidden xs:block">
                    Try asking:
                  </span>
                  <div className="flex-1 overflow-hidden">
                    <div className="animate-questions-ticker flex items-center gap-2 xs:gap-3 sm:gap-4">
                      {/* Duplicate questions for seamless loop */}
                      {[...assetQuestions, ...assetQuestions].map(
                        (question, idx) => (
                          <button
                            key={`${question.asset.id}-${idx}`}
                            onClick={() => handleAssetQuestion(question)}
                            disabled={isLoading}
                            className="flex items-center gap-1 xs:gap-1.5 sm:gap-2 px-1.5 xs:px-2 sm:px-3 md:px-4 py-0.5 xs:py-1 sm:py-1.5 text-[clamp(0.5625rem,1.3vw,0.75rem)] text-gray-400 bg-gray-800/60 hover:bg-gray-800 hover:text-white border border-gray-700/50 hover:border-brand-emerald500/40 rounded-full transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 whitespace-nowrap"
                          >
                            {question.asset?.logo_url && (
                              <img
                                src={question.asset.logo_url}
                                alt={question.asset.name}
                                className="w-3 h-3 xs:w-4 xs:h-4 sm:w-5 sm:h-5 object-contain flex-shrink-0"
                              />
                            )}
                            <span className="font-medium">{question.text}</span>
                          </button>
                        ),
                      )}
                    </div>
                  </div>
                </div>
                <style>{`
                  @keyframes questions-ticker {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(-50%); }
                  }
                  .animate-questions-ticker {
                    animation: questions-ticker 30s linear infinite;
                  }
                  .animate-questions-ticker:hover {
                    animation-play-state: paused;
                  }
                `}</style>
              </div>
            )}

            <InputArea
              inputRef={inputRef}
              inputValue={inputValue}
              setInputValue={setInputValue}
              clicked={clicked}
              setClicked={setClicked}
              handleKeyDown={handleKeyDown}
              handleSendMessage={handleSendMessage}
              selectedMarket={selectedMarket}
              selectedCategory={selectedCategory}
              currentCategory={currentCategory}
              isLoading={isLoading}
              openDropdown={openDropdown}
              setOpenDropdown={setOpenDropdown}
              handleCategoryChange={handleCategoryChange}
              handleMarketSelect={handleMarketSelect}
              showGenerateButton={true}
              onGenerateAnalysis={handleGenerateAnalysis}
              categories={categories}
              marketLabels={marketLabels}
            />
          </div>
          {/* Disclaimer */}
          <div className="flex items-center justify-center gap-0.5 xs:gap-1 sm:gap-1.5 text-[clamp(0.4375rem,1.1vw,0.625rem)] text-gray-600 mt-1 xs:mt-1.5 sm:mt-2 pb-1 xs:pb-1.5 sm:pb-2 md:pb-3">
            <AlertTriangle className="w-2 h-2 xs:w-2.5 xs:h-2.5 sm:w-3 sm:h-3 text-amber-500/50 flex-shrink-0" />
            <span>AI can make mistakes. Check important info.</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIAnalyticsPage;
