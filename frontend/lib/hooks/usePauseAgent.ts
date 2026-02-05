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
// usePauseAgent Hook
// ============================================

/**
 * Hook to pause/resume an agent
 * Pausing temporarily stops the agent from spending, resuming allows them to continue
 */
export function usePauseAgent() {
  const { address } = useWallet();
  const queryClient = useQueryClient();

  // Pause contract
  const {
    data: pauseHash,
    writeContract: writePause,
    isPending: isPausePending,
    error: pauseError,
    reset: resetPause,
  } = useWriteContract();

  // Wait for pause
  const {
    isLoading: isPauseConfirming,
    isSuccess: isPauseSuccess,
  } = useWaitForTransactionReceipt({
    hash: pauseHash,
  });

  // Resume contract
  const {
    data: resumeHash,
    writeContract: writeResume,
    isPending: isResumePending,
    error: resumeError,
    reset: resetResume,
  } = useWriteContract();

  // Wait for resume
  const {
    isLoading: isResumeConfirming,
    isSuccess: isResumeSuccess,
  } = useWaitForTransactionReceipt({
    hash: resumeHash,
  });

  /**
   * Invalidate agent queries after state change
   */
  const invalidateAgents = () => {
    if (address) {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.agents(address),
      });
    }
  };

  /**
   * Pause an agent
   */
  const pauseAgent = async (agentAddress: Address, callbacks?: MutationCallbacks) => {
    const toastId = toast.loading('Pausing agent...');

    try {
      writePause(
        {
          address: POLICY_VAULT_ADDRESS,
          abi: PolicyVaultABI,
          functionName: 'pauseAgent',
          args: [agentAddress],
          chainId: arcTestnet.id,
        },
        {
          onSuccess: () => {
            toast.success('Agent paused!', { id: toastId });
            invalidateAgents();
            callbacks?.onSuccess?.();
          },
          onError: (error) => {
            toast.error(`Failed to pause: ${error.message}`, { id: toastId });
            callbacks?.onError?.(error);
          },
        }
      );
    } catch (error) {
      toast.error('Failed to pause agent', { id: toastId });
      callbacks?.onError?.(error instanceof Error ? error : new Error('Unknown error'));
    }
  };

  /**
   * Resume a paused agent
   */
  const resumeAgent = async (agentAddress: Address, callbacks?: MutationCallbacks) => {
    const toastId = toast.loading('Resuming agent...');

    try {
      writeResume(
        {
          address: POLICY_VAULT_ADDRESS,
          abi: PolicyVaultABI,
          functionName: 'resumeAgent',
          args: [agentAddress],
          chainId: arcTestnet.id,
        },
        {
          onSuccess: () => {
            toast.success('Agent resumed!', { id: toastId });
            invalidateAgents();
            callbacks?.onSuccess?.();
          },
          onError: (error) => {
            toast.error(`Failed to resume: ${error.message}`, { id: toastId });
            callbacks?.onError?.(error);
          },
        }
      );
    } catch (error) {
      toast.error('Failed to resume agent', { id: toastId });
      callbacks?.onError?.(error instanceof Error ? error : new Error('Unknown error'));
    }
  };

  /**
   * Toggle agent pause state
   */
  const togglePause = async (
    agentAddress: Address,
    isPaused: boolean,
    callbacks?: MutationCallbacks
  ) => {
    if (isPaused) {
      await resumeAgent(agentAddress, callbacks);
    } else {
      await pauseAgent(agentAddress, callbacks);
    }
  };

  /**
   * Reset all state
   */
  const reset = () => {
    resetPause();
    resetResume();
  };

  return {
    // Pause
    pauseAgent,
    pauseHash,
    isPausePending,
    isPauseConfirming,
    isPauseSuccess,
    pauseError,

    // Resume
    resumeAgent,
    resumeHash,
    isResumePending,
    isResumeConfirming,
    isResumeSuccess,
    resumeError,

    // Toggle
    togglePause,

    // Combined state
    isPending: isPausePending || isResumePending,
    isConfirming: isPauseConfirming || isResumeConfirming,

    // Actions
    reset,
  };
}
