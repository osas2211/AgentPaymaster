'use client';

import { useReadContract, useReadContracts } from 'wagmi';
import { useWallet } from './useWallet';
import { POLICY_VAULT_ADDRESS } from '@/lib/contracts/addresses';
import { PolicyVaultABI } from '@/lib/contracts/abi';
import { arcTestnet } from '@/lib/config/wagmi';
import { toAgent } from '@/lib/contracts/types';
import type { Agent } from '@/types';
import type { Address } from 'viem';

// ============================================
// useAgents Hook
// ============================================

/**
 * Hook to get list of authorized agents for the connected wallet
 */
export function useAgents() {
  const { address, isReady } = useWallet();

  // Get list of agent addresses (no args — contract is single-owner)
  const {
    data: agentAddresses,
    isLoading: isLoadingAddresses,
    error: addressesError,
    refetch: refetchAddresses,
  } = useReadContract({
    address: POLICY_VAULT_ADDRESS,
    abi: PolicyVaultABI,
    functionName: 'getAuthorizedAgents',
    args: [],
    chainId: arcTestnet.id,
    query: {
      enabled: isReady && !!address,
      staleTime: 30_000,
    },
  });

  // Get info for each agent (single arg: agent address)
  const agentInfoContracts = (agentAddresses || []).map((agentAddr) => ({
    address: POLICY_VAULT_ADDRESS,
    abi: PolicyVaultABI,
    functionName: 'getAgentInfo' as const,
    args: [agentAddr] as const,
    chainId: arcTestnet.id,
  }));

  const {
    data: agentDetails,
    isLoading: isLoadingDetails,
  } = useReadContracts({
    contracts: agentInfoContracts,
    query: {
      enabled: isReady && !!address && (agentAddresses?.length ?? 0) > 0,
    },
  });

  // Parse agents from results
  const agents: Agent[] = [];
  if (agentAddresses && agentDetails) {
    for (let i = 0; i < agentAddresses.length; i++) {
      const result = agentDetails[i];

      if (result.status === 'success' && result.result) {
        const agentData = result.result as {
          policy: {
            dailyLimit: bigint;
            perTxLimit: bigint;
            allowedChainsBitmap: bigint;
            protocolWhitelist: readonly Address[];
            isActive: boolean;
            createdAt: bigint;
          };
          spentToday: bigint;
          lastSpendTimestamp: bigint;
          totalSpent: bigint;
          sessionCount: bigint;
        };

        agents.push(
          toAgent(agentAddresses[i], `Agent ${i + 1}`, agentData)
        );
      }
    }
  }

  return {
    // Data
    agents,
    agentAddresses: agentAddresses || [],
    agentCount: agentAddresses?.length ?? 0,

    // Status
    isLoading: isLoadingAddresses || isLoadingDetails,
    error: addressesError,

    // Actions
    refetch: refetchAddresses,
  };
}

// ============================================
// useAgentInfo Hook
// ============================================

/**
 * Hook to get info for a specific agent
 */
export function useAgentInfo(agentAddress: Address | undefined) {
  const { isReady } = useWallet();

  const {
    data,
    isLoading,
    error,
    refetch,
  } = useReadContract({
    address: POLICY_VAULT_ADDRESS,
    abi: PolicyVaultABI,
    functionName: 'getAgentInfo',
    args: agentAddress ? [agentAddress] : undefined,
    chainId: arcTestnet.id,
    query: {
      enabled: isReady && !!agentAddress,
    },
  });

  const agentData = data as {
    policy: { isActive: boolean; createdAt: bigint };
    spentToday: bigint;
    lastSpendTimestamp: bigint;
    totalSpent: bigint;
    sessionCount: bigint;
  } | undefined;

  return {
    isActive: agentData?.policy.isActive,
    isPaused: agentData ? !agentData.policy.isActive : undefined,
    totalSpent: agentData?.totalSpent,
    spentToday: agentData?.spentToday,
    createdAt: agentData?.policy.createdAt ? Number(agentData.policy.createdAt) : undefined,
    isLoading,
    error,
    refetch,
  };
}

// ============================================
// useIsAgentAuthorized Hook
// ============================================

/**
 * Simple hook to check if an agent is authorized
 */
export function useIsAgentAuthorized(agentAddress: Address | undefined) {
  const { isReady } = useWallet();

  const {
    data: isAuthorized,
    isLoading,
    error,
  } = useReadContract({
    address: POLICY_VAULT_ADDRESS,
    abi: PolicyVaultABI,
    functionName: 'isAgentAuthorized',
    args: agentAddress ? [agentAddress] : undefined,
    chainId: arcTestnet.id,
    query: {
      enabled: isReady && !!agentAddress,
    },
  });

  return {
    isAuthorized: isAuthorized ?? false,
    isLoading,
    error,
  };
}
