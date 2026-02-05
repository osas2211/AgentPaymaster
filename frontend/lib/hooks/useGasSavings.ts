'use client';

import { useMemo } from 'react';
import { useSessionStore } from '@/lib/stores/useSessionStore';
import type { GasStats } from '@/types';

// ============================================
// useGasSavings Hook
// ============================================

/**
 * Hook to access gas savings statistics
 * Tracks how much gas has been saved by using Yellow Network state channels
 */
export function useGasSavings() {
  const { gasStats, resetGasStats } = useSessionStore();

  // Formatted stats for display
  const formattedStats = useMemo(() => {
    return {
      totalSaved: `$${gasStats.totalSaved.toFixed(2)}`,
      wouldHaveCost: `$${gasStats.wouldHaveCost.toFixed(2)}`,
      actualCost: `$${gasStats.actualCost.toFixed(4)}`,
      savingsPercent: `${gasStats.savingsPercent.toFixed(1)}%`,
      operationsCount: gasStats.operationsCount,
    };
  }, [gasStats]);

  // Calculate savings rate (savings per operation)
  const savingsRate = useMemo(() => {
    if (gasStats.operationsCount === 0) return 0;
    return gasStats.totalSaved / gasStats.operationsCount;
  }, [gasStats.totalSaved, gasStats.operationsCount]);

  return {
    // Raw stats
    stats: gasStats,

    // Individual values
    totalSaved: gasStats.totalSaved,
    wouldHaveCost: gasStats.wouldHaveCost,
    actualCost: gasStats.actualCost,
    savingsPercent: gasStats.savingsPercent,
    operationsCount: gasStats.operationsCount,

    // Formatted for display
    formatted: formattedStats,

    // Derived values
    savingsRate,
    savingsRateFormatted: `$${savingsRate.toFixed(4)}/op`,

    // Actions
    reset: resetGasStats,
  };
}
