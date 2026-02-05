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
      // console.error("Failed to get chatbot response:", error);
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
        className={`fixed z-50 flex items-center gap-1 bottom-[clamp(5.5rem,10vh,6.5rem)] right-[clamp(1rem,3vw,1.5rem)] sm:bottom-[clamp(2.5rem,5vh,3rem)] sm:right-[clamp(1.5rem,4vw,2rem)] transition-all duration-300 origin-bottom-right ${
          isOpen
            ? "scale-0 opacity-0 pointer-events-none"
            : "scale-100 opacity-100"
        }`}
      >
        {/* Persistent Desktop Label - Improved Styling */}
        {/* Need Help Badge */}
        <div
          className="
    relative
    hidden sm:flex
    items-center gap-2
    px-3 py-1.5
    rounded-pill
    bg-[#0B1221]/95
    backdrop-blur-md
    border border-emerald-500/30
    shadow-[0_4px_20px_rgba(0,84,48,0.25)]
    text-emerald-300
    text-xs font-medium
    tracking-wide
    whitespace-nowrap
    transition-all duration-300
  "
        >
          <span>Need help?</span>
        </div>

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
      </div>

      {/* Chat Window */}
      {isOpen && (
        <div
          className="fixed z-50 flex flex-col transition-all duration-300 bg-gray-900 shadow-2xl border border-gray-700 overflow-hidden
            /* Mobile: centered, bottom fixed */
            inset-x-[clamp(0.75rem,3vw,1rem)] bottom-0 top-auto rounded-t-[clamp(1rem,4vw,1.5rem)] rounded-b-0
            /* Desktop: bottom right corner */
            sm:inset-auto sm:bottom-[clamp(1rem,4vh,1.5rem)] sm:right-[clamp(1rem,4vw,1.5rem)] sm:w-[clamp(320px,30vw,400px)] sm:rounded-2xl
            h-[clamp(400px,80vh,600px)] sm:h-[clamp(450px,55vh,550px)]"
          style={{
            maxHeight: "85vh",
          }}
        >
          {/* Header */}
          <div className="flex-shrink-0 flex items-center justify-between px-3 sm:px-4 py-3 sm:py-3.5 bg-[#0B1221]/95 backdrop-blur-xl border-b border-gray-800 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                  <img
                    src="/speech-bubble-5-svgrepo-com.svg"
                    alt="Message"
                    className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400"
                  />
                </div>
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-gray-900 animate-pulse" />
              </div>
              <div>
                <h3 className="text-white font-bold text-xs sm:text-sm tracking-tight">
                  ShareMatch AI Assistant
                </h3>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/5 rounded-full transition-all"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4 scrollbar-hide">
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
