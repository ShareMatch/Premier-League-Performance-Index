import React, {
  useState,
  useRef,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import {
  Sparkles,
  AlertTriangle,
  Send,
  ChevronDown,
  ChevronRight,
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
  // {
  //   id: "all",
  //   label: "Index Tokens",
  //   markets: ["EPL", "SPL", "UCL", "ISL", "F1", "NBA", "NFL", "T20"],
  // },
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
];

const InputArea: React.FC<{
  inputRef: React.RefObject<HTMLInputElement>;
  inputValue: string;
  setInputValue: (value: string) => void;
  clicked: boolean;
  setClicked: React.Dispatch<React.SetStateAction<boolean>>;
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
}) => {
  const displayLabel =
    selectedMarket === "ALL"
      ? `${currentCategory.label} • All`
      : `${currentCategory.label} • ${
          MARKET_LABELS[selectedMarket] || selectedMarket
        }`;

  return (
    <div className="w-full">
      {/* Combined Input Container */}
      <div className="bg-gray-800/60 border border-gray-700 rounded-2xl">
        {/* Input Field */}
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Ask about ${
              selectedMarket === "ALL"
                ? currentCategory.label
                : MARKET_LABELS[selectedMarket] || selectedMarket
            }...`}
            disabled={isLoading}
            className="w-full px-4 py-3 bg-transparent text-sm text-white placeholder-gray-500 appearance-none outline-none ring-0 border-0 shadow-none focus:outline-none focus:ring-0 focus:border-0 focus:shadow-none focus-visible:outline-none focus-visible:ring-0 active:outline-none disabled:opacity-50 transition-all pr-12"
          />
        </div>

        {/* Filters Row - Inside the same container */}
        <div className="flex items-center justify-between px-2 pb-1 pt-1">
          <div className="flex gap-2">
            <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all border bg-gray-800 text-white border-gray-700 hover:border-brand-emerald500/50 flex-shrink-0 disabled:opacity-50"
            >
              <span>{displayLabel}</span>
              <ChevronDown className="w-3 h-3" />
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              className="z-50 min-w-[180px] bg-gray-900/95 backdrop-blur-xl border border-gray-700/50 rounded-xl p-1.5 shadow-2xl animate-in fade-in zoom-in-95 duration-200 origin-top"
              sideOffset={8}
              align="start"
            >
              {CATEGORIES.map((cat) => (
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
                      className="z-50 min-w-[180px] bg-gray-900/95 backdrop-blur-xl border border-gray-700/50 rounded-xl p-1.5 shadow-2xl animate-in fade-in zoom-in-95 duration-200 origin-left ml-1"
                      sideOffset={0}
                      alignOffset={-8}
                      side="right"
                    >
                      {cat.markets.map((marketId) => {
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
                            <span>{MARKET_LABELS[marketId] || marketId}</span>
                            {isSelected && <FaCheck className="w-3 h-3" />}
                          </DropdownMenu.Item>
                        );
                      })}
                    </DropdownMenu.SubContent>
                  </DropdownMenu.Portal>
                </DropdownMenu.Sub>
              ))}
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>

        {/* Web search button
          <button
            onClick={() => setClicked((prev) => !prev)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all border flex-shrink-0
              ${
                clicked
                  ? "bg-[#005430] border-[#005430] text-white"
                  : "bg-gray-800 border-gray-700 text-white hover:border-[#005430]/50"
              }
            `}
          >
            <Globe className="w-4 h-4" />
            Web Search
          </button> */}
          </div>

          {/* Send button - right side */}
          <button
            onClick={() => handleSendMessage()}
            disabled={!inputValue.trim() || isLoading}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-[#00A651] hover:bg-[#00A651]/90 text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <ArrowUp className="w-5 h-5" />
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
                  <strong className="text-white font-semibold" {...props} />
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
            <p className="text-sm leading-relaxed">{message.content}</p>
          )}
        </div>

        {message.role === "user" && (
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center">
            <User className="w-4 h-4 text-gray-300" />
          </div>
        )}
      </div>
    );
  },
);

const AIAnalyticsPage: React.FC<AIAnalyticsPageProps> = ({ teams }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("football");
  const [selectedMarket, setSelectedMarket] = useState("EPL");
  const [isLoading, setIsLoading] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [clicked, setClicked] = useState(false);
  const [hasSentFirstMessage, setHasSentFirstMessage] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const hasStartedChat = messages.length > 0;
  const shouldShowBottomInput = hasSentFirstMessage || hasStartedChat;

  // Get current category config
  const currentCategory = useMemo(() => {
    return CATEGORIES.find((c) => c.id === selectedCategory) || CATEGORIES[0];
  }, [selectedCategory]);

  // Always scroll to bottom when new messages arrive (especially during streaming)
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

    setHasSentFirstMessage(true);

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
      // Get current session for authentication
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        throw new Error("You must be logged in to use AI Analytics");
      }

      const categoryMarkets = currentCategory.markets;
      const filteredTeams =
        selectedMarket === "ALL"
          ? teams.filter((t) => categoryMarkets.includes(t.market))
          : teams.filter((t) => t.market === selectedMarket);

      const res = await fetch(
        "https://lbmixnhxerrmecfxdfkx.functions.supabase.co/ai-analytics",
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

      // Prepare assistant message in state
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

      // ✅ Direct streaming - update state immediately on every chunk
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });

        // Update message content directly - no buffering
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
    } catch (err: any) {
      console.error(err);
      const errorMessage: ChatMessage = {
        id: `error_${Date.now()}`,
        role: "assistant",
        content: `Error: ${err.message || "Unable to generate analysis at this time."}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
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
      {/* Messages Container */}
      <div
        className="flex-1 min-h-0 overflow-y-auto scrollbar-hide"
        style={{ contain: "layout" }}
        ref={messagesEndRef}
      >
        <div className="max-w-sm sm:max-w-md md:max-w-4xl mx-auto p-4">
          {!shouldShowBottomInput ? (
            /* Initial Welcome State - Input centered */
            <div className="flex flex-col items-center justify-center h-full w-full">
              <h2 className="px-1 text-pretty whitespace-pre-wrap text-xl font-semibold text-white mb-10 text-center mt-24">
              Ask me anything about sports markets, team performance, or
              player stats.
              </h2>

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

                {/* Suggested Questions - Horizontal Pills */}
                <div className="flex flex-wrap justify-center gap-2 mt-4">
                  {SUGGESTED_QUESTIONS.map((question, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSuggestedQuestion(question)}
                      className="px-4 py-2 text-xs text-gray-400 bg-gray-800/40 hover:bg-gray-800 hover:text-white border border-gray-700/50 hover:border-brand-emerald500/40 rounded-full transition-all duration-200"
                    >
                      {question.text}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* Chat Messages */
            <div className="space-y-4 pb-4 mb-32">
              {messages.map((message) => (
                <ChatMessageBubble key={message.id} message={message} />
              ))}

              {/* Loading indicator */}
              {isLoading &&
                messages[messages.length - 1]?.role !== "assistant" && (
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

      {/* Input Container - Sticky Bottom, after first query */}
      {shouldShowBottomInput && (
        <div className="fixed bottom-0 left-0 w-full z-10 bg-gray-900/95 backdrop-blur-xl pt-0">
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
