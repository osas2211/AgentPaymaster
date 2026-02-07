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

// ============================================
// useVaultWithdraw Hook
// ============================================

/**
 * Hook to handle USDC withdrawal from vault
 * Supports regular withdraw and emergency withdraw
 */
export function useVaultWithdraw() {
  const { address } = useWallet();
  const queryClient = useQueryClient();

  // Withdraw contract
  const {
    data: withdrawHash,
    writeContract: writeWithdraw,
    isPending: isWithdrawPending,
    error: withdrawError,
    reset: resetWithdraw,
  } = useWriteContract();

  // Wait for withdraw
  const {
    isLoading: isWithdrawConfirming,
    isSuccess: isWithdrawSuccess,
  } = useWaitForTransactionReceipt({
    hash: withdrawHash,
  });

  // Emergency withdraw contract
  const {
    data: emergencyHash,
    writeContract: writeEmergency,
    isPending: isEmergencyPending,
    error: emergencyError,
    reset: resetEmergency,
  } = useWriteContract();

  // Wait for emergency withdraw
  const {
    isLoading: isEmergencyConfirming,
    isSuccess: isEmergencySuccess,
  } = useWaitForTransactionReceipt({
    hash: emergencyHash,
  });

  /**
   * Invalidate balance queries after successful withdrawal
   */
  const invalidateBalances = () => {
    if (address) {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.vaultBalance(address),
      });
    }
  };

  /**
   * Withdraw specified amount from vault
   */
  const withdraw = async (amount: bigint, callbacks?: MutationCallbacks) => {
    const toastId = toast.loading('Withdrawing USDC...');

    try {
      writeWithdraw(
        {
          address: POLICY_VAULT_ADDRESS,
          abi: PolicyVaultABI,
          functionName: 'withdraw',
          args: [amount],
          chainId: arcTestnet.id,
        },
        {
          onSuccess: () => {
            toast.success('Withdrawal successful!', { id: toastId });
            invalidateBalances();
            callbacks?.onSuccess?.();
          },
          onError: (error) => {
            toast.error(`Withdrawal failed: ${error.message}`, { id: toastId });
            callbacks?.onError?.(error);
          },
        }
      );
    } catch (error) {
      toast.error('Withdrawal failed', { id: toastId });
      callbacks?.onError?.(error instanceof Error ? error : new Error('Unknown error'));
    }
  };

  /**
   * Emergency withdraw all available funds
   */
  const emergencyWithdraw = async (callbacks?: MutationCallbacks) => {
    const toastId = toast.loading('Emergency withdrawing...');

    try {
      writeEmergency(
        {
          address: POLICY_VAULT_ADDRESS,
          abi: PolicyVaultABI,
          functionName: 'emergencyWithdrawAll',
          args: [],
          chainId: arcTestnet.id,
        },
        {
          onSuccess: () => {
            toast.success('Emergency withdrawal successful!', { id: toastId });
            invalidateBalances();
            callbacks?.onSuccess?.();
          },
          onError: (error) => {
            toast.error(`Emergency withdrawal failed: ${error.message}`, { id: toastId });
            callbacks?.onError?.(error);
          },
        }
      );
    } catch (error) {
      toast.error('Emergency withdrawal failed', { id: toastId });
      callbacks?.onError?.(error instanceof Error ? error : new Error('Unknown error'));
    }
  };

  /**
   * Reset all state
   */
  const reset = () => {
    resetWithdraw();
    resetEmergency();
  };

  return {
    // Withdraw
    withdraw,
    withdrawHash,
    isWithdrawPending,
    isWithdrawConfirming,
    isWithdrawSuccess,
    withdrawError,

    // Emergency withdraw
    emergencyWithdraw,
    emergencyHash,
    isEmergencyPending,
    isEmergencyConfirming,
    isEmergencySuccess,
    emergencyError,

    // Combined state
    isPending: isWithdrawPending || isEmergencyPending,
    isConfirming: isWithdrawConfirming || isEmergencyConfirming,

    // Actions
    reset,
  };
}
