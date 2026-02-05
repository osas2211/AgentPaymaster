'use client';

import { useMemo } from 'react';
import { useSessionStore } from '@/lib/stores/useSessionStore';
import type { Operation } from '@/types';

// ============================================
// useOperationStream Hook
// ============================================

/**
 * Hook to access the real-time operation stream
 * Provides operations from all active sessions
 */
export function useOperationStream() {
  const { operations, sessions } = useSessionStore();

  // Get all operations across all sessions, sorted by timestamp
  const allOperations = useMemo(() => {
    const ops: Operation[] = [];

    for (const [, sessionOps] of operations) {
      ops.push(...sessionOps);
    }

    // Sort by timestamp descending (newest first)
    return ops.sort((a, b) => b.timestamp - a.timestamp);
  }, [operations]);

  // Get operations for a specific session
  const getSessionOperations = (sessionId: string): Operation[] => {
    return operations.get(sessionId) || [];
  };

  // Get the most recent operations (for display)
  const recentOperations = useMemo(() => {
    return allOperations.slice(0, 100);
  }, [allOperations]);

  // Stats
  const stats = useMemo(() => {
    const confirmedOps = allOperations.filter((op) => op.status === 'confirmed');
    const pendingOps = allOperations.filter((op) => op.status === 'pending');
    const failedOps = allOperations.filter((op) => op.status === 'failed');

    return {
      total: allOperations.length,
      confirmed: confirmedOps.length,
      pending: pendingOps.length,
      failed: failedOps.length,
    };
  }, [allOperations]);

  return {
    // Operations
    operations: allOperations,
    recentOperations,
    getSessionOperations,

    // Stats
    operationCount: allOperations.length,
    stats,

    // Active sessions count
    activeSessionCount: sessions.filter((s) => s.state === 'open').length,
  };
}
