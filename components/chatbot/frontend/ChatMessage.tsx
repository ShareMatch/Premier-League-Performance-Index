import React from 'react';
import { Sparkles, User, Play } from 'lucide-react';

export interface VideoInfo {
  id: string;
  url: string;
  title: string;
}

export interface Message {
  id: string;
  content: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  video?: VideoInfo;
}

interface ChatMessageProps {
  message: Message;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isBot = message.sender === 'bot';

  return (
    <div className={`flex gap-1.5 sm:gap-2 ${isBot ? 'justify-start' : 'justify-end'}`}>
      {isBot && (
        <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-[#00A651]/20 flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 text-[#00A651]" />
        </div>
      )}
      
      <div
        className={`max-w-[85%] sm:max-w-[80%] px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-2xl text-xs sm:text-sm ${
          isBot
            ? 'bg-gray-700/50 text-gray-200 rounded-tl-sm'
            : 'bg-[#00A651] text-white rounded-tr-sm'
        }`}
      >
        <p className="leading-relaxed">{message.content}</p>
        
        {/* Video Embed */}
        {isBot && message.video && (
          <div className="mt-2 sm:mt-3">
            <div className="flex items-center gap-1.5 mb-1.5 text-[#00A651]">
              <Play className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span className="text-[10px] sm:text-xs font-medium">{message.video.title}</span>
            </div>
            <div className="rounded-lg overflow-hidden border border-gray-600/50">
              <iframe
                src={message.video.url}
                title={message.video.title}
                className="w-full aspect-video"
                style={{ minHeight: '180px' }}
                frameBorder="0"
                referrerPolicy="unsafe-url"
                allowFullScreen
                allow="clipboard-write"
                sandbox="allow-popups allow-popups-to-escape-sandbox allow-scripts allow-forms allow-same-origin allow-presentation"
              />
            </div>
          </div>
        )}
        
        <span className={`text-[9px] sm:text-[10px] mt-0.5 sm:mt-1 block ${isBot ? 'text-gray-500' : 'text-white/70'}`}>
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
