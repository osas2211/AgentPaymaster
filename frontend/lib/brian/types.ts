import type { Address } from 'viem';

// ============================================
// Brian AI Agent Command Types
// ============================================

export type AgentCommandStatus =
  | 'pending'
  | 'interpreting'
  | 'validated'
  | 'rejected'
  | 'executing'
  | 'completed'
  | 'failed';

export interface AgentCommand {
  id: string;
  prompt: string;
  status: AgentCommandStatus;
  timestamp: number;
  brianResponse?: BrianTransactionResult;
  validationResult?: ValidationResult;
  executionResult?: ExecutionResult;
  error?: string;
  gasSaved?: number;
}

// ============================================
// Brian SDK Response Types
// ============================================

export interface BrianTransaction {
  to: Address;
  value: string;
  data: string;
  chainId?: number;
  from?: Address;
}

export interface BrianTransactionResult {
  description: string;
  fromToken?: string;
  toToken?: string;
  fromAmount?: string;
  toAmount?: string;
  transactions: BrianTransaction[];
  protocol?: string;
}

// ============================================
// Validation & Execution Types
// ============================================

export interface ValidationResult {
  allowed: boolean;
  reason: string;
  remainingLimit?: bigint;
}

export interface ExecutionResult {
  success: boolean;
  method: 'yellow' | 'onchain';
  sessionId?: string;
  txHash?: string;
  error?: string;
}

// ============================================
// UI Types
// ============================================

export interface BrianPrompt {
  label: string;
  prompt: string;
  category: string;
  icon: string;
}
