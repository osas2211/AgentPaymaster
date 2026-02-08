import type { Address } from 'viem';
import type { AgentCommand } from '@/lib/brian/types';

// ============================================
// Yellow Operations Interface
// ============================================

export interface YellowOperations {
  transfer: (sessionId: string, amount: bigint, target: Address) => Promise<boolean>;
  openSession: (agentAddress: Address, allocation: bigint) => Promise<string | null>;
  getActiveSessionId: () => string | null;
  isConnected: () => boolean;
}

// ============================================
// Agent Runner Callbacks
// ============================================

export interface AgentRunnerCallbacks {
  onCommandUpdate: (command: AgentCommand) => void;
  onError: (error: string) => void;
}
