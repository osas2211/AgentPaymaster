'use client';

import { useYellow } from '@/components/providers/YellowProvider';

// ============================================
// useYellowConnection Hook
// ============================================

/**
 * Hook to manage Yellow Network connection
 * Provides connection status and controls
 */
export function useYellowConnection() {
  const {
    connectionStatus,
    isConnected,
    isConnecting,
    error,
    connect,
    disconnect,
  } = useYellow();

  return {
    // Status
    status: connectionStatus,
    isConnected,
    isConnecting,
    isDisconnected: connectionStatus === 'disconnected',
    hasError: connectionStatus === 'error',
    error,

    // Actions
    connect,
    disconnect,
    reconnect: async () => {
      disconnect();
      await connect();
    },
  };
}
