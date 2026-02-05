import type { Address } from 'viem';

// ============================================
// Core Domain Types
// ============================================

/**
 * Agent spending policy configuration
 */
export interface Policy {
  /** Maximum amount agent can spend per day in USDC (6 decimals) */
  dailyLimit: bigint;
  /** Maximum amount per single transaction in USDC (6 decimals) */
  maxPerTransaction: bigint;
  /** Allowed operation types for this agent */
  allowedOperations: OperationType[];
  /** Policy expiration timestamp (0 = never expires) */
  expiresAt: number;
}

/**
 * Authorized agent with their policy
 */
export interface Agent {
  /** Agent's wallet address */
  address: Address;
  /** Agent's display name */
  name: string;
  /** Agent's spending policy */
  policy: Policy;
  /** Whether agent is currently paused */
  isPaused: boolean;
  /** Total amount spent by this agent in USDC */
  totalSpent: bigint;
  /** When the agent was authorized */
  authorizedAt: number;
}

/**
 * State channel session with an agent
 */
export interface Session {
  /** Unique session identifier */
  id: string;
  /** Agent address this session belongs to */
  agentAddress: Address;
  /** Amount allocated to this session in USDC */
  allocation: bigint;
  /** Amount spent in this session */
  spent: bigint;
  /** Session status */
  status: SessionStatus;
  /** When session was opened */
  openedAt: number;
  /** When session was closed (0 if still open) */
  closedAt: number;
  /** Number of operations in this session */
  operationCount: number;
}

/**
 * Individual operation within a session
 */
export interface Operation {
  /** Unique operation identifier */
  id: string;
  /** Session this operation belongs to */
  sessionId: string;
  /** Type of operation */
  type: OperationType;
  /** Amount involved in USDC (6 decimals) */
  amount: bigint;
  /** Target address or protocol */
  target: string;
  /** Operation status */
  status: OperationStatus;
  /** Timestamp of operation */
  timestamp: number;
  /** Gas that would have been spent on-chain */
  estimatedGas: bigint;
  /** Actual gas spent (0 for off-chain) */
  actualGas: bigint;
  /** Transaction hash if settled on-chain */
  txHash?: string;
}

// ============================================
// Enums
// ============================================

export type OperationType =
  | 'transfer'
  | 'swap_request'
  | 'approve'
  | 'state_update'
  | 'balance_check'
  | 'policy_check';

export type OperationStatus = 'pending' | 'confirmed' | 'failed' | 'settled';

export type SessionStatus = 'opening' | 'active' | 'closing' | 'closed' | 'settled';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

// ============================================
// Vault Types
// ============================================

export interface VaultBalance {
  /** Total balance in vault (USDC, 6 decimals) */
  total: bigint;
  /** Available balance (not allocated to sessions) */
  available: bigint;
  /** Amount allocated to active sessions */
  allocated: bigint;
}

// ============================================
// Gas Savings Types
// ============================================

export interface GasStats {
  /** Total gas saved in USD */
  totalSaved: number;
  /** What it would have cost on-chain */
  wouldHaveCost: number;
  /** Actual cost with Yellow Network */
  actualCost: number;
  /** Percentage savings */
  savingsPercent: number;
  /** Total operations processed */
  operationsCount: number;
}

// ============================================
// Yellow Network Types
// ============================================

export interface YellowSession {
  /** Session ID from Yellow Network */
  channelId: string;
  /** Agent address */
  participant: Address;
  /** Allocated amount */
  allocation: bigint;
  /** Current balance in channel */
  balance: bigint;
  /** Session state */
  state: 'pending' | 'open' | 'closing' | 'closed';
  /** Nonce for state updates */
  nonce: number;
}

// ============================================
// Hook Return Types
// ============================================

export interface TransactionState {
  /** Whether transaction is pending */
  isPending: boolean;
  /** Whether waiting for confirmation */
  isConfirming: boolean;
  /** Whether transaction succeeded */
  isSuccess: boolean;
  /** Error if transaction failed */
  error: Error | null;
  /** Transaction hash */
  hash?: `0x${string}`;
}

export interface MutationCallbacks {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

// ============================================
// Form Types
// ============================================

export interface DepositFormData {
  amount: string;
}

export interface WithdrawFormData {
  amount: string;
}

export interface AuthorizeAgentFormData {
  agentAddress: Address;
  agentName: string;
  dailyLimit: string;
  maxPerTransaction: string;
  allowedOperations: OperationType[];
  expiresAt?: Date;
}

export interface OpenSessionFormData {
  agentAddress: Address;
  allocation: string;
}

export interface TransferFormData {
  sessionId: string;
  amount: string;
  target: Address;
}
