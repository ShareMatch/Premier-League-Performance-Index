import React, { useState, useRef, useEffect } from "react";
import { Sparkles, X } from "lucide-react";
import ChatMessage, { Message } from "./ChatMessage";
import ChatInput from "./ChatInput";
import { sendChatMessage } from "../../../lib/chatbotApi";

const INITIAL_MESSAGE: Message = {
  id: "welcome",
  content: "Hello! How can I help you today?",
  sender: "bot",
  timestamp: new Date(),
};

const ChatBot: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleSendMessage = async (content: string) => {
    // Add user message
    const userMessage: Message = {
      id: `user_${Date.now()}`,
      content,
      sender: "user",
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      // Get bot response
      const response = await sendChatMessage({ message: content });

      const botMessage: Message = {
        id: `bot_${Date.now()}`,
        content: response.message,
        sender: "bot",
        timestamp: new Date(),
        video: response.video,
      };
      setMessages((prev) => [...prev, botMessage]);
    } catch (error) {
      console.error("Failed to get chatbot response:", error);
      const errorMessage: Message = {
        id: `error_${Date.now()}`,
        content: "Sorry, I encountered an error. Please try again.",
        sender: "bot",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleChat = () => {
    setIsOpen(!isOpen);
  };

  const handleClose = () => {
    setIsOpen(false);
    // Clear chat history when closing - fresh start on reopen
    setMessages([INITIAL_MESSAGE]);
  };

  return (
    <>
      <div
        className={`fixed z-50 flex flex-col-reverse items-center gap-[clamp(0.5rem,1.5vh,0.75rem)] bottom-[clamp(5.5rem,10vh,6.5rem)] right-[clamp(1rem,3vw,1.5rem)] sm:bottom-[clamp(2.5rem,5vh,3rem)] sm:right-[clamp(1.5rem,4vw,2rem)] transition-all duration-300 origin-bottom-right ${isOpen ? "scale-0 opacity-0 pointer-events-none" : "scale-100 opacity-100"
          }`}
      >
        {/* Floating Action Button */}
        <button
          onClick={toggleChat}
          className="relative w-[clamp(3rem,8vw,3.5rem)] h-[clamp(3rem,8vw,3.5rem)] rounded-full bg-gradient-to-r from-[#003820] to-[#00A651] shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 flex items-center justify-center group"
          aria-label="Open AI Chat"
        >
          <img
            src="/speech-bubble-5-svgrepo-com.svg"
            alt="Message"
            className="w-[clamp(1.25rem,4vw,1.5rem)] h-[clamp(1.25rem,4vw,1.5rem)] text-white transition-transform duration-300"
          />

          {/* Pulse animation */}
          <span className="absolute w-full h-full rounded-full bg-[#00A651] animate-ping opacity-20 pointer-events-none" />
        </button>

        {/* Persistent Desktop Label (Tooltip Style) */}
        <div className="hidden sm:flex flex-col items-center animate-in fade-in slide-in-from-bottom-2 duration-700 delay-300">
          <div className="bg-[#0B1221] backdrop-blur-xl border border-white/10 rounded-xl px-[clamp(0.75rem,2vw,1rem)] py-[clamp(0.4rem,1vh,0.6rem)] shadow-2xl relative">
            <div className="flex items-center">
              <span className="text-[clamp(0.75rem,2vw,0.85rem)] font-semibold text-white tracking-wide uppercase whitespace-nowrap">
                Talk to me
              </span>
            </div>

            {/* Bottom Arrow matching InfoTooltip style */}
            <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-[#0B1221] border-r border-b border-white/10 rotate-45" />
          </div>
        </div>
      </div>

      {/* Chat Window */}
      {isOpen && (
        <div
          className="fixed z-50 transition-all duration-300 bg-gray-900 shadow-2xl border border-gray-700 overflow-hidden
            /* Mobile: centered, nearly full screen */
            inset-x-[clamp(0.75rem,3vw,1rem)] bottom-[clamp(0.5rem,3vw,0.8rem)] top-auto rounded-[clamp(1rem,4vw,1.5rem)]
            /* Desktop: bottom right corner */
            sm:inset-auto sm:bottom-[clamp(1rem,4vh,1.5rem)] sm:right-[clamp(1rem,4vw,1.5rem)] sm:w-[clamp(320px,30vw,400px)] sm:rounded-2xl
            h-[clamp(400px,80vh,600px)] sm:h-[clamp(450px,55vh,550px)]"
          style={{
            maxHeight: "calc(100vh - 24px)",
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 bg-gradient-to-r from-[#0B1221] via-[#003820] to-[#0B1221] border-b border-gray-700">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#00A651]/20 flex items-center justify-center">
                <img
                  src="/speech-bubble-5-svgrepo-com.svg"
                  alt="Message"
                  className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white group-hover:scale-110 transition-transform duration-300"
                />
              </div>
              <div>
                <h3 className="text-white font-semibold text-xs sm:text-sm">
                  ShareMatch AI Assistant
                </h3>
                <span className="text-[9px] sm:text-[10px] text-green-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                  Online
                </span>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-lg transition-colors"
              aria-label="Close"
            >
              <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          </div>

          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4 h-[calc(100%-110px)] sm:h-[calc(100%-120px)] scrollbar-hide">
            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))}
            {isLoading && (
              <div className="flex gap-2 justify-start">
                <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-[#00A651]/20 flex items-center justify-center flex-shrink-0">
                  <img
                    src="/speech-bubble-5-svgrepo-com.svg"
                    alt="Message"
                    className="w-3 h-3 sm:w-4 sm:h-4 text-white group-hover:scale-110 transition-transform duration-300"
                  />
                </div>
                <div className="bg-gray-700/50 px-3 sm:px-4 py-2.5 sm:py-3 rounded-2xl rounded-tl-sm">
                  <div className="flex gap-1">
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

          {/* Input */}
          <ChatInput onSend={handleSendMessage} disabled={isLoading} />
        </div>
      )}
    </>
  );
};

export default ChatBot;
