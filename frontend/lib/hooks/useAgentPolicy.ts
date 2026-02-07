'use client';

import { useReadContract } from 'wagmi';
import { useWallet } from './useWallet';
import { POLICY_VAULT_ADDRESS } from '@/lib/contracts/addresses';
import { PolicyVaultABI } from '@/lib/contracts/abi';
import { arcTestnet } from '@/lib/config/wagmi';
import { toPolicy } from '@/lib/contracts/types';
import type { Policy } from '@/types';
import type { Address } from 'viem';

// ============================================
// useAgentPolicy Hook
// ============================================

/**
 * Hook to get policy for a specific agent
 */
export function useAgentPolicy(agentAddress: Address | undefined) {
  const { isReady } = useWallet();

  const {
    data,
    isLoading,
    error,
    refetch,
  } = useReadContract({
    address: POLICY_VAULT_ADDRESS,
    abi: PolicyVaultABI,
    functionName: 'getAgentPolicy',
    args: agentAddress ? [agentAddress] : undefined,
    chainId: arcTestnet.id,
    query: {
      enabled: isReady && !!agentAddress,
      staleTime: 30_000,
    },
  });

  const rawPolicy = data as {
    dailyLimit: bigint;
    perTxLimit: bigint;
    allowedChainsBitmap: bigint;
    protocolWhitelist: readonly Address[];
    isActive: boolean;
    createdAt: bigint;
  } | undefined;

  const policy: Policy | undefined = rawPolicy
    ? toPolicy(rawPolicy)
    : undefined;

  return {
    policy,
    dailyLimit: policy?.dailyLimit,
    perTxLimit: policy?.perTxLimit,
    isActive: policy?.isActive,
    createdAt: policy?.createdAt,
    isLoading,
    error,
    refetch,
  };
}

// ============================================
// useRemainingDailyLimit Hook
// ============================================

/**
 * Hook to get remaining daily limit for an agent
 */
export function useRemainingDailyLimit(agentAddress: Address | undefined) {
  const { isReady } = useWallet();

  const {
    data: remaining,
    isLoading,
    error,
    refetch,
  } = useReadContract({
    address: POLICY_VAULT_ADDRESS,
    abi: PolicyVaultABI,
    functionName: 'getRemainingDailyLimit',
    args: agentAddress ? [agentAddress] : undefined,
    chainId: arcTestnet.id,
    query: {
      enabled: isReady && !!agentAddress,
      staleTime: 10_000,
      refetchInterval: 30_000,
    },
  });

  return {
    remaining,
    isLoading,
    error,
    refetch,
  };
}

// ============================================
// useCanSpend Hook
// ============================================

/**
 * Hook to check if an agent can spend a specific amount
 */
export function useCanSpend(
  agentAddress: Address | undefined,
  amount: bigint | undefined,
) {
  const { isReady } = useWallet();

  const {
    data,
    isLoading,
    error,
    refetch,
  } = useReadContract({
    address: POLICY_VAULT_ADDRESS,
    abi: PolicyVaultABI,
    functionName: 'canSpend',
    args:
      agentAddress && amount !== undefined
        ? [agentAddress, amount]
        : undefined,
    chainId: arcTestnet.id,
    query: {
      enabled: isReady && !!agentAddress && amount !== undefined,
    },
  });

  return {
    canSpend: (data as readonly [boolean, string] | undefined)?.[0] ?? false,
    reason: (data as readonly [boolean, string] | undefined)?.[1],
    isLoading,
    error,
    refetch,
  };
}
