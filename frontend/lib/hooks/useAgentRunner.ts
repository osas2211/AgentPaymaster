'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { useWallet } from './useWallet';
import { useYellow } from '@/components/providers/YellowProvider';
import { useAgentStore } from '@/lib/stores/useAgentStore';
import { useSessionStore } from '@/lib/stores/useSessionStore';
import { AgentRunner } from '@/lib/agent/AgentRunner';
import { PolicyValidator } from '@/lib/agent/PolicyValidator';
import { MockPolicyValidator } from '@/lib/agent/MockPolicyValidator';
import { isBrianConfigured } from '@/lib/brian/client';
import { AGENT_TIMING } from '@/lib/brian/constants';
import type { AgentCommand } from '@/lib/brian/types';
import type { YellowOperations } from '@/lib/agent/types';
import type { Address } from 'viem';
import toast from 'react-hot-toast';

// ============================================
// Constants
// ============================================

const MOCK_AGENT_ADDRESS = '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18' as Address;
const MOCK_WALLET_ADDRESS = '0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B' as Address;

function isMockMode(): boolean {
  return process.env.NEXT_PUBLIC_BRIAN_MOCK === 'true';
}

// ============================================
// useAgentRunner Hook
// ============================================

export function useAgentRunner() {
  const { address } = useWallet();
  const yellow = useYellow();
  const store = useAgentStore();
  const sessions = useSessionStore((s) => s.sessions);

  const runnerRef = useRef<AgentRunner | null>(null);
  const [runnerReady, setRunnerReady] = useState(false);
  const lastCommandTime = useRef<number>(0);

  const mockMode = isMockMode();

  // In mock mode, use demo addresses if wallet not connected
  const walletAddress = address ?? (mockMode ? MOCK_WALLET_ADDRESS : null);
  const agentAddress = (store.selectedAgentAddress as Address | null)
    ?? (mockMode ? MOCK_AGENT_ADDRESS : null);

  // Get first active session ID
  const activeSessionId = sessions.length > 0 ? sessions[0].channelId : null;

  // Recreate runner when address/agentAddress changes
  useEffect(() => {
    if (!walletAddress || !agentAddress) {
      runnerRef.current = null;
      setRunnerReady(false);
      return;
    }

    // In mock mode, use MockPolicyValidator (no RPC calls)
    const validator = mockMode ? new MockPolicyValidator() : new PolicyValidator();

    const runner = new AgentRunner(
      agentAddress,
      walletAddress,
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
      validator,
    );

    runnerRef.current = runner;
    setRunnerReady(true);
  }, [walletAddress, agentAddress, mockMode]);

  // Inject Yellow operations whenever connection state changes
  useEffect(() => {
    if (!runnerRef.current) return;

    const ops: YellowOperations = {
      transfer: yellow.transfer,
      openSession: yellow.openSession,
      getActiveSessionId: () => activeSessionId,
      isConnected: () => yellow.isConnected,
    };

    runnerRef.current.setYellowOperations(ops);
  }, [yellow.transfer, yellow.openSession, yellow.isConnected, activeSessionId]);

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
    isReady: runnerReady,
    isBrianConfigured: isBrianConfigured(),
    clearHistory,
    stats: store.stats,
  };
}
