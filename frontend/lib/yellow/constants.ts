// ============================================
// Yellow Network Constants
// ============================================

/**
 * Yellow Network ClearNode WebSocket URL
 */
export const YELLOW_WS_URL =
  process.env.NEXT_PUBLIC_YELLOW_WS_URL || 'wss://clearnet.yellow.com/ws'

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
 * Message types for Yellow Network protocol
 */
export const MESSAGE_TYPES = {
  // Client -> Server
  CONNECT: 'connect',
  OPEN_SESSION: 'open_session',
  CLOSE_SESSION: 'close_session',
  TRANSFER: 'transfer',
  PING: 'ping',

  // Server -> Client
  CONNECTED: 'connected',
  SESSION_OPENED: 'session_opened',
  SESSION_CLOSED: 'session_closed',
  TRANSFER_CONFIRMED: 'transfer_confirmed',
  OPERATION: 'operation',
  SESSION_UPDATE: 'session_update',
  ERROR: 'error',
  PONG: 'pong',
} as const
