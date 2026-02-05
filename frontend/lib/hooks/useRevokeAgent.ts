'use client';

import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { useQueryClient } from '@tanstack/react-query';
import { useWallet } from './useWallet';
import { POLICY_VAULT_ADDRESS } from '@/lib/contracts/addresses';
import { PolicyVaultABI } from '@/lib/contracts/abi';
import { arcTestnet } from '@/lib/config/wagmi';
import { QUERY_KEYS } from '@/lib/utils/constants';
import toast from 'react-hot-toast';
import type { MutationCallbacks } from '@/types';
import type { Address } from 'viem';

// ============================================
// useRevokeAgent Hook
// ============================================

/**
 * Hook to revoke an agent's authorization
 * This permanently removes the agent's ability to spend from the vault
 */
export function useRevokeAgent() {
  const { address } = useWallet();
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
   * Revoke an agent's authorization
   */
  const revokeAgent = async (agentAddress: Address, callbacks?: MutationCallbacks) => {
    const toastId = toast.loading('Revoking agent...');

    try {
      writeContract(
        {
          address: POLICY_VAULT_ADDRESS,
          abi: PolicyVaultABI,
          functionName: 'revokeAgent',
          args: [agentAddress],
          chainId: arcTestnet.id,
        },
        {
          onSuccess: () => {
            toast.success('Agent revoked successfully!', { id: toastId });
            // Invalidate agents list
            if (address) {
              queryClient.invalidateQueries({
                queryKey: QUERY_KEYS.agents(address),
              });
            }
            callbacks?.onSuccess?.();
          },
          onError: (error) => {
            toast.error(`Revocation failed: ${error.message}`, { id: toastId });
            callbacks?.onError?.(error);
          },
        }
      );
    } catch (error) {
      toast.error('Revocation failed', { id: toastId });
      callbacks?.onError?.(error instanceof Error ? error : new Error('Unknown error'));
    }
  };

  return {
    revokeAgent,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
    reset,
  };
}
