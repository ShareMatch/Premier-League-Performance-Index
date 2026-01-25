import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  Sparkles,
  AlertTriangle,
  Send,
  ChevronDown,
  User,
  ArrowUp,
  Globe,
} from "lucide-react";
import { FaCheck } from "react-icons/fa6";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import type { Team } from "../types";
import { supabase } from "../lib/supabase";

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

// Market labels for display
const MARKET_LABELS: Record<string, string> = {
  EPL: "Premier League",
  SPL: "Saudi Pro League",
  UCL: "Champions League",
  F1: "Formula 1",
  NBA: "NBA",
  NFL: "NFL",
  T20: "T20 World Cup",
  ISL: "Indonesia Super League",
};

// Category configuration with their markets
const CATEGORIES = [
  {
    id: "all",
    label: "Index Tokens",
    markets: ["EPL", "SPL", "UCL", "ISL", "F1", "NBA", "NFL", "T20"],
  },
  {
    id: "football",
    label: "Football",
    markets: ["EPL", "SPL", "UCL", "ISL"],
  },
  {
    id: "motorsport",
    label: "Motorsport",
    markets: ["F1"],
  },
  {
    id: "basketball",
    label: "Basketball",
    markets: ["NBA"],
  },
  {
    id: "american_football",
    label: "American Football",
    markets: ["NFL"],
  },
  {
    id: "cricket",
    label: "Cricket",
    markets: ["T20"],
  },
];

// Suggested questions for initial state
const SUGGESTED_QUESTIONS = [
  { text: "Which EPL team is most undervalued right now?", market: "EPL" },
  { text: "Analyze the top F1 performers this season", market: "F1" },
  { text: "Compare the Saudi Pro League top 5 teams", market: "SPL" },
  { text: "Champions League quarter-finals preview", market: "UCL" },
];

const InputArea: React.FC<{
  inputRef: React.RefObject<HTMLInputElement>;
  inputValue: string;
  setInputValue: (value: string) => void;
  clicked: boolean;
  setClicked: React.Dispatch<React.SetStateAction<Boolean>>;
  handleKeyDown: (e: React.KeyboardEvent) => void;
  handleSendMessage: () => void;
  selectedMarket: string;
  selectedCategory: string;
  currentCategory: (typeof CATEGORIES)[0];
  isLoading: boolean;
  openDropdown: string | null;
  setOpenDropdown: (value: string | null) => void;
  handleCategoryChange: (id: string) => void;
  handleMarketSelect: (market: string) => void;
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
}) => (
  <div className="space-y-3">
    {/* Input Field */}
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={`Ask about ${selectedMarket === "ALL" ? currentCategory.label : MARKET_LABELS[selectedMarket] || selectedMarket}...`}
        disabled={isLoading}
        className="flex-1 w-full px-4 py-3 bg-gray-800/80 border border-gray-700 rounded-full text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-emerald500/50 focus:border-brand-emerald500 disabled:opacity-50 transition-all pr-12"
      />
      <button
        onClick={() => handleSendMessage()}
        disabled={!inputValue.trim() || isLoading}
        className="absolute right-1 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-full bg-brand-emerald500 hover:bg-brand-emerald500/90 text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-brand-emerald500/20"
      >
        {isLoading ? (
          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : (
          <ArrowUp className="w-5 h-5" />
        )}
      </button>
    </div>

    {/* Filters - Now using two dropdowns */}
    <div className="flex gap-2">
      {/* Category Dropdown */}
      <DropdownMenu.Root
        open={openDropdown === "category"}
        onOpenChange={(open) => setOpenDropdown(open ? "category" : null)}
      >
        <DropdownMenu.Trigger asChild>
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all border bg-gray-800 text-white border-gray-700 hover:border-brand-emerald500/50 flex-shrink-0">
            <span>{currentCategory.label}</span>
            <ChevronDown
              className={`w-3 h-3 transition-transform ${openDropdown === "category" ? "rotate-180" : ""}`}
            />
          </button>
        </DropdownMenu.Trigger>

        <DropdownMenu.Portal>
          <DropdownMenu.Content
            className="z-50 min-w-[180px] bg-gray-900/95 backdrop-blur-xl border border-gray-700/50 rounded-xl p-1.5 shadow-2xl animate-in fade-in zoom-in-95 duration-200 origin-top"
            sideOffset={8}
            align="start"
          >
            {CATEGORIES.map((cat) => {
              const isSelected = selectedCategory === cat.id;
              return (
                <DropdownMenu.Item
                  key={cat.id}
                  onClick={() => handleCategoryChange(cat.id)}
                  className={`flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-lg cursor-pointer transition-colors outline-none mb-0.5 ${
                    isSelected
                      ? "bg-brand-emerald500 text-white"
                      : "text-gray-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <span>{cat.label}</span>
                  {isSelected && <FaCheck className="w-3 h-3" />}
                </DropdownMenu.Item>
              );
            })}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>

      {/* Market Dropdown - Only if multiple markets */}
      {currentCategory.markets.length > 1 && (
        <DropdownMenu.Root
          open={openDropdown === "market"}
          onOpenChange={(open) => setOpenDropdown(open ? "market" : null)}
        >
          <DropdownMenu.Trigger asChild>
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all border bg-gray-800 text-white border-gray-700 hover:border-brand-emerald500/50 flex-shrink-0">
              <span>
                {selectedMarket === "ALL"
                  ? `All ${currentCategory.label}`
                  : MARKET_LABELS[selectedMarket] || selectedMarket}
              </span>
              <ChevronDown
                className={`w-3 h-3 transition-transform ${openDropdown === "market" ? "rotate-180" : ""}`}
              />
            </button>
          </DropdownMenu.Trigger>

          <DropdownMenu.Portal>
            <DropdownMenu.Content
              className="z-50 min-w-[180px] bg-gray-900/95 backdrop-blur-xl border border-gray-700/50 rounded-xl p-1.5 shadow-2xl animate-in fade-in zoom-in-95 duration-200 origin-top"
              sideOffset={8}
              align="start"
            >
              <DropdownMenu.Item
                onClick={() => handleMarketSelect("ALL")}
                className={`flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-lg cursor-pointer transition-colors outline-none mb-0.5 ${
                  selectedMarket === "ALL"
                    ? "bg-brand-emerald500 text-white"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <span>All {currentCategory.label}</span>
                {selectedMarket === "ALL" && <FaCheck className="w-3 h-3" />}
              </DropdownMenu.Item>
              <div className="h-px bg-gray-700/50 my-1" />
              {currentCategory.markets.map((marketId) => {
                const isSelected = selectedMarket === marketId;
                return (
                  <DropdownMenu.Item
                    key={marketId}
                    onClick={() => handleMarketSelect(marketId)}
                    className={`flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-lg cursor-pointer transition-colors outline-none mb-0.5 ${
                      isSelected
                        ? "bg-brand-emerald500 text-white"
                        : "text-gray-400 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <span>{MARKET_LABELS[marketId] || marketId}</span>
                    {isSelected && <FaCheck className="w-3 h-3" />}
                  </DropdownMenu.Item>
                );
              })}
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      )}

      {/* Web search button */}
      <button
        onClick={() => setClicked((prev) => !prev)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all border flex-shrink-0
        ${
          clicked
            ? "bg-[#005430] border-[#005430] text-white" // clicked state
            : "bg-gray-800 border-gray-700 text-white hover:border-[#005430]/50"
        }
      `}
      >
        <Globe className="w-4 h-4" />
        Web Search
      </button>
    </div>
  </div>
);

const AIAnalyticsPage: React.FC<AIAnalyticsPageProps> = ({ teams }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("football");
  const [selectedMarket, setSelectedMarket] = useState("EPL");
  const [isLoading, setIsLoading] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [clicked, setClicked] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const hasStartedChat = messages.length > 0;

  // Get current category config
  const currentCategory = useMemo(() => {
    return CATEGORIES.find((c) => c.id === selectedCategory) || CATEGORIES[0];
  }, [selectedCategory]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Update selected market when category changes
  const handleCategoryChange = (categoryId: string) => {
    setSelectedCategory(categoryId);
    const category = CATEGORIES.find((c) => c.id === categoryId);
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

    const displayMarket =
      selectedMarket === "ALL"
        ? `All ${currentCategory.label}`
        : MARKET_LABELS[selectedMarket] || selectedMarket;

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
      const categoryMarkets = currentCategory.markets;
      const filteredTeams =
        selectedMarket === "ALL"
          ? teams.filter((t) => categoryMarkets.includes(t.market))
          : teams.filter((t) => t.market === selectedMarket);

      const { data, error } = await supabase.functions.invoke("ai-analytics", {
        body: {
          teams: filteredTeams,
          selectedMarket,
          userQuery: text,
        },
      });

      if (error) throw error;

      const assistantMessage: ChatMessage = {
        id: `assistant_${Date.now()}`,
        role: "assistant",
        content:
          data?.analysis || "Analysis currently unavailable. Please try again.",
        market: displayMarket,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: any) {
      console.error(err);
      const errorMessage: ChatMessage = {
        id: `error_${Date.now()}`,
        role: "assistant",
        content: "Unable to generate analysis at this time. Please try again.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleSuggestedQuestion = (
    question: (typeof SUGGESTED_QUESTIONS)[0],
  ) => {
    // Update market if different
    const category = CATEGORIES.find((c) =>
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

  return (
    <div className="h-full flex flex-col bg-gray-900 overflow-hidden">
      {/* Header - Simplified */}
      {/* <div className="flex-shrink-0 p-4 border-b border-gray-800 bg-gray-900/95 backdrop-blur-xl">
        <div className="flex items-center gap-3 max-w-4xl mx-auto">
          <div className="w-10 h-10 rounded-full bg-brand-emerald500/10 flex items-center justify-center ring-1 ring-brand-emerald500/20">
            <Sparkles className="w-5 h-5 text-brand-emerald500" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">AI Analytics</h1>
            <p className="text-xs text-gray-500">
              Powered by real-time market data
            </p>
          </div>
        </div>
      </div> */}

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto scrollbar-hide">
        <div className="max-w-sm sm:max-w-md md:max-w-4xl mx-auto p-4 pb-0">
          {!hasStartedChat ? (
            /* Initial Welcome State - Input centered */
            <div className="flex flex-col items-center justify-center h-full w-full">
              <div className="inline-flex items-center justify-center p-4 bg-brand-emerald500/10 rounded-full mb-6 ring-1 ring-brand-emerald500/20">
                <Sparkles className="w-10 h-10 text-brand-emerald500" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2 text-center">
                What would you like to analyze?
              </h2>
              <p className="text-gray-400 text-sm mb-8 text-center max-w-md">
                Ask me anything about sports markets, team performance, or
                player stats.
              </p>

              {/* Suggested Questions Grid */}
              <div className="grid grid-cols-2 gap-2">
                {SUGGESTED_QUESTIONS.map((question, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSuggestedQuestion(question)}
                    className="group w-full p-3 text-left
             bg-gray-800/50 hover:bg-gray-800
             border border-gray-700/50 hover:border-brand-emerald500/30
             rounded-lg transition-all duration-200"
                  >
                    <p className="text-xs text-gray-300 group-hover:text-white transition-colors line-clamp-1">
                      {question.text}
                    </p>
                  </button>
                ))}
              </div>

              {/* Centered Input Area */}
              <div className="w-full mt-8">
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
                />
              </div>
            </div>
          ) : (
            /* Chat Messages */
            <div className="space-y-4 pb-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"} animate-in fade-in slide-in-from-bottom-2 duration-300`}
                >
                  {message.role === "assistant" && (
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-brand-emerald500/20 flex items-center justify-center">
                      <Sparkles className="w-4 h-4 text-brand-emerald500" />
                    </div>
                  )}

                  <div
                    className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 ${
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
                              className="text-xl font-bold text-white mb-3 border-b border-gray-700 pb-2"
                              {...props}
                            />
                          ),
                          h2: ({ node, ...props }) => (
                            <h2
                              className="text-lg font-bold text-brand-emerald500 mt-4 mb-2"
                              {...props}
                            />
                          ),
                          h3: ({ node, ...props }) => (
                            <h3
                              className="text-base font-semibold text-white mt-3 mb-1.5"
                              {...props}
                            />
                          ),
                          p: ({ node, ...props }) => (
                            <p
                              className="text-sm text-gray-300 leading-relaxed mb-2"
                              {...props}
                            />
                          ),
                          ul: ({ node, ...props }) => (
                            <ul
                              className="list-disc list-outside ml-5 space-y-1 mb-3 text-sm text-gray-300"
                              {...props}
                            />
                          ),
                          ol: ({ node, ...props }) => (
                            <ol
                              className="list-decimal list-outside ml-5 space-y-1 mb-3 text-sm text-gray-300"
                              {...props}
                            />
                          ),
                          li: ({ node, ...props }) => (
                            <li className="pl-1 text-sm" {...props} />
                          ),
                          strong: ({ node, ...props }) => (
                            <strong
                              className="text-white font-semibold"
                              {...props}
                            />
                          ),
                          blockquote: ({ node, ...props }) => (
                            <blockquote
                              className="border-l-4 border-brand-emerald500 pl-3 italic text-sm text-gray-400 my-3 bg-gray-900/50 p-2 rounded-r-lg"
                              {...props}
                            />
                          ),
                        }}
                      >
                        {message.content}
                      </ReactMarkdown>
                    ) : (
                      <p className="text-sm leading-relaxed">
                        {message.content}
                      </p>
                    )}
                  </div>

                  {message.role === "user" && (
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center">
                      <User className="w-4 h-4 text-gray-300" />
                    </div>
                  )}
                </div>
              ))}

              {/* Loading indicator */}
              {isLoading && (
                <div className="flex gap-3 justify-start animate-in fade-in duration-200">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-brand-emerald500/20 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-brand-emerald500" />
                  </div>
                  <div className="bg-gray-800/80 px-4 py-3 rounded-2xl rounded-tl-sm border border-gray-700/50">
                    <div className="flex gap-1.5">
                      <span
                        className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                        style={{ animationDelay: "0ms" }}
                      />
                      <span
                        className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                        style={{ animationDelay: "150ms" }}
                      />
                      <span
                        className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
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

      {/* Input Container - Sticky Bottom, only after chat starts */}
      {hasStartedChat && (
        <div className="flex-shrink-0 bg-gray-900/95 backdrop-blur-xl p-4">
          <div className="max-w-sm sm:max-w-md md:max-w-4xl mx-auto p-4 pb-0">
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
            />
          </div>
          {/* Disclaimer */}
          <div className="flex items-center justify-center gap-1.5 text-[10px] text-gray-600 mt-2">
            <AlertTriangle className="w-3 h-3 text-amber-500/50" />
            <span>AI can make mistakes. Check important info.</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIAnalyticsPage;
