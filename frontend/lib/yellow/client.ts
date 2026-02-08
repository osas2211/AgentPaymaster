import type { Address } from 'viem'
import {
  createAuthRequestMessage,
  createAuthVerifyMessageFromChallenge,
  createCreateChannelMessage,
  createCloseChannelMessage,
  createTransferMessage,
  createPingMessageV2,
  getRequestId,
  getMethod,
  RPCMethod,
} from '@erc7824/nitrolite'
import { CONNECTION_CONFIG, NITROLITE_CONFIG } from './constants'
import { WS_READY_STATE, type NitroliteClientConfig, type NitroliteClientHandlers, type WebSocketLike } from './types'
import { createSessionKey, createAuthSigner, type SessionKeyManager } from './signer'

// ============================================
// Nitrolite WebSocket Client
// ============================================

interface PendingRequest {
  resolve: (value: unknown) => void
  reject: (error: Error) => void
  timeout: ReturnType<typeof setTimeout>
}

/**
 * Extract the first params object from a Nitrolite wire-format message.
 * Wire format: { res: [requestId, method, [params, ...], timestamp], sig: [...] }
 */
function extractParams(parsed: Record<string, unknown>): Record<string, unknown> {
  const res = parsed.res as unknown[]
  if (Array.isArray(res) && Array.isArray(res[2]) && res[2].length > 0) {
    return res[2][0] as Record<string, unknown>
  }
  return {}
}

/**
 * WebSocket client for Yellow Network using Nitrolite SDK protocol.
 * Handles auth handshake, channel operations, and message routing.
 */
export class NitroliteClient {
  private config: NitroliteClientConfig
  private handlers: NitroliteClientHandlers
  private ws: WebSocketLike | null = null
  private sessionKey: SessionKeyManager | null = null
  private authenticated = false
  private reconnectAttempts = 0
  private pingInterval: ReturnType<typeof setInterval> | null = null
  private pendingRequests = new Map<number, PendingRequest>()
  private intentionalClose = false

  constructor(config: NitroliteClientConfig, handlers: NitroliteClientHandlers = {}) {
    this.config = config
    this.handlers = handlers
  }

  // ============================================
  // Public API
  // ============================================

  /**
   * Connect to ClearNode and complete auth handshake
   */
  async connect(): Promise<void> {
    this.intentionalClose = false
    this.sessionKey = createSessionKey()

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Connection timeout'))
      }, CONNECTION_CONFIG.connectionTimeout)

      try {
        // Create WebSocket (real or mock via factory)
        this.ws = this.config.webSocketFactory
          ? this.config.webSocketFactory(this.config.wsUrl)
          : new WebSocket(this.config.wsUrl) as unknown as WebSocketLike

        this.ws.onopen = () => {
          clearTimeout(timeout)
          this.reconnectAttempts = 0
          this.handlers.onOpen?.()
          this.startAuthFlow().then(resolve).catch(reject)
        }

        this.ws.onclose = () => {
          this.cleanup()
          this.handlers.onClose?.()
          if (!this.intentionalClose) {
            this.attemptReconnect()
          }
        }

        this.ws.onerror = () => {
          clearTimeout(timeout)
          const error = new Error('WebSocket error')
          this.handlers.onError?.(error)
          reject(error)
        }

        this.ws.onmessage = (event) => {
          this.handleMessage(event.data)
        }
      } catch (error) {
        clearTimeout(timeout)
        reject(error)
      }
    })
  }

  /**
   * Disconnect from ClearNode
   */
  disconnect(): void {
    this.intentionalClose = true
    this.cleanup()

    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
  }

  /**
   * Whether the client is connected and authenticated
   */
  get isConnected(): boolean {
    return this.ws?.readyState === WS_READY_STATE.OPEN && this.authenticated
  }

  /**
   * Open a new state channel session
   */
  async openSession(agentAddress: Address, allocation: bigint): Promise<string> {
    if (!this.sessionKey) throw new Error('Not authenticated')

    const msg = await createCreateChannelMessage(
      this.sessionKey.messageSigner,
      {
        chain_id: NITROLITE_CONFIG.chainId,
        token: agentAddress, // token address used as participant marker
      },
    )

    const response = await this.sendAndWait(msg)
    return (response as Record<string, unknown>).channel_id as string
  }

  /**
   * Close a state channel session
   */
  async closeSession(channelId: string): Promise<boolean> {
    if (!this.sessionKey) throw new Error('Not authenticated')

    const msg = await createCloseChannelMessage(
      this.sessionKey.messageSigner,
      channelId as `0x${string}`,
      this.config.address,
    )

    await this.sendAndWait(msg)
    return true
  }

  /**
   * Execute a transfer within a session
   */
  async transfer(channelId: string, amount: bigint, target: Address): Promise<boolean> {
    if (!this.sessionKey) throw new Error('Not authenticated')

    const msg = await createTransferMessage(
      this.sessionKey.messageSigner,
      {
        destination: target,
        allocations: [{ asset: 'usdc', amount: amount.toString() }],
      },
    )

    await this.sendAndWait(msg)
    return true
  }

  // ============================================
  // Auth Flow
  // ============================================

  private async startAuthFlow(): Promise<void> {
    if (!this.sessionKey) throw new Error('No session key')

    const expiresAt = BigInt(Math.floor(Date.now() / 1000) + NITROLITE_CONFIG.sessionDurationSeconds)

    // Step 1: Send auth request
    const authRequestMsg = await createAuthRequestMessage({
      address: this.config.address,
      session_key: this.sessionKey.address,
      application: NITROLITE_CONFIG.application,
      allowances: [...NITROLITE_CONFIG.defaultAllowances],
      expires_at: expiresAt,
      scope: NITROLITE_CONFIG.scope,
    })

    // Step 2: Wait for auth_challenge, extract challenge string
    const challengeParams = await this.sendAndWait(authRequestMsg) as Record<string, unknown>
    const challengeString = (challengeParams.challengeMessage as string) || ''

    // Step 3: Create auth signer and send auth_verify
    const authSigner = createAuthSigner(
      this.config.walletClient,
      this.sessionKey.address,
      [...NITROLITE_CONFIG.defaultAllowances],
      expiresAt,
      NITROLITE_CONFIG.scope,
    )

    const authVerifyMsg = await createAuthVerifyMessageFromChallenge(
      authSigner,
      challengeString,
    )

    // Step 4: Wait for auth_verify success
    await this.sendAndWait(authVerifyMsg)

    // Step 5: Authenticated
    this.authenticated = true
    this.startPingInterval()
    this.handlers.onAuthenticated?.()
  }

  // ============================================
  // Message Handling
  // ============================================

  private handleMessage(data: string): void {
    try {
      const parsed = JSON.parse(data) as Record<string, unknown>
      const requestId = getRequestId(parsed)
      const method = getMethod(parsed)

      // Handle response to a pending request
      if (requestId !== undefined && this.pendingRequests.has(requestId)) {
        const pending = this.pendingRequests.get(requestId)!
        this.pendingRequests.delete(requestId)
        clearTimeout(pending.timeout)

        if (method === RPCMethod.Error) {
          const params = extractParams(parsed)
          pending.reject(new Error((params.message as string) || 'RPC error'))
          return
        }

        // Resolve with extracted params
        pending.resolve(extractParams(parsed))
        return
      }

      // Handle server push notifications (requestId 0 or unmatched)
      const params = extractParams(parsed)

      switch (method) {
        case RPCMethod.BalanceUpdate:
          this.handlers.onBalanceUpdate?.({
            channelId: (params.channel_id as string) || '',
            balance: (params.balance as string) || '0',
            asset: (params.asset as string) || 'usdc',
          })
          break

        case RPCMethod.ChannelUpdate:
          this.handlers.onChannelUpdate?.({
            channelId: (params.channel_id as string) || '',
            status: (params.status as string) || 'open',
          })
          break

        case RPCMethod.TransferNotification:
          this.handlers.onTransferNotification?.({
            channelId: (params.channel_id as string) || '',
            amount: (params.amount as string) || '0',
            asset: (params.asset as string) || 'usdc',
            from: (params.from as string) || '',
            to: (params.to as string) || '',
          })
          break

        case RPCMethod.Pong:
          break

        case RPCMethod.Error:
          this.handlers.onError?.(new Error((params.message as string) || 'Server error'))
          break

        default:
          break
      }
    } catch (error) {
      console.error('Failed to parse Nitrolite message:', error)
    }
  }

  // ============================================
  // Request/Response Tracking
  // ============================================

  private sendAndWait(msg: string): Promise<unknown> {
    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WS_READY_STATE.OPEN) {
        reject(new Error('Not connected'))
        return
      }

      const parsed = JSON.parse(msg)
      const requestId = getRequestId(parsed)

      if (requestId === undefined) {
        this.ws.send(msg)
        resolve(undefined)
        return
      }

      const timeout = setTimeout(() => {
        if (this.pendingRequests.has(requestId)) {
          this.pendingRequests.delete(requestId)
          reject(new Error('Request timeout'))
        }
      }, NITROLITE_CONFIG.requestTimeout)

      this.pendingRequests.set(requestId, {
        resolve,
        reject,
        timeout,
      })

      this.ws.send(msg)
    })
  }

  // ============================================
  // Keepalive
  // ============================================

  private startPingInterval(): void {
    this.pingInterval = setInterval(() => {
      if (this.ws?.readyState === WS_READY_STATE.OPEN) {
        const pingMsg = createPingMessageV2()
        this.ws.send(pingMsg)
      }
    }, CONNECTION_CONFIG.pingInterval)
  }

  private stopPingInterval(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval)
      this.pingInterval = null
    }
  }

  // ============================================
  // Reconnect
  // ============================================

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= CONNECTION_CONFIG.maxReconnectAttempts) {
      return
    }

    const delay = Math.min(
      CONNECTION_CONFIG.reconnectBaseDelay *
        Math.pow(CONNECTION_CONFIG.reconnectMultiplier, this.reconnectAttempts),
      CONNECTION_CONFIG.reconnectMaxDelay,
    )

    this.reconnectAttempts++

    setTimeout(() => {
      this.connect().catch((error) => {
        console.error('Reconnection failed:', error)
      })
    }, delay)
  }

  // ============================================
  // Cleanup
  // ============================================

  private cleanup(): void {
    this.stopPingInterval()
    this.authenticated = false

    for (const [, { reject, timeout }] of this.pendingRequests) {
      clearTimeout(timeout)
      reject(new Error('Connection closed'))
    }
    this.pendingRequests.clear()
  }
}
