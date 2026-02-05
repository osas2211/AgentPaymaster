'use client';

import { useState, useCallback } from 'react';
import { useYellow } from '@/components/providers/YellowProvider';
import toast from 'react-hot-toast';
import type { MutationCallbacks } from '@/types';
import type { Address } from 'viem';

// ============================================
// useTransfer Hook
// ============================================

/**
 * Hook to execute off-chain transfers within a session
 */
export function useTransfer() {
  const { transfer: executeTransfer, isConnected } = useYellow();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastTransferId, setLastTransferId] = useState<string | null>(null);

  /**
   * Execute a transfer within a session
   */
  const transfer = useCallback(
    async (
      sessionId: string,
      amount: bigint,
      target: Address,
      callbacks?: MutationCallbacks
    ) => {
      if (!isConnected) {
        const err = new Error('Not connected to Yellow Network');
        setError(err);
        callbacks?.onError?.(err);
        return false;
      }

      setIsPending(true);
      setError(null);

      const toastId = toast.loading('Processing transfer...');

      try {
        const success = await executeTransfer(sessionId, amount, target);

        if (success) {
          toast.success('Transfer complete!', { id: toastId });
          setLastTransferId(`${sessionId}-${Date.now()}`);
          callbacks?.onSuccess?.();
        } else {
          toast.error('Transfer failed', { id: toastId });
          const err = new Error('Transfer failed');
          setError(err);
          callbacks?.onError?.(err);
        }

        return success;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error');
        toast.error(`Transfer failed: ${error.message}`, { id: toastId });
        setError(error);
        callbacks?.onError?.(error);
        return false;
      } finally {
        setIsPending(false);
      }
    },
    [executeTransfer, isConnected]
  );

  /**
   * Reset state
   */
  const reset = useCallback(() => {
    setError(null);
    setLastTransferId(null);
  }, []);

  return {
    transfer,
    isPending,
    error,
    lastTransferId,
    reset,
  };
}
