'use client';

import { AlertTriangle } from 'lucide-react';
import { useAgentRunner } from '@/lib/hooks/useAgentRunner';
import { AgentStats } from './AgentStats';
import { AgentPromptInput } from './AgentPromptInput';
import { AgentActionFeed } from './AgentActionFeed';

// ============================================
// Agent Terminal — Composite Component
// ============================================

export const AgentTerminal = () => {
  const {
    execute,
    isProcessing,
    commands,
    isYellowConnected,
    isReady,
    isBrianConfigured,
  } = useAgentRunner();

  return (
    <div className="space-y-6">
      {/* Stats */}
      <AgentStats />

      {/* Config Warning */}
      {!isBrianConfigured && (
        <div className="flex items-center gap-3 px-4 py-3 border border-amber-500/30 bg-amber-500/5">
          <AlertTriangle size={16} className="text-amber-400 shrink-0" />
          <p className="text-xs text-amber-400 font-mono">
            Brian AI not configured. Set <code className="text-amber-300">NEXT_PUBLIC_BRIAN_API_KEY</code> in your environment or enable mock mode with <code className="text-amber-300">NEXT_PUBLIC_BRIAN_MOCK=true</code>.
          </p>
        </div>
      )}

      {/* Prompt Input */}
      <AgentPromptInput
        onSubmit={execute}
        isProcessing={isProcessing}
        isDisabled={!isReady && isBrianConfigured}
      />

      {/* Action Feed */}
      <AgentActionFeed
        commands={commands}
        isYellowConnected={isYellowConnected}
      />
    </div>
  );
};
