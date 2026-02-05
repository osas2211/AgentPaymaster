import type { Address } from 'viem';
import type { Agent, Policy, Session, OperationType, SessionStatus } from '@/types';

// ============================================
// Operation Type Mapping
// ============================================

const OPERATION_TYPE_MAP: Record<number, OperationType> = {
  0: 'transfer',
  1: 'swap_request',
  2: 'approve',
  3: 'state_update',
  4: 'balance_check',
  5: 'policy_check',
};

const OPERATION_TYPE_REVERSE: Record<OperationType, number> = {
  transfer: 0,
  swap_request: 1,
  approve: 2,
  state_update: 3,
  balance_check: 4,
  policy_check: 5,
};

const SESSION_STATUS_MAP: Record<number, SessionStatus> = {
  0: 'opening',
  1: 'active',
  2: 'closing',
  3: 'closed',
  4: 'settled',
};

// ============================================
// Type Converters
// ============================================

/**
 * Convert contract operation type array to OperationType[]
 */
export function toOperationTypes(operations: readonly number[]): OperationType[] {
  return operations
    .map((op) => OPERATION_TYPE_MAP[op])
    .filter((op): op is OperationType => op !== undefined);
}

/**
 * Convert OperationType[] to contract format
 */
export function fromOperationTypes(operations: OperationType[]): number[] {
  return operations.map((op) => OPERATION_TYPE_REVERSE[op]);
}

/**
 * Convert contract policy data to Policy type
 */
export function toPolicy(data: {
  dailyLimit: bigint;
  maxPerTransaction: bigint;
  allowedOperations: readonly number[];
  expiresAt: bigint;
}): Policy {
  return {
    dailyLimit: data.dailyLimit,
    maxPerTransaction: data.maxPerTransaction,
    allowedOperations: toOperationTypes(data.allowedOperations),
    expiresAt: Number(data.expiresAt),
  };
}

/**
 * Convert contract agent info + policy to Agent type
 */
export function toAgent(
  address: Address,
  name: string,
  info: {
    isAuthorized: boolean;
    isPaused: boolean;
    totalSpent: bigint;
    authorizedAt: bigint;
  },
  policy: Policy
): Agent {
  return {
    address,
    name,
    policy,
    isPaused: info.isPaused,
    totalSpent: info.totalSpent,
    authorizedAt: Number(info.authorizedAt),
  };
}

/**
 * Convert contract session data to Session type
 */
export function toSession(
  id: string,
  data: {
    owner: Address;
    agent: Address;
    allocation: bigint;
    spent: bigint;
    status: number;
    openedAt: bigint;
    closedAt: bigint;
  }
): Session {
  return {
    id,
    agentAddress: data.agent,
    allocation: data.allocation,
    spent: data.spent,
    status: SESSION_STATUS_MAP[data.status] || 'active',
    openedAt: Number(data.openedAt),
    closedAt: Number(data.closedAt),
    operationCount: 0, // Will be updated from off-chain data
  };
}

/**
 * Convert session status to contract format
 */
export function fromSessionStatus(status: SessionStatus): number {
  const reverse: Record<SessionStatus, number> = {
    opening: 0,
    active: 1,
    closing: 2,
    closed: 3,
    settled: 4,
  };
  return reverse[status];
}
