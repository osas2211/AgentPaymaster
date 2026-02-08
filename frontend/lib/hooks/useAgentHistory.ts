'use client';

import { useMemo } from 'react';
import { useAgentStore } from '@/lib/stores/useAgentStore';

// ============================================
// useAgentHistory Hook
// ============================================

export function useAgentHistory() {
  const commands = useAgentStore((s) => s.commands);
  const stats = useAgentStore((s) => s.stats);

  const recentCommands = useMemo(() => commands.slice(0, 50), [commands]);

  const completedCommands = useMemo(
    () => commands.filter((c) => c.status === 'completed'),
    [commands],
  );

  const failedCommands = useMemo(
    () => commands.filter((c) => c.status === 'failed'),
    [commands],
  );

  const successRate = useMemo(() => {
    if (stats.totalCommands === 0) return 0;
    return Math.round((stats.successfulCommands / stats.totalCommands) * 100);
  }, [stats.totalCommands, stats.successfulCommands]);

  const formattedGasSaved = useMemo(() => {
    return `$${stats.totalGasSaved.toFixed(2)}`;
  }, [stats.totalGasSaved]);

  return {
    recentCommands,
    completedCommands,
    failedCommands,
    successRate,
    formattedGasSaved,
    stats,
  };
}
