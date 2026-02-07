'use client';

import { useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { useQueryClient } from '@tanstack/react-query';
import { useYellow } from '@/components/providers/YellowProvider';
import { useWallet } from './useWallet';
import { useSessionStore } from '@/lib/stores/useSessionStore';
import { POLICY_VAULT_ADDRESS } from '@/lib/contracts/addresses';
import { PolicyVaultABI } from '@/lib/contracts/abi';
import { arcTestnet } from '@/lib/config/wagmi';
import { toSession } from '@/lib/contracts/types';
import { QUERY_KEYS } from '@/lib/utils/constants';
import toast from 'react-hot-toast';
import type { MutationCallbacks, Session } from '@/types';
import type { Address } from 'viem';

// ============================================
// useSession Hook
// ============================================

/**
 * Hook to manage state channel sessions
 * Handles both off-chain (Yellow Network) and on-chain operations
 */
export function useSession() {
  const { address } = useWallet();
  const { openSession: openYellowSession, closeSession: closeYellowSession } = useYellow();
  const { sessions, getSession } = useSessionStore();
  const queryClient = useQueryClient();

  // On-chain open session
  const {
    data: openHash,
    writeContract: writeOpenSession,
    isPending: isOpenPending,
    error: openError,
    reset: resetOpen,
  } = useWriteContract();

  const {
    isLoading: isOpenConfirming,
    isSuccess: isOpenSuccess,
  } = useWaitForTransactionReceipt({
    hash: openHash,
  });

  // On-chain close session
  const {
    data: closeHash,
    writeContract: writeCloseSession,
    isPending: isClosePending,
    error: closeError,
    reset: resetClose,
  } = useWriteContract();

  const {
    isLoading: isCloseConfirming,
    isSuccess: isCloseSuccess,
  } = useWaitForTransactionReceipt({
    hash: closeHash,
  });

  /**
   * Open a new session (on-chain + off-chain)
   * Contract: openSession(bytes32 channelId, uint256 allocation)
   */
  const openSession = async (
    channelId: `0x${string}`,
    allocation: bigint,
    callbacks?: MutationCallbacks
  ) => {
    const toastId = toast.loading('Opening session...');

    try {
      writeOpenSession(
        {
          address: POLICY_VAULT_ADDRESS,
          abi: PolicyVaultABI,
          functionName: 'openSession',
          args: [channelId, allocation],
          chainId: arcTestnet.id,
        },
        {
          onSuccess: async () => {
            // Then open off-chain with Yellow Network
            const sessionId = await openYellowSession(address as Address, allocation);

            if (sessionId) {
              toast.success('Session opened!', { id: toastId });
              if (address) {
                queryClient.invalidateQueries({
                  queryKey: QUERY_KEYS.vaultBalance(address),
                });
              }
              callbacks?.onSuccess?.();
            } else {
              toast.error('Failed to open off-chain session', { id: toastId });
              callbacks?.onError?.(new Error('Failed to open off-chain session'));
            }
          },
          onError: (error) => {
            toast.error(`Failed to open session: ${error.message}`, { id: toastId });
            callbacks?.onError?.(error);
          },
        }
      );
    } catch (error) {
      toast.error('Failed to open session', { id: toastId });
      callbacks?.onError?.(error instanceof Error ? error : new Error('Unknown error'));
    }
  };

  /**
   * Close a session and settle on-chain
   * Contract: closeSession(bytes32 sessionId, uint256 finalSpent)
   */
  const closeSession = async (
    sessionId: string,
    spent: bigint,
    callbacks?: MutationCallbacks
  ) => {
    const toastId = toast.loading('Closing session...');

    try {
      // First close off-chain
      const closed = await closeYellowSession(sessionId);

      if (!closed) {
        toast.error('Failed to close off-chain session', { id: toastId });
        callbacks?.onError?.(new Error('Failed to close off-chain session'));
        return;
      }

      // Then settle on-chain
      writeCloseSession(
        {
          address: POLICY_VAULT_ADDRESS,
          abi: PolicyVaultABI,
          functionName: 'closeSession',
          args: [sessionId as `0x${string}`, spent],
          chainId: arcTestnet.id,
        },
        {
          onSuccess: () => {
            toast.success('Session closed and settled!', { id: toastId });
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
      toast.error('Failed to close session', { id: toastId });
      callbacks?.onError?.(error instanceof Error ? error : new Error('Unknown error'));
    }
  };

  /**
   * Reset all state
   */
  const reset = () => {
    resetOpen();
    resetClose();
  };

  return {
    // Sessions list
    sessions,
    getSession,
    activeSessions: sessions.filter((s) => s.state === 'open'),
    activeSessionCount: sessions.filter((s) => s.state === 'open').length,

    // Open session
    openSession,
    openHash,
    isOpenPending,
    isOpenConfirming,
    isOpenSuccess,
    openError,

    // Close session
    closeSession,
    closeHash,
    isClosePending,
    isCloseConfirming,
    isCloseSuccess,
    closeError,

    // Combined state
    isPending: isOpenPending || isClosePending,
    isConfirming: isOpenConfirming || isCloseConfirming,

    // Actions
    reset,
  };
}

// ============================================
// useSessionInfo Hook
// ============================================

/**
 * Hook to get on-chain session info
 */
export function useSessionInfo(sessionId: string | undefined) {
  const {
    data,
    isLoading,
    error,
    refetch,
  } = useReadContract({
    address: POLICY_VAULT_ADDRESS,
    abi: PolicyVaultABI,
    functionName: 'getSessionInfo',
    args: sessionId ? [sessionId as `0x${string}`] : undefined,
    chainId: arcTestnet.id,
    query: {
      enabled: !!sessionId,
    },
  });

  const sessionData = data as {
    channelId: string;
    agent: Address;
    allocation: bigint;
    spent: bigint;
    isActive: boolean;
    openedAt: bigint;
  } | undefined;

  const session = sessionData && sessionId
    ? toSession(sessionId, sessionData)
    : undefined;

  return {
    session,
    channelId: session?.channelId,
    agent: session?.agentAddress,
    allocation: session?.allocation,
    spent: session?.spent,
    isActive: session?.isActive,
    openedAt: session?.openedAt,
    isLoading,
    error,
    refetch,
  };
}
