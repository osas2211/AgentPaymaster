import type { OperationType } from '@/types'

// ============================================
// Token Constants
// ============================================

/** USDC has 6 decimal places */
export const USDC_DECIMALS = 6

/** 1 USDC in smallest unit */
export const ONE_USDC = BigInt(1_000_000)

// ============================================
// Chain Configuration
// ============================================

/** Arc Testnet Chain ID */
export const ARC_TESTNET_CHAIN_ID = 5042002

/** Supported chain IDs */
export const SUPPORTED_CHAIN_IDS = [ARC_TESTNET_CHAIN_ID] as const

// ============================================
// Operation Type Configuration
// ============================================

export const OPERATION_TYPE_COLORS: Record<OperationType, string> = {
  transfer: 'bg-primary/20 text-primary',
  swap_request: 'bg-amber-500/20 text-amber-500',
  approve: 'bg-indigo-500/20 text-indigo-500',
  state_update: 'bg-violet-500/20 text-violet-500',
  balance_check: 'bg-teal-500/20 text-teal-500',
  policy_check: 'bg-pink-500/20 text-pink-500',
}

export const OPERATION_TYPE_LABELS: Record<OperationType, string> = {
  transfer: 'Transfer',
  swap_request: 'Swap',
  approve: 'Approve',
  state_update: 'State Update',
  balance_check: 'Balance Check',
  policy_check: 'Policy Check',
}

// ============================================
// UI Constants
// ============================================

/** Maximum operations to display in the terminal view */
export const MAX_TERMINAL_OPERATIONS = 100

/** Default toast duration in milliseconds */
export const TOAST_DURATION = 4000

// ============================================
// Contract Limits
// ============================================

/** Minimum deposit amount in USDC */
export const MIN_DEPOSIT_USDC = BigInt(1_000_000) // 1 USDC

/** Maximum daily limit for an agent in USDC */
export const MAX_DAILY_LIMIT_USDC = BigInt(1_000_000_000_000) // 1M USDC

// ============================================
// Time Constants
// ============================================

/** One day in seconds */
export const ONE_DAY_SECONDS = 86400

/** One hour in milliseconds */
export const ONE_HOUR_MS = 3600000

// ============================================
// Query Keys
// ============================================

export const QUERY_KEYS = {
  vaultBalance: (address: string) => ['vaultBalance', address] as const,
  agents: (vaultOwner: string) => ['agents', vaultOwner] as const,
  agentPolicy: (agentAddress: string) => ['agentPolicy', agentAddress] as const,
  sessions: (address: string) => ['sessions', address] as const,
  operations: (sessionId: string) => ['operations', sessionId] as const,
  gasStats: ['gasStats'] as const,
} as const
