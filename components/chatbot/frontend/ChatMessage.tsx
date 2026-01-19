import React from "react";
import { Sparkles, User } from "lucide-react";

export interface VideoInfo {
  id: string;
  url: string;
  title: string;
  isR2Video?: boolean; // If true, use <video> tag instead of <iframe>
}

export interface Message {
  id: string;
  content: string;
  sender: "user" | "bot";
  timestamp: Date;
  video?: VideoInfo;
}

interface ChatMessageProps {
  message: Message;
}

/**
 * Parse inline markdown (bold, italic) and render as React elements
 */
const parseInlineMarkdown = (text: string): React.ReactNode => {
  // Pattern to match **bold** and *italic*
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let keyIndex = 0;

  while (remaining.length > 0) {
    // Check for bold: **text**
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/);

    if (boldMatch && boldMatch.index !== undefined) {
      // Add text before the match
      if (boldMatch.index > 0) {
        parts.push(
          <span key={keyIndex++}>
            {remaining.substring(0, boldMatch.index)}
          </span>,
        );
      }
      // Add the bold text
      parts.push(
        <strong key={keyIndex++} className="font-semibold text-white">
          {boldMatch[1]}
        </strong>,
      );
      // Continue with the rest
      remaining = remaining.substring(boldMatch.index + boldMatch[0].length);
    } else {
      // No more matches, add remaining text
      parts.push(<span key={keyIndex++}>{remaining}</span>);
      break;
    }
  }

  return parts.length > 0 ? <>{parts}</> : text;
};

/**
 * Render message content with proper formatting
 * Handles: newlines, bullet points (- or •), numbered lists (1. 2. etc.), bold text
 */
const renderFormattedContent = (content: string): React.ReactNode => {
  // Split by newlines
  const lines = content.split("\n");

  return (
    <div className="leading-relaxed space-y-1">
      {lines.map((line, index) => {
        const trimmedLine = line.trim();

        // Skip empty lines but add spacing
        if (!trimmedLine) {
          return <div key={index} className="h-1" />;
        }

        // Check for bullet points (- or •)
        if (trimmedLine.startsWith("- ") || trimmedLine.startsWith("• ")) {
          return (
            <div key={index} className="flex gap-2 pl-2">
              <span className="text-[#00A651] flex-shrink-0">•</span>
              <span>{parseInlineMarkdown(trimmedLine.substring(2))}</span>
            </div>
          );
        }

        // Check for numbered lists (1. 2. 3. etc.)
        const numberedMatch = trimmedLine.match(/^(\d+)\.\s+(.*)$/);
        if (numberedMatch) {
          return (
            <div key={index} className="flex gap-2 pl-2">
              <span className="text-[#00A651] flex-shrink-0 min-w-[1.2em]">
                {numberedMatch[1]}.
              </span>
              <span>{parseInlineMarkdown(numberedMatch[2])}</span>
            </div>
          );
        }

        // Regular paragraph
        return <p key={index}>{parseInlineMarkdown(trimmedLine)}</p>;
      })}
    </div>
  );
};

const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isBot = message.sender === "bot";

  return (
    <div
      className={`flex gap-1.5 sm:gap-2 ${isBot ? "justify-start" : "justify-end"}`}
    >
      {isBot && (
        <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-[#00A651]/20 flex items-center justify-center flex-shrink-0">
          <img
            src="/speech-bubble-5-svgrepo-com.svg"
            alt="Message"
            className="w-3 h-3 sm:w-4 sm:h-4 text-white group-hover:scale-110 transition-transform duration-300"
          />
        </div>
      )}

      <div
        className={`max-w-[85%] sm:max-w-[80%] px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-2xl text-xs sm:text-sm ${
          isBot
            ? "bg-gray-700/50 text-gray-200 rounded-tl-sm"
            : "bg-[#00A651] text-white rounded-tr-sm"
        }`}
      >
        {isBot ? (
          renderFormattedContent(message.content)
        ) : (
          <p className="leading-relaxed">{message.content}</p>
        )}

        {/* Video Embed */}
        {isBot && message.video && message.video.url && (
          <div className="mt-2 sm:mt-3">
            <div className="rounded-lg overflow-hidden border border-gray-600/50 bg-gray-900">
              {message.video.isR2Video ? (
                // R2 Video - use native video player
                <video
                  src={message.video.url}
                  title={message.video.title}
                  className="w-full aspect-video"
                  style={{ minHeight: "180px" }}
                  controls
                  controlsList="nodownload"
                  playsInline
                  preload="metadata"
                >
                  Your browser does not support the video tag.
                </video>
              ) : (
                // Embedded video (Guidde, YouTube, etc.) - use iframe
                <iframe
                  src={message.video.url}
                  title={message.video.title}
                  className="w-full aspect-video"
                  style={{ minHeight: "180px" }}
                  frameBorder="0"
                  referrerPolicy="unsafe-url"
                  allowFullScreen
                  allow="clipboard-write"
                  sandbox="allow-popups allow-popups-to-escape-sandbox allow-scripts allow-forms allow-same-origin allow-presentation"
                />
              )}
            </div>
          </div>
        )}

        <span
          className={`text-[9px] sm:text-[10px] mt-0.5 sm:mt-1 block ${isBot ? "text-gray-500" : "text-white/70"}`}
        >
          {message.timestamp.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      </div>

      {!isBot && (
        <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-gray-600 flex items-center justify-center flex-shrink-0">
          <User className="w-3 h-3 sm:w-4 sm:h-4 text-gray-300" />
        </div>
      )}
    </div>
  );
};

export default ChatMessage;
