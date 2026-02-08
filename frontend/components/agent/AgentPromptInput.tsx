'use client';

import { useState, useCallback } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { EXAMPLE_PROMPTS } from '@/lib/brian/constants';

// ============================================
// Agent Prompt Input Component
// ============================================

interface AgentPromptInputProps {
  onSubmit: (prompt: string) => void;
  isProcessing: boolean;
  isDisabled: boolean;
}

export const AgentPromptInput = ({ onSubmit, isProcessing, isDisabled }: AgentPromptInputProps) => {
  const [input, setInput] = useState('');

  const handleSubmit = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed || isProcessing || isDisabled) return;
    onSubmit(trimmed);
    setInput('');
  }, [input, isProcessing, isDisabled, onSubmit]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit],
  );

  return (
    <div>
      {/* Example Prompt Chips */}
      <div className="flex flex-wrap gap-2 mb-3">
        {EXAMPLE_PROMPTS.map((example) => (
          <button
            key={example.label}
            onClick={() => setInput(example.prompt)}
            className="px-3 py-1.5 text-xs font-mono bg-grey-900 border border-grey-700 text-grey-300 hover:text-primary hover:border-primary/30 transition-colors"
            disabled={isProcessing}
          >
            {example.icon} {example.label}
          </button>
        ))}
      </div>

      {/* Input Row */}
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a command... e.g. 'Swap 50 USDC for ETH'"
          disabled={isProcessing || isDisabled}
          className="flex-1 px-4 py-3 bg-grey-900 border border-grey-700 text-white font-mono text-sm placeholder:text-grey-500 focus:outline-none focus:border-primary/50 transition-colors disabled:opacity-50"
        />
        <button
          onClick={handleSubmit}
          disabled={!input.trim() || isProcessing || isDisabled}
          className="px-5 py-3 bg-primary text-night font-mono text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isProcessing ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Send size={16} />
          )}
          Run
        </button>
      </div>
    </div>
  );
};
