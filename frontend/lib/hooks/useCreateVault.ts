'use client';

import { useState, useCallback } from 'react';
import { useVaultDeposit } from './useVaultDeposit';
import { useVaultBalance } from './useVaultBalance';
import { useWallet } from './useWallet';
import toast from 'react-hot-toast';
import type { MutationCallbacks } from '@/types';

// ============================================
// Vault Creation Steps
// ============================================

export type VaultCreationStep = 'deposit' | 'policies' | 'complete';

// ============================================
// useCreateVault Hook
// ============================================

/**
 * Hook to manage the vault creation flow
 * Combines deposit functionality with step management
 */
export function useCreateVault() {
  const { address, usdcBalance, isReady } = useWallet();
  const { balance: vaultBalance, refetch: refetchVaultBalance } = useVaultBalance();
  const {
    depositWithApproval,
    needsApproval,
    isPending: isDepositPending,
    isConfirming: isDepositConfirming,
    isDepositSuccess,
    reset: resetDeposit,
  } = useVaultDeposit();

  // Step management
  const [currentStep, setCurrentStep] = useState<VaultCreationStep>('deposit');
  const [depositAmount, setDepositAmount] = useState<string>('');
  const [isCreating, setIsCreating] = useState(false);

  // Check if vault already exists (has balance)
  const hasExistingVault = vaultBalance && vaultBalance.total > BigInt(0);

  /**
   * Calculate amount from percentage of wallet balance
   */
  const calculatePercentageAmount = useCallback(
    (percentage: number): string => {
      if (!usdcBalance) return '0';
      const amount = (usdcBalance * BigInt(percentage)) / BigInt(100);
      // Convert from 6 decimals to display format
      return (Number(amount) / 1_000_000).toFixed(2);
    },
    [usdcBalance]
  );

  /**
   * Set deposit amount by percentage
   */
  const setAmountByPercentage = useCallback(
    (percentage: number) => {
      const amount = calculatePercentageAmount(percentage);
      setDepositAmount(amount);
    },
    [calculatePercentageAmount]
  );

  /**
   * Execute deposit step
   */
  const executeDeposit = useCallback(
    async (amount: bigint, callbacks?: MutationCallbacks) => {
      if (!isReady) {
        toast.error('Wallet not connected');
        return;
      }

      setIsCreating(true);

      await depositWithApproval(amount, {
        onSuccess: () => {
          refetchVaultBalance();
          setCurrentStep('policies');
          callbacks?.onSuccess?.();
        },
        onError: (error) => {
          setIsCreating(false);
          callbacks?.onError?.(error);
        },
      });
    },
    [isReady, depositWithApproval, refetchVaultBalance]
  );

  /**
   * Complete policies step (move to complete)
   */
  const completePolicies = useCallback(() => {
    setCurrentStep('complete');
    setIsCreating(false);
  }, []);

  /**
   * Skip policies step
   */
  const skipPolicies = useCallback(() => {
    setCurrentStep('complete');
    setIsCreating(false);
  }, []);

  /**
   * Go back to previous step
   */
  const goBack = useCallback(() => {
    if (currentStep === 'policies') {
      setCurrentStep('deposit');
    }
  }, [currentStep]);

  /**
   * Reset the entire flow
   */
  const reset = useCallback(() => {
    setCurrentStep('deposit');
    setDepositAmount('');
    setIsCreating(false);
    resetDeposit();
  }, [resetDeposit]);

  /**
   * Check if can proceed from current step
   */
  const canProceed = useCallback(() => {
    switch (currentStep) {
      case 'deposit':
        return depositAmount && parseFloat(depositAmount) > 0;
      case 'policies':
        return true; // Policies are optional
      case 'complete':
        return true;
      default:
        return false;
    }
  }, [currentStep, depositAmount]);

  return {
    // Wallet state
    address,
    walletBalance: usdcBalance,
    isReady,
    hasExistingVault,

    // Step management
    currentStep,
    setCurrentStep,

    // Deposit state
    depositAmount,
    setDepositAmount,
    setAmountByPercentage,
    calculatePercentageAmount,
    needsApproval,

    // Actions
    executeDeposit,
    completePolicies,
    skipPolicies,
    goBack,
    reset,
    canProceed,

    // Status
    isCreating,
    isDepositPending,
    isDepositConfirming,
    isDepositSuccess,
    isPending: isDepositPending || isDepositConfirming,
  };
}
