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
// useAuthorizeAgent Hook
// ============================================

interface AuthorizeAgentParams {
  agentAddress: Address;
  dailyLimit: bigint;
  perTxLimit: bigint;
  allowedChainsBitmap?: bigint;
  protocolWhitelist?: Address[];
  isActive?: boolean;
}

/**
 * Hook to authorize a new agent with a spending policy
 */
export function useAuthorizeAgent() {
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
   * Authorize an agent with spending policy
   */
  const authorizeAgent = async (
    params: AuthorizeAgentParams,
    callbacks?: MutationCallbacks
  ) => {
    const {
      agentAddress,
      dailyLimit,
      perTxLimit,
      allowedChainsBitmap = BigInt(0),
      protocolWhitelist = [],
      isActive = true,
    } = params;

    const toastId = toast.loading('Authorizing agent...');

    try {
      // Pass Policy as a tuple struct
      const policyTuple = {
        dailyLimit,
        perTxLimit,
        allowedChainsBitmap,
        protocolWhitelist,
        isActive,
        createdAt: BigInt(0), // Contract sets this to block.timestamp
      };

      writeContract(
        {
          address: POLICY_VAULT_ADDRESS,
          abi: PolicyVaultABI,
          functionName: 'authorizeAgent',
          args: [agentAddress, policyTuple],
          chainId: arcTestnet.id,
        },
        {
          onSuccess: () => {
            toast.success('Agent authorized successfully!', { id: toastId });
            if (address) {
              queryClient.invalidateQueries({
                queryKey: QUERY_KEYS.agents(address),
              });
            }
            callbacks?.onSuccess?.();
          },
          onError: (error) => {
            toast.error(`Authorization failed: ${error.message}`, { id: toastId });
            callbacks?.onError?.(error);
          },
        }
      );
    } catch (error) {
      toast.error('Authorization failed', { id: toastId });
      callbacks?.onError?.(error instanceof Error ? error : new Error('Unknown error'));
    }
  };

  return {
    authorizeAgent,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
    reset,
  };
}
