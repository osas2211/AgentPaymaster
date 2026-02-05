'use client';

import { useReadContract } from 'wagmi';
import { useWallet } from './useWallet';
import { POLICY_VAULT_ADDRESS } from '@/lib/contracts/addresses';
import { PolicyVaultABI } from '@/lib/contracts/abi';
import { arcTestnet } from '@/lib/config/wagmi';
import { QUERY_KEYS } from '@/lib/utils/constants';
import type { VaultBalance } from '@/types';

// ============================================
// useVaultBalance Hook
// ============================================

/**
 * Hook to read vault balance for the connected wallet
 * Returns total, available, and allocated amounts
 */
export function useVaultBalance() {
  const { address, isReady } = useWallet();

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useReadContract({
    address: POLICY_VAULT_ADDRESS,
    abi: PolicyVaultABI,
    functionName: 'getBalance',
    args: address ? [address] : undefined,
    chainId: arcTestnet.id,
    query: {
      enabled: isReady && !!address,
      queryKey: address ? QUERY_KEYS.vaultBalance(address) : ['vaultBalance'],
      staleTime: 30_000, // 30 seconds
      refetchInterval: 60_000, // 1 minute
    },
  });

  // Parse the response
  const balance: VaultBalance | undefined = data
    ? {
        total: data[0],
        available: data[1],
        allocated: data[2],
      }
    : undefined;

  return {
    // Balance data
    balance,
    total: balance?.total,
    available: balance?.available,
    allocated: balance?.allocated,

    // Status
    isLoading,
    isError,
    error,

    // Actions
    refetch,
  };
}
