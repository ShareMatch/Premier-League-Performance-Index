import React from 'react';
import { Sparkles, User } from 'lucide-react';

export interface Message {
  id: string;
  content: string;
  sender: 'user' | 'bot';
  timestamp: Date;
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
        className={`max-w-[80%] px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-2xl text-xs sm:text-sm ${
          isBot
            ? 'bg-gray-700/50 text-gray-200 rounded-tl-sm'
            : 'bg-[#00A651] text-white rounded-tr-sm'
        }`}
      >
        <p className="leading-relaxed">{message.content}</p>
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
