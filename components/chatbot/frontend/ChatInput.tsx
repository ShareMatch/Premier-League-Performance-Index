import React, { useState } from 'react';
import { Send } from 'lucide-react';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}

const ChatInput: React.FC<ChatInputProps> = ({ onSend, disabled }) => {
  const [input, setInput] = useState('');

  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !disabled) {
      onSend(input.trim());
      setInput('');
      // Maintain focus
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 p-2.5 sm:p-3 border-t border-gray-700 bg-gray-800/50">
      <input
        ref={inputRef}
        type="text"
        autoFocus
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Type a message..."
        disabled={disabled}
        className="flex-1 px-3 sm:px-4 py-2 sm:py-2.5 bg-gray-700/50 border border-gray-600 rounded-full text-base sm:text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#00A651]/50 focus:border-[#00A651] disabled:opacity-50"
      />
      <button
        type="submit"
        disabled={!input.trim() || disabled}
        className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-full bg-[#00A651] text-white hover:bg-[#00A651]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
      >
        <Send className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
      </button>
    </form>
  );
};

export default ChatInput;