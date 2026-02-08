import type { Address } from 'viem'
import type { WalletClient } from 'viem'

// ============================================
// WebSocket Abstraction
// ============================================

/**
 * Ready state constants matching the WebSocket spec
 */
export const WS_READY_STATE = {
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3,
} as const

/**
 * Minimal WebSocket interface that both real WebSocket
 * and MockClearNode implement
 */
export interface WebSocketLike {
  readyState: number
  onopen: ((ev: unknown) => void) | null
  onclose: ((ev: unknown) => void) | null
  onmessage: ((ev: { data: string }) => void) | null
  onerror: ((ev: unknown) => void) | null
  send(data: string): void
  close(): void
}

// ============================================
// Nitrolite Client Config
// ============================================

/**
 * Configuration for NitroliteClient
 */
export interface NitroliteClientConfig {
  /** ClearNode WebSocket URL */
  wsUrl: string
  /** User's wallet address */
  address: Address
  /** Viem wallet client for signing */
  walletClient: WalletClient
  /** Optional factory to create custom WebSocket (used for mock) */
  webSocketFactory?: (url: string) => WebSocketLike
}

/**
 * Event handlers for NitroliteClient
 */
export interface NitroliteClientHandlers {
  onOpen?: () => void
  onClose?: () => void
  onError?: (error: Error) => void
  onAuthenticated?: () => void
  onBalanceUpdate?: (data: { channelId: string; balance: string; asset: string }) => void
  onChannelUpdate?: (data: { channelId: string; status: string }) => void
  onTransferNotification?: (data: {
    channelId: string
    amount: string
    asset: string
    from: string
    to: string
  }) => void
}
