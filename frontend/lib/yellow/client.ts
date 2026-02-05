import type { Address } from 'viem';
import { YELLOW_WS_URL, CONNECTION_CONFIG, MESSAGE_TYPES } from './constants';
import type { YellowClientHandlers, ClearNodeMessage } from './types';

// ============================================
// Yellow Network WebSocket Client
// ============================================

/**
 * WebSocket client for Yellow Network state channels
 * Handles connection, reconnection, and message passing
 */
export class YellowClient {
  private ws: WebSocket | null = null;
  private handlers: YellowClientHandlers;
  private reconnectAttempts = 0;
  private pingInterval: NodeJS.Timeout | null = null;
  private pendingRequests = new Map<string, {
    resolve: (value: unknown) => void;
    reject: (error: Error) => void;
  }>();
  private address: Address | null = null;

  constructor(handlers: YellowClientHandlers = {}) {
    this.handlers = handlers;
  }

  // ============================================
  // Connection Management
  // ============================================

  /**
   * Connect to Yellow Network
   */
  async connect(address: Address): Promise<void> {
    this.address = address;

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Connection timeout'));
      }, CONNECTION_CONFIG.connectionTimeout);

      try {
        this.ws = new WebSocket(YELLOW_WS_URL);

        this.ws.onopen = () => {
          clearTimeout(timeout);
          this.reconnectAttempts = 0;
          this.startPingInterval();

          // Send connect message
          this.send({
            type: MESSAGE_TYPES.CONNECT,
            address,
          });

          this.handlers.onOpen?.();
          resolve();
        };

        this.ws.onclose = () => {
          this.stopPingInterval();
          this.handlers.onClose?.();
          this.attemptReconnect();
        };

        this.ws.onerror = (event) => {
          clearTimeout(timeout);
          const error = new Error('WebSocket error');
          this.handlers.onError?.(error);
          reject(error);
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event.data);
        };
      } catch (error) {
        clearTimeout(timeout);
        reject(error);
      }
    });
  }

  /**
   * Disconnect from Yellow Network
   */
  disconnect(): void {
    this.stopPingInterval();
    this.reconnectAttempts = CONNECTION_CONFIG.maxReconnectAttempts; // Prevent reconnection

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    // Reject all pending requests
    for (const [, { reject }] of this.pendingRequests) {
      reject(new Error('Connection closed'));
    }
    this.pendingRequests.clear();
  }

  /**
   * Check if connected
   */
  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  // ============================================
  // Session Operations
  // ============================================

  /**
   * Open a new state channel session
   */
  async openSession(agentAddress: Address, allocation: bigint): Promise<string> {
    const requestId = this.generateRequestId();

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(requestId, {
        resolve: (data) => resolve(data as string),
        reject,
      });

      this.send({
        type: MESSAGE_TYPES.OPEN_SESSION,
        id: requestId,
        agentAddress,
        allocation: allocation.toString(),
      });

      // Timeout for request
      setTimeout(() => {
        if (this.pendingRequests.has(requestId)) {
          this.pendingRequests.delete(requestId);
          reject(new Error('Open session timeout'));
        }
      }, 30000);
    });
  }

  /**
   * Close a session
   */
  async closeSession(sessionId: string): Promise<boolean> {
    const requestId = this.generateRequestId();

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(requestId, {
        resolve: () => resolve(true),
        reject,
      });

      this.send({
        type: MESSAGE_TYPES.CLOSE_SESSION,
        id: requestId,
        sessionId,
      });

      setTimeout(() => {
        if (this.pendingRequests.has(requestId)) {
          this.pendingRequests.delete(requestId);
          reject(new Error('Close session timeout'));
        }
      }, 30000);
    });
  }

  /**
   * Execute a transfer within a session
   */
  async transfer(sessionId: string, amount: bigint, target: Address): Promise<boolean> {
    const requestId = this.generateRequestId();

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(requestId, {
        resolve: () => resolve(true),
        reject,
      });

      this.send({
        type: MESSAGE_TYPES.TRANSFER,
        id: requestId,
        sessionId,
        amount: amount.toString(),
        target,
      });

      setTimeout(() => {
        if (this.pendingRequests.has(requestId)) {
          this.pendingRequests.delete(requestId);
          reject(new Error('Transfer timeout'));
        }
      }, 10000);
    });
  }

  // ============================================
  // Private Methods
  // ============================================

  private send(data: object): void {
    if (!this.isConnected) {
      throw new Error('Not connected');
    }

    this.ws!.send(JSON.stringify(data));
  }

  private handleMessage(data: string): void {
    try {
      const message = JSON.parse(data) as ClearNodeMessage;

      // Handle responses to pending requests
      if ('id' in message && message.id && this.pendingRequests.has(message.id)) {
        const { resolve, reject } = this.pendingRequests.get(message.id)!;
        this.pendingRequests.delete(message.id);

        if (message.type === 'error') {
          reject(new Error((message as { message: string }).message));
        } else if (message.type === 'session_opened') {
          resolve((message as { sessionId: string }).sessionId);
        } else {
          resolve(message);
        }
        return;
      }

      // Handle pong
      if (message.type === 'pong') {
        return;
      }

      // Forward to handler
      this.handlers.onMessage?.(message);
    } catch (error) {
      console.error('Failed to parse Yellow Network message:', error);
    }
  }

  private startPingInterval(): void {
    this.pingInterval = setInterval(() => {
      if (this.isConnected) {
        this.send({ type: MESSAGE_TYPES.PING });
      }
    }, CONNECTION_CONFIG.pingInterval);
  }

  private stopPingInterval(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= CONNECTION_CONFIG.maxReconnectAttempts) {
      return;
    }

    const delay = Math.min(
      CONNECTION_CONFIG.reconnectBaseDelay *
        Math.pow(CONNECTION_CONFIG.reconnectMultiplier, this.reconnectAttempts),
      CONNECTION_CONFIG.reconnectMaxDelay
    );

    this.reconnectAttempts++;

    setTimeout(() => {
      if (this.address) {
        this.connect(this.address).catch((error) => {
          console.error('Reconnection failed:', error);
        });
      }
    }, delay);
  }

  private generateRequestId(): string {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  }
}
