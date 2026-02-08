'use client';

import type React from 'react';
import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useWalletClient } from 'wagmi';
import { useWallet } from '@/lib/hooks/useWallet';
import { useSessionStore } from '@/lib/stores/useSessionStore';
import { NitroliteClient } from '@/lib/yellow/client';
import { MockClearNode } from '@/lib/yellow/mock-clearnode';
import { YELLOW_WS_URL, YELLOW_MOCK_ENABLED } from '@/lib/yellow/constants';
import type { ConnectionStatus, YellowSession } from '@/types';
import type { Address } from 'viem';

// ============================================
// Yellow Context Types
// ============================================

interface YellowContextValue {
  // Connection state
  connectionStatus: ConnectionStatus;
  isConnected: boolean;
  isConnecting: boolean;
  error: Error | null;

  // Actions
  connect: () => Promise<void>;
  disconnect: () => void;

  // Session operations
  openSession: (agentAddress: Address, allocation: bigint) => Promise<string | null>;
  closeSession: (sessionId: string) => Promise<boolean>;
  transfer: (sessionId: string, amount: bigint, target: Address) => Promise<boolean>;

  // Active sessions
  sessions: YellowSession[];
}

const YellowContext = createContext<YellowContextValue | undefined>(undefined);

// ============================================
// YellowProvider Component
// ============================================

interface YellowProviderProps {
  children: React.ReactNode;
}

export function YellowProvider({ children }: YellowProviderProps) {
  const { address, isConnected: isWalletConnected } = useWallet();
  const { data: walletClient } = useWalletClient();
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [error, setError] = useState<Error | null>(null);
  const [client, setClient] = useState<NitroliteClient | null>(null);

  const {
    sessions,
    addSession,
    updateSession,
    removeSession,
    addOperation,
    updateGasStats,
  } = useSessionStore();

  // Connect to Yellow Network
  const connect = useCallback(async () => {
    if (!address) {
      setError(new Error('Wallet not connected'));
      return;
    }

    if (!walletClient) {
      setError(new Error('Wallet client not available'));
      return;
    }

    try {
      setConnectionStatus('connecting');
      setError(null);

      let hasErrored = false;

      const nitroliteClient = new NitroliteClient(
        {
          wsUrl: YELLOW_WS_URL,
          address,
          walletClient,
          webSocketFactory: YELLOW_MOCK_ENABLED
            ? (url) => new MockClearNode(url)
            : undefined,
        },
        {
          onOpen: () => {
            // WS is open but not yet authenticated — stay in 'connecting'
          },
          onClose: () => {
            if (!hasErrored) {
              setConnectionStatus('disconnected');
            }
          },
          onError: (err) => {
            hasErrored = true;
            setError(err);
            setConnectionStatus('error');
          },
          onAuthenticated: () => {
            setConnectionStatus('connected');
          },
          onBalanceUpdate: (data) => {
            updateSession(data.channelId, {
              balance: BigInt(data.balance),
            });
          },
          onChannelUpdate: (data) => {
            updateSession(data.channelId, {
              state: data.status as YellowSession['state'],
            });
          },
          onTransferNotification: (data) => {
            const operation = {
              id: `op-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
              sessionId: data.channelId,
              type: 'transfer' as const,
              amount: BigInt(data.amount),
              target: data.to,
              status: 'confirmed' as const,
              timestamp: Date.now(),
              estimatedGas: BigInt(21000) * BigInt(20_000_000_000), // ~0.00042 ETH
              actualGas: BigInt(0),
            };
            addOperation(data.channelId, operation);
            updateGasStats(0.00042); // Estimated gas cost in USD
          },
        },
      );

      await nitroliteClient.connect();
      setClient(nitroliteClient);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to connect'));
      setConnectionStatus('error');
    }
  }, [address, walletClient, addOperation, updateGasStats, updateSession]);

  // Disconnect from Yellow Network
  const disconnect = useCallback(() => {
    if (client) {
      client.disconnect();
      setClient(null);
    }
    setConnectionStatus('disconnected');
    setError(null);
  }, [client]);

  // Open a new session
  const openSession = useCallback(
    async (agentAddress: Address, allocation: bigint): Promise<string | null> => {
      if (!client || connectionStatus !== 'connected') {
        setError(new Error('Not connected to Yellow Network'));
        return null;
      }

      try {
        const sessionId = await client.openSession(agentAddress, allocation);

        if (sessionId) {
          addSession({
            channelId: sessionId,
            participant: agentAddress,
            allocation,
            balance: allocation,
            state: 'open',
            nonce: 0,
          });
        }

        return sessionId;
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to open session'));
        return null;
      }
    },
    [client, connectionStatus, addSession]
  );

  // Close a session
  const closeSession = useCallback(
    async (sessionId: string): Promise<boolean> => {
      if (!client || connectionStatus !== 'connected') {
        setError(new Error('Not connected to Yellow Network'));
        return false;
      }

      try {
        const success = await client.closeSession(sessionId);

        if (success) {
          removeSession(sessionId);
        }

        return success;
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to close session'));
        return false;
      }
    },
    [client, connectionStatus, removeSession]
  );

  // Execute a transfer within a session
  const transfer = useCallback(
    async (sessionId: string, amount: bigint, target: Address): Promise<boolean> => {
      if (!client || connectionStatus !== 'connected') {
        setError(new Error('Not connected to Yellow Network'));
        return false;
      }

      try {
        return await client.transfer(sessionId, amount, target);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Transfer failed'));
        return false;
      }
    },
    [client, connectionStatus]
  );

  // Auto-disconnect when wallet disconnects
  useEffect(() => {
    if (!isWalletConnected && connectionStatus === 'connected') {
      disconnect();
    }
  }, [isWalletConnected, connectionStatus, disconnect]);

  const value: YellowContextValue = {
    // Connection state
    connectionStatus,
    isConnected: connectionStatus === 'connected',
    isConnecting: connectionStatus === 'connecting',
    error,

    // Actions
    connect,
    disconnect,

    // Session operations
    openSession,
    closeSession,
    transfer,

    // Active sessions
    sessions,
  };

  return <YellowContext.Provider value={value}>{children}</YellowContext.Provider>;
}

// ============================================
// useYellow Hook
// ============================================

export function useYellow() {
  const context = useContext(YellowContext);

  if (context === undefined) {
    throw new Error('useYellow must be used within a YellowProvider');
  }

  return context;
}
