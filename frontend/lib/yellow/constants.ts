import type { RPCAllowance } from '@erc7824/nitrolite'

// ============================================
// Yellow Network Constants
// ============================================

/**
 * Yellow Network ClearNode WebSocket URL
 */
export const YELLOW_WS_URL =
  process.env.NEXT_PUBLIC_YELLOW_WS_URL || 'wss://clearnet.yellow.com/ws'

/**
 * Whether to use the mock ClearNode for demos
 */
export const YELLOW_MOCK_ENABLED = process.env.NEXT_PUBLIC_YELLOW_MOCK === 'true'

/**
 * Connection retry configuration
 */
export const CONNECTION_CONFIG = {
  /** Maximum number of reconnection attempts */
  maxReconnectAttempts: 5,
  /** Base delay between reconnection attempts (ms) */
  reconnectBaseDelay: 1000,
  /** Maximum delay between reconnection attempts (ms) */
  reconnectMaxDelay: 30000,
  /** Multiplier for exponential backoff */
  reconnectMultiplier: 2,
  /** Ping interval to keep connection alive (ms) */
  pingInterval: 30000,
  /** Connection timeout (ms) */
  connectionTimeout: 10000,
} as const

/**
 * Nitrolite SDK configuration
 */
export const NITROLITE_CONFIG = {
  application: 'AgentPaymaster',
  scope: 'console',
  sessionDurationSeconds: 86400,
  defaultAllowances: [{ asset: 'usdc', amount: '1000000000' }] satisfies RPCAllowance[],
  chainId: 5042002, // Arc Testnet
  eip712DomainName: 'Yellow Network',
  requestTimeout: 30_000,
} as const
