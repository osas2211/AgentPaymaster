'use client';

import { useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { useQueryClient } from '@tanstack/react-query';
import { useWallet } from './useWallet';
import { POLICY_VAULT_ADDRESS, USDC_ADDRESS } from '@/lib/contracts/addresses';
import { PolicyVaultABI, ERC20ABI } from '@/lib/contracts/abi';
import { arcTestnet } from '@/lib/config/wagmi';
import { QUERY_KEYS } from '@/lib/utils/constants';
import toast from 'react-hot-toast';
import type { MutationCallbacks } from '@/types';

// ============================================
// useVaultDeposit Hook
// ============================================

/**
 * Hook to handle USDC deposit into vault
 * Handles approval check, approve transaction, and deposit transaction
 */
export function useVaultDeposit() {
  const { address, isReady } = useWallet();
  const queryClient = useQueryClient();

  // Read current allowance
  const {
    data: allowance,
    refetch: refetchAllowance,
  } = useReadContract({
    address: USDC_ADDRESS,
    abi: ERC20ABI,
    functionName: 'allowance',
    args: address ? [address, POLICY_VAULT_ADDRESS] : undefined,
    chainId: arcTestnet.id,
    query: {
      enabled: isReady && !!address,
    },
  });

  // Approve contract
  const {
    data: approveHash,
    writeContract: writeApprove,
    isPending: isApprovePending,
    error: approveError,
    reset: resetApprove,
  } = useWriteContract();

  // Wait for approve
  const {
    isLoading: isApproveConfirming,
    isSuccess: isApproveSuccess,
  } = useWaitForTransactionReceipt({
    hash: approveHash,
  });

  // Deposit contract
  const {
    data: depositHash,
    writeContract: writeDeposit,
    isPending: isDepositPending,
    error: depositError,
    reset: resetDeposit,
  } = useWriteContract();

  // Wait for deposit
  const {
    isLoading: isDepositConfirming,
    isSuccess: isDepositSuccess,
  } = useWaitForTransactionReceipt({
    hash: depositHash,
  });

  /**
   * Check if approval is needed for amount
   */
  const needsApproval = (amount: bigint): boolean => {
    if (!allowance) return true;
    return allowance < amount;
  };

  /**
   * Approve USDC spending
   */
  const approve = async (amount: bigint, callbacks?: MutationCallbacks) => {
    const toastId = toast.loading('Approving USDC...');

    try {
      writeApprove(
        {
          address: USDC_ADDRESS,
          abi: ERC20ABI,
          functionName: 'approve',
          args: [POLICY_VAULT_ADDRESS, amount],
          chainId: arcTestnet.id,
        },
        {
          onSuccess: () => {
            toast.success('USDC approved!', { id: toastId });
            refetchAllowance();
            callbacks?.onSuccess?.();
          },
          onError: (error) => {
            toast.error(`Approval failed: ${error.message}`, { id: toastId });
            callbacks?.onError?.(error);
          },
        }
      );
    } catch (error) {
      toast.error('Approval failed', { id: toastId });
      callbacks?.onError?.(error instanceof Error ? error : new Error('Unknown error'));
    }
  };

  /**
   * Deposit USDC into vault
   */
  const deposit = async (amount: bigint, callbacks?: MutationCallbacks) => {
    const toastId = toast.loading('Depositing USDC...');

    try {
      writeDeposit(
        {
          address: POLICY_VAULT_ADDRESS,
          abi: PolicyVaultABI,
          functionName: 'deposit',
          args: [amount],
          chainId: arcTestnet.id,
        },
        {
          onSuccess: () => {
            toast.success('Deposit successful!', { id: toastId });
            // Invalidate balance queries
            if (address) {
              queryClient.invalidateQueries({
                queryKey: QUERY_KEYS.vaultBalance(address),
              });
            }
            callbacks?.onSuccess?.();
          },
          onError: (error) => {
            toast.error(`Deposit failed: ${error.message}`, { id: toastId });
            callbacks?.onError?.(error);
          },
        }
      );
    } catch (error) {
      toast.error('Deposit failed', { id: toastId });
      callbacks?.onError?.(error instanceof Error ? error : new Error('Unknown error'));
    }
  };

  /**
   * Full deposit flow: approve if needed, then deposit
   */
  const depositWithApproval = async (amount: bigint, callbacks?: MutationCallbacks) => {
    if (needsApproval(amount)) {
      await approve(amount, {
        onSuccess: () => {
          // After approval, proceed with deposit
          deposit(amount, callbacks);
        },
        onError: callbacks?.onError,
      });
    } else {
      await deposit(amount, callbacks);
    }
  };

  /**
   * Reset all state
   */
  const reset = () => {
    resetApprove();
    resetDeposit();
  };

  return {
    // State
    allowance,
    needsApproval,

    // Approve
    approve,
    approveHash,
    isApprovePending,
    isApproveConfirming,
    isApproveSuccess,
    approveError,

    // Deposit
    deposit,
    depositWithApproval,
    depositHash,
    isDepositPending,
    isDepositConfirming,
    isDepositSuccess,
    depositError,

    // Combined state
    isPending: isApprovePending || isDepositPending,
    isConfirming: isApproveConfirming || isDepositConfirming,

    // Actions
    reset,
    refetchAllowance,
  };
}
