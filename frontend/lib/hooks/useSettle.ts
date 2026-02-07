'use client';

import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { useQueryClient } from '@tanstack/react-query';
import { useWallet } from './useWallet';
import { useSessionStore } from '@/lib/stores/useSessionStore';
import { POLICY_VAULT_ADDRESS } from '@/lib/contracts/addresses';
import { PolicyVaultABI } from '@/lib/contracts/abi';
import { arcTestnet } from '@/lib/config/wagmi';
import { QUERY_KEYS } from '@/lib/utils/constants';
import toast from 'react-hot-toast';
import type { MutationCallbacks } from '@/types';

// ============================================
// useSettle Hook
// ============================================

/**
 * Hook to settle a session on-chain
 * This finalizes the session and returns unused funds to the vault
 */
export function useSettle() {
  const { address } = useWallet();
  const { removeSession } = useSessionStore();
  const queryClient = useQueryClient();

  const {
    data: hash,
    writeContract,
    isPending,
    error,
    reset,
  } = useWriteContract();

  const {
    isLoading: isConfirming,
    isSuccess,
  } = useWaitForTransactionReceipt({
    hash,
  });

  /**
   * Settle a session on-chain
   * @param sessionId - The session ID (bytes32)
   * @param spent - Total amount spent in the session
   */
  const settle = async (
    sessionId: string,
    spent: bigint,
    callbacks?: MutationCallbacks
  ) => {
    const toastId = toast.loading('Settling session on-chain...');

    try {
      writeContract(
        {
          address: POLICY_VAULT_ADDRESS,
          abi: PolicyVaultABI,
          functionName: 'closeSession',
          args: [sessionId as `0x${string}`, spent],
          chainId: arcTestnet.id,
        },
        {
          onSuccess: () => {
            toast.success('Session settled!', { id: toastId });

            // Remove from local store
            removeSession(sessionId);

            // Invalidate balance queries
            if (address) {
              queryClient.invalidateQueries({
                queryKey: QUERY_KEYS.vaultBalance(address),
              });
            }

            callbacks?.onSuccess?.();
          },
          onError: (error) => {
            toast.error(`Settlement failed: ${error.message}`, { id: toastId });
            callbacks?.onError?.(error);
          },
        }
      );
    } catch (error) {
      toast.error('Settlement failed', { id: toastId });
      callbacks?.onError?.(error instanceof Error ? error : new Error('Unknown error'));
    }
  };

  return {
    settle,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
    reset,
  };
}
