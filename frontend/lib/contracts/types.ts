import type { Address } from 'viem';
import type { Agent, Policy, Session } from '@/types';

// ============================================
// Type Converters — contract structs to frontend types
// ============================================

/**
 * Convert contract Policy struct to frontend Policy type
 * Contract returns: (dailyLimit, perTxLimit, allowedChainsBitmap, protocolWhitelist, isActive, createdAt)
 */
export function toPolicy(data: {
  dailyLimit: bigint;
  perTxLimit: bigint;
  allowedChainsBitmap: bigint;
  protocolWhitelist: readonly Address[];
  isActive: boolean;
  createdAt: bigint;
}): Policy {
  return {
    dailyLimit: data.dailyLimit,
    perTxLimit: data.perTxLimit,
    allowedChainsBitmap: data.allowedChainsBitmap,
    protocolWhitelist: data.protocolWhitelist,
    isActive: data.isActive,
    createdAt: Number(data.createdAt),
  };
}

/**
 * Convert contract Agent struct to frontend Agent type
 * Contract returns: (policy, spentToday, lastSpendTimestamp, totalSpent, sessionCount)
 * address and name are added by the hook
 */
export function toAgent(
  address: Address,
  name: string,
  data: {
    policy: {
      dailyLimit: bigint;
      perTxLimit: bigint;
      allowedChainsBitmap: bigint;
      protocolWhitelist: readonly Address[];
      isActive: boolean;
      createdAt: bigint;
    };
    spentToday: bigint;
    lastSpendTimestamp: bigint;
    totalSpent: bigint;
    sessionCount: bigint;
  }
): Agent {
  return {
    address,
    name,
    policy: toPolicy(data.policy),
    spentToday: data.spentToday,
    lastSpendTimestamp: Number(data.lastSpendTimestamp),
    totalSpent: data.totalSpent,
    sessionCount: Number(data.sessionCount),
  };
}

/**
 * Convert contract Session struct to frontend Session type
 * Contract returns: (channelId, agent, allocation, spent, isActive, openedAt)
 */
export function toSession(
  id: string,
  data: {
    channelId: string;
    agent: Address;
    allocation: bigint;
    spent: bigint;
    isActive: boolean;
    openedAt: bigint;
  }
): Session {
  return {
    id,
    channelId: data.channelId,
    agentAddress: data.agent,
    allocation: data.allocation,
    spent: data.spent,
    isActive: data.isActive,
    openedAt: Number(data.openedAt),
  };
}
