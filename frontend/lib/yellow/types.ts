import type { Address } from 'viem';
import type { Operation, OperationType } from '@/types';

// ============================================
// Yellow Network Message Types
// ============================================

/**
 * Base message structure for Yellow Network protocol
 */
export interface YellowMessage {
  type: string;
  id?: string;
  timestamp?: number;
}

/**
 * Connect message sent to establish connection
 */
export interface ConnectMessage extends YellowMessage {
  type: 'connect';
  address: Address;
  signature?: string;
}

/**
 * Open session request message
 */
export interface OpenSessionMessage extends YellowMessage {
  type: 'open_session';
  agentAddress: Address;
  allocation: string; // Bigint as string for JSON
}

/**
 * Close session request message
 */
export interface CloseSessionMessage extends YellowMessage {
  type: 'close_session';
  sessionId: string;
}

/**
 * Transfer request message
 */
export interface TransferMessage extends YellowMessage {
  type: 'transfer';
  sessionId: string;
  amount: string; // Bigint as string for JSON
  target: Address;
}

// ============================================
// Server Response Types
// ============================================

/**
 * Session opened response
 */
export interface SessionOpenedMessage extends YellowMessage {
  type: 'session_opened';
  sessionId: string;
  agentAddress: Address;
  allocation: string;
}

/**
 * Session closed response
 */
export interface SessionClosedMessage extends YellowMessage {
  type: 'session_closed';
  sessionId: string;
  spent: string;
  refunded: string;
}

/**
 * Transfer confirmed response
 */
export interface TransferConfirmedMessage extends YellowMessage {
  type: 'transfer_confirmed';
  sessionId: string;
  operationId: string;
  amount: string;
  target: Address;
}

/**
 * Operation notification
 */
export interface OperationMessage extends YellowMessage {
  type: 'operation';
  sessionId: string;
  operation: {
    id: string;
    type: OperationType;
    amount: string;
    target: string;
    status: 'pending' | 'confirmed' | 'failed';
    timestamp: number;
    estimatedGas: string;
  };
  gasSaved: number;
}

/**
 * Session state update
 */
export interface SessionUpdateMessage extends YellowMessage {
  type: 'session_update';
  sessionId: string;
  data: {
    balance: string;
    spent: string;
    operationCount: number;
    state: 'pending' | 'open' | 'closing' | 'closed';
    nonce: number;
  };
}

/**
 * Error response
 */
export interface ErrorMessage extends YellowMessage {
  type: 'error';
  code: string;
  message: string;
  details?: unknown;
}

// ============================================
// Client Handler Types
// ============================================

/**
 * Parsed message from Yellow Network
 */
export type ClearNodeMessage =
  | SessionOpenedMessage
  | SessionClosedMessage
  | TransferConfirmedMessage
  | OperationMessage
  | SessionUpdateMessage
  | ErrorMessage
  | { type: 'connected'; address: Address }
  | { type: 'pong' };

/**
 * Client event handlers
 */
export interface YellowClientHandlers {
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (error: Error) => void;
  onMessage?: (message: ClearNodeMessage) => void;
}
