import {
  getRequestId,
  getMethod,
  RPCMethod,
} from '@erc7824/nitrolite'
import { WS_READY_STATE, type WebSocketLike } from './types'

// ============================================
// Mock ClearNode
// ============================================

interface MockChannel {
  status: 'open' | 'closed'
  balance: string
  token: string
}

/**
 * Mock ClearNode server that implements WebSocketLike.
 * Simulates Nitrolite RPC auth flow, channel operations, and push notifications.
 */
export class MockClearNode implements WebSocketLike {
  readyState: number = WS_READY_STATE.CONNECTING
  onopen: ((ev: unknown) => void) | null = null
  onclose: ((ev: unknown) => void) | null = null
  onmessage: ((ev: { data: string }) => void) | null = null
  onerror: ((ev: unknown) => void) | null = null

  private channels = new Map<string, MockChannel>()
  private channelCounter = 0
  private balanceInterval: ReturnType<typeof setInterval> | null = null

  constructor(_url: string) {
    // Simulate async connection
    setTimeout(() => {
      this.readyState = WS_READY_STATE.OPEN
      this.onopen?.({})
    }, 50)
  }

  send(data: string): void {
    if (this.readyState !== WS_READY_STATE.OPEN) {
      throw new Error('WebSocket is not open')
    }

    try {
      const parsed = JSON.parse(data)
      const method = getMethod(parsed)
      const requestId = getRequestId(parsed)

      switch (method) {
        case RPCMethod.AuthRequest:
          this.handleAuthRequest(requestId ?? 0)
          break
        case RPCMethod.AuthVerify:
          this.handleAuthVerify(requestId ?? 0)
          break
        case RPCMethod.CreateChannel:
          this.handleCreateChannel(parsed, requestId ?? 0)
          break
        case RPCMethod.CloseChannel:
          this.handleCloseChannel(parsed, requestId ?? 0)
          break
        case RPCMethod.Transfer:
          this.handleTransfer(parsed, requestId ?? 0)
          break
        case RPCMethod.GetChannels:
          this.handleGetChannels(requestId ?? 0)
          break
        case RPCMethod.Ping:
          this.handlePing(requestId ?? 0)
          break
        default:
          this.sendError(requestId ?? 0, `Unknown method: ${method}`)
          break
      }
    } catch (error) {
      console.error('MockClearNode: Failed to parse message:', error)
    }
  }

  close(): void {
    this.readyState = WS_READY_STATE.CLOSED
    if (this.balanceInterval) {
      clearInterval(this.balanceInterval)
      this.balanceInterval = null
    }
    this.onclose?.({})
  }

  // ============================================
  // RPC Handlers
  // ============================================

  private handleAuthRequest(requestId: number): void {
    // Respond with auth_challenge after short delay
    setTimeout(() => {
      this.respond(requestId, RPCMethod.AuthChallenge, {
        challengeMessage: `mock-challenge-${Date.now()}`,
      })
    }, 100)
  }

  private handleAuthVerify(requestId: number): void {
    // Respond with auth_verify success
    setTimeout(() => {
      this.respond(requestId, RPCMethod.AuthVerify, {
        success: true,
      })
    }, 150)
  }

  private handleCreateChannel(parsed: unknown, requestId: number): void {
    const delay = 200 + Math.random() * 200

    setTimeout(() => {
      this.channelCounter++
      const channelId = `0x${this.channelCounter.toString(16).padStart(64, '0')}`

      this.channels.set(channelId, {
        status: 'open',
        balance: '1000000000', // 1000 USDC
        token: '0x0000000000000000000000000000000000000000',
      })

      this.respond(requestId, RPCMethod.CreateChannel, {
        channel_id: channelId,
        status: 'open',
      })

      // Start periodic balance updates if this is the first channel
      if (this.channels.size === 1) {
        this.startBalanceUpdates()
      }
    }, delay)
  }

  private handleCloseChannel(parsed: unknown, requestId: number): void {
    setTimeout(() => {
      // Find channel from request params — extract from Nitrolite format
      const channelId = this.extractChannelId(parsed)

      if (channelId && this.channels.has(channelId)) {
        this.channels.get(channelId)!.status = 'closed'
        this.channels.delete(channelId)
      }

      this.respond(requestId, RPCMethod.CloseChannel, {
        channel_id: channelId || '0x00',
        status: 'closed',
      })

      // Stop balance updates if no more open channels
      if (this.channels.size === 0 && this.balanceInterval) {
        clearInterval(this.balanceInterval)
        this.balanceInterval = null
      }
    }, 200)
  }

  private handleTransfer(parsed: unknown, requestId: number): void {
    const delay = 100 + Math.random() * 200

    setTimeout(() => {
      this.respond(requestId, RPCMethod.Transfer, {
        success: true,
      })

      // Schedule balance update 500ms later
      setTimeout(() => {
        for (const [channelId, channel] of this.channels) {
          if (channel.status === 'open') {
            const currentBalance = BigInt(channel.balance)
            const newBalance = currentBalance > BigInt(1000000)
              ? currentBalance - BigInt(1000000)
              : currentBalance
            channel.balance = newBalance.toString()

            this.pushNotification(RPCMethod.BalanceUpdate, {
              channel_id: channelId,
              balance: channel.balance,
              asset: 'usdc',
            })
            break
          }
        }
      }, 500)
    }, delay)
  }

  private handleGetChannels(requestId: number): void {
    const channelList = Array.from(this.channels.entries()).map(([id, ch]) => ({
      channel_id: id,
      status: ch.status,
      balance: ch.balance,
    }))

    this.respond(requestId, RPCMethod.GetChannels, { channels: channelList })
  }

  private handlePing(requestId: number): void {
    this.respond(requestId, RPCMethod.Pong, {})
  }

  // ============================================
  // Response Helpers
  // ============================================

  private respond(requestId: number, method: string, params: Record<string, unknown>): void {
    if (this.readyState !== WS_READY_STATE.OPEN) return

    const timestamp = Math.floor(Date.now() / 1000)
    const response = JSON.stringify({
      res: [requestId, method, [params], timestamp],
      sig: ['0x00'],
    })

    this.onmessage?.({ data: response })
  }

  private pushNotification(method: string, params: Record<string, unknown>): void {
    if (this.readyState !== WS_READY_STATE.OPEN) return

    const timestamp = Math.floor(Date.now() / 1000)
    const notification = JSON.stringify({
      res: [0, method, [params], timestamp],
      sig: ['0x00'],
    })

    this.onmessage?.({ data: notification })
  }

  private sendError(requestId: number, message: string): void {
    this.respond(requestId, RPCMethod.Error, {
      code: -1,
      message,
    })
  }

  // ============================================
  // Periodic Notifications
  // ============================================

  private startBalanceUpdates(): void {
    this.balanceInterval = setInterval(() => {
      for (const [channelId, channel] of this.channels) {
        if (channel.status === 'open') {
          this.pushNotification(RPCMethod.BalanceUpdate, {
            channel_id: channelId,
            balance: channel.balance,
            asset: 'usdc',
          })
        }
      }
    }, 10_000)
  }

  // ============================================
  // Utilities
  // ============================================

  private extractChannelId(parsed: unknown): string | null {
    try {
      // Nitrolite format: { req: [requestId, method, [params], timestamp], sig: [...] }
      const req = (parsed as { req?: unknown[] })?.req
      if (Array.isArray(req) && Array.isArray(req[2]) && req[2][0]) {
        const params = req[2][0] as { channel_id?: string }
        return params.channel_id || null
      }
    } catch {
      // Ignore parse errors
    }
    return null
  }
}
