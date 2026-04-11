'use client';

import { useState, KeyboardEvent } from 'react';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}

export default function ChatInput({ onSend, disabled = false }: ChatInputProps) {
  const [input, setInput] = useState('');

  const handleSend = () => {
    if (input.trim() && !disabled) {
      onSend(input.trim()); // calls handleSendMessage in page.tsx
      setInput(''); // clears the input box
    }
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="border-t border-zinc-800 bg-zinc-950 p-4">
      <div className="max-w-4xl mx-auto flex gap-2">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyPress}
          placeholder="Ask Zaina about phones, plans, or accessories..."
          disabled={disabled}
          rows={1}
          className="flex-1 resize-none rounded-lg border border-zinc-700 bg-zinc-900 text-zinc-100 px-4 py-3 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent disabled:bg-zinc-800 disabled:cursor-not-allowed"
          style={{ minHeight: '52px', maxHeight: '150px' }}
        />
        <button
          onClick={handleSend}
          disabled={disabled || !input.trim()}
          className="px-6 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:bg-zinc-700 disabled:text-zinc-400 disabled:cursor-not-allowed transition-colors"
        >
          {disabled ? 'Sending...' : 'Send'}
        </button>
      </div>
    </div>
  );
}
