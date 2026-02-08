'use client';

import { useRef, useCallback, useEffect } from 'react';
import { useWallet } from './useWallet';
import { useYellow } from '@/components/providers/YellowProvider';
import { useAgentStore } from '@/lib/stores/useAgentStore';
import { useSessionStore } from '@/lib/stores/useSessionStore';
import { AgentRunner } from '@/lib/agent/AgentRunner';
import { isBrianConfigured } from '@/lib/brian/client';
import { AGENT_TIMING } from '@/lib/brian/constants';
import type { AgentCommand } from '@/lib/brian/types';
import type { YellowOperations } from '@/lib/agent/types';
import type { Address } from 'viem';
import toast from 'react-hot-toast';

// ============================================
// useAgentRunner Hook
// ============================================

export function useAgentRunner() {
  const { address } = useWallet();
  const yellow = useYellow();
  const store = useAgentStore();
  const sessions = useSessionStore((s) => s.sessions);

  const runnerRef = useRef<AgentRunner | null>(null);
  const lastCommandTime = useRef<number>(0);

  const agentAddress = store.selectedAgentAddress as Address | null;

  // Get first active session ID
  const activeSessionId = sessions.length > 0 ? sessions[0].channelId : null;

  // Recreate runner when address/agentAddress changes
  useEffect(() => {
    if (!address || !agentAddress) {
      runnerRef.current = null;
      return;
    }

    const runner = new AgentRunner(
      agentAddress,
      address,
      {
        onCommandUpdate: (command: AgentCommand) => {
          const existing = useAgentStore.getState().getCommand(command.id);
          if (existing) {
            useAgentStore.getState().updateCommand(command.id, command);
          } else {
            useAgentStore.getState().addCommand(command);
          }
        },
        onError: (error: string) => {
          toast.error(error);
        },
      },
    );

    runnerRef.current = runner;
  }, [address, agentAddress]);

  // Inject Yellow operations whenever connection state changes
  useEffect(() => {
    if (!runnerRef.current) return;

    const ops: YellowOperations = {
      transfer: yellow.transfer,
      getActiveSessionId: () => activeSessionId,
      isConnected: () => yellow.isConnected,
    };

    runnerRef.current.setYellowOperations(ops);
  }, [yellow.transfer, yellow.isConnected, activeSessionId]);

  // Execute a prompt
  const execute = useCallback(async (prompt: string) => {
    if (!runnerRef.current) {
      toast.error('Agent not configured. Select an agent address first.');
      return;
    }

    // Cooldown check
    const now = Date.now();
    if (now - lastCommandTime.current < AGENT_TIMING.cooldown) {
      toast.error('Please wait before sending another command.');
      return;
    }

    lastCommandTime.current = now;
    store.setProcessing(true);

    try {
      await runnerRef.current.executeCommand(prompt);
    } finally {
      store.setProcessing(false);
    }
  }, [store]);

  const clearHistory = useCallback(() => {
    store.clearCommands();
  }, [store]);

  return {
    execute,
    isProcessing: store.isProcessing,
    commands: store.commands,
    agentAddress,
    activeSessionId,
    isYellowConnected: yellow.isConnected,
    isReady: !!runnerRef.current,
    isBrianConfigured: isBrianConfigured(),
    clearHistory,
    stats: store.stats,
  };
}
