import type { Address } from 'viem';

// ============================================
// Core Domain Types (matching contract structs)
// ============================================

/**
 * Agent spending policy configuration
 * Mirrors IPolicyVault.Policy struct
 */
export interface Policy {
  /** Maximum amount agent can spend per day in USDC (6 decimals) */
  dailyLimit: bigint;
  /** Maximum amount per single transaction in USDC (6 decimals) */
  perTxLimit: bigint;
  /** Bitmap of chain IDs the agent can operate on */
  allowedChainsBitmap: bigint;
  /** Array of contract addresses the agent can interact with (empty = all) */
  protocolWhitelist: readonly Address[];
  /** Whether the agent's policy is currently active */
  isActive: boolean;
  /** Timestamp when the policy was created */
  createdAt: number;
}

/**
 * Authorized agent with their policy
 * address and name are frontend-only fields not in the contract struct
 */
export interface Agent {
  /** Agent's wallet address (frontend-only, not in contract struct) */
  address: Address;
  /** Agent's display name (frontend-only) */
  name: string;
  /** Agent's spending policy */
  policy: Policy;
  /** Amount spent in the current rolling 24h window */
  spentToday: bigint;
  /** Timestamp of the last spend */
  lastSpendTimestamp: number;
  /** Total amount spent by this agent in USDC */
  totalSpent: bigint;
  /** Number of Yellow Network sessions opened */
  sessionCount: number;
}

/**
 * On-chain session state
 * Mirrors IPolicyVault.Session struct
 */
export interface Session {
  /** Unique session identifier (bytes32) */
  id: string;
  /** Yellow Network channel ID (bytes32) */
  channelId: string;
  /** Agent address this session belongs to */
  agentAddress: Address;
  /** Amount allocated to this session in USDC */
  allocation: bigint;
  /** Amount spent in this session */
  spent: bigint;
  /** Whether the session is currently active */
  isActive: boolean;
  /** When session was opened (unix timestamp) */
  openedAt: number;
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

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

// ============================================
// Vault Types
// ============================================

export interface VaultBalance {
  /** Total balance in vault (USDC, 6 decimals) */
  total: bigint;
  /** Available balance (not allocated to sessions) */
  available: bigint;
  /** Amount allocated to active sessions (derived: total - available) */
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
  perTxLimit: string;
  allowedChainsBitmap: string;
  protocolWhitelist: Address[];
}

export interface OpenSessionFormData {
  channelId: string;
  allocation: string;
}

export interface TransferFormData {
  sessionId: string;
  amount: string;
  target: Address;
}
