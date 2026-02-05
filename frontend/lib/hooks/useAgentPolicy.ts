'use client';

import { useReadContract } from 'wagmi';
import { useWallet } from './useWallet';
import { POLICY_VAULT_ADDRESS } from '@/lib/contracts/addresses';
import { PolicyVaultABI } from '@/lib/contracts/abi';
import { arcTestnet } from '@/lib/config/wagmi';
import { toPolicy, fromOperationTypes } from '@/lib/contracts/types';
import { QUERY_KEYS } from '@/lib/utils/constants';
import type { Policy, OperationType } from '@/types';
import type { Address } from 'viem';

// ============================================
// useAgentPolicy Hook
// ============================================

/**
 * Hook to get policy for a specific agent
 */
export function useAgentPolicy(agentAddress: Address | undefined) {
  const { address, isReady } = useWallet();

  const {
    data,
    isLoading,
    error,
    refetch,
  } = useReadContract({
    address: POLICY_VAULT_ADDRESS,
    abi: PolicyVaultABI,
    functionName: 'getAgentPolicy',
    args: address && agentAddress ? [address, agentAddress] : undefined,
    chainId: arcTestnet.id,
    query: {
      enabled: isReady && !!address && !!agentAddress,
      queryKey: agentAddress ? QUERY_KEYS.agentPolicy(agentAddress) : ['agentPolicy'],
      staleTime: 30_000,
    },
  });

  const policy: Policy | undefined = data
    ? toPolicy({
        dailyLimit: data[0],
        maxPerTransaction: data[1],
        allowedOperations: data[2],
        expiresAt: data[3],
      })
    : undefined;

  return {
    policy,
    dailyLimit: policy?.dailyLimit,
    maxPerTransaction: policy?.maxPerTransaction,
    allowedOperations: policy?.allowedOperations,
    expiresAt: policy?.expiresAt,
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
  const { address, isReady } = useWallet();

  const {
    data: remaining,
    isLoading,
    error,
    refetch,
  } = useReadContract({
    address: POLICY_VAULT_ADDRESS,
    abi: PolicyVaultABI,
    functionName: 'getRemainingDailyLimit',
    args: address && agentAddress ? [address, agentAddress] : undefined,
    chainId: arcTestnet.id,
    query: {
      enabled: isReady && !!address && !!agentAddress,
      staleTime: 10_000, // 10 seconds (changes frequently)
      refetchInterval: 30_000, // 30 seconds
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
  operationType: OperationType = 'transfer'
) {
  const { address, isReady } = useWallet();
  const opTypeNum = fromOperationTypes([operationType])[0];

  const {
    data: canSpend,
    isLoading,
    error,
    refetch,
  } = useReadContract({
    address: POLICY_VAULT_ADDRESS,
    abi: PolicyVaultABI,
    functionName: 'canSpend',
    args:
      address && agentAddress && amount !== undefined
        ? [address, agentAddress, amount, opTypeNum]
        : undefined,
    chainId: arcTestnet.id,
    query: {
      enabled: isReady && !!address && !!agentAddress && amount !== undefined,
    },
  });

  return {
    canSpend: canSpend ?? false,
    isLoading,
    error,
    refetch,
  };
}
