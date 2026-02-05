'use client';

import { useReadContract, useReadContracts } from 'wagmi';
import { useWallet } from './useWallet';
import { POLICY_VAULT_ADDRESS } from '@/lib/contracts/addresses';
import { PolicyVaultABI } from '@/lib/contracts/abi';
import { arcTestnet } from '@/lib/config/wagmi';
import { toPolicy, toAgent } from '@/lib/contracts/types';
import { QUERY_KEYS } from '@/lib/utils/constants';
import type { Agent, Policy } from '@/types';
import type { Address } from 'viem';

// ============================================
// useAgents Hook
// ============================================

/**
 * Hook to get list of authorized agents for the connected wallet
 */
export function useAgents() {
  const { address, isReady } = useWallet();

  // Get list of agent addresses
  const {
    data: agentAddresses,
    isLoading: isLoadingAddresses,
    error: addressesError,
    refetch: refetchAddresses,
  } = useReadContract({
    address: POLICY_VAULT_ADDRESS,
    abi: PolicyVaultABI,
    functionName: 'getAuthorizedAgents',
    args: address ? [address] : undefined,
    chainId: arcTestnet.id,
    query: {
      enabled: isReady && !!address,
      queryKey: address ? QUERY_KEYS.agents(address) : ['agents'],
      staleTime: 30_000,
    },
  });

  // Get info and policy for each agent
  const agentInfoContracts = (agentAddresses || []).flatMap((agentAddr) => [
    {
      address: POLICY_VAULT_ADDRESS,
      abi: PolicyVaultABI,
      functionName: 'getAgentInfo' as const,
      args: [address!, agentAddr] as const,
      chainId: arcTestnet.id,
    },
    {
      address: POLICY_VAULT_ADDRESS,
      abi: PolicyVaultABI,
      functionName: 'getAgentPolicy' as const,
      args: [address!, agentAddr] as const,
      chainId: arcTestnet.id,
    },
  ]);

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
      const infoResult = agentDetails[i * 2];
      const policyResult = agentDetails[i * 2 + 1];

      if (infoResult.status === 'success' && policyResult.status === 'success') {
        const info = infoResult.result as [boolean, boolean, bigint, bigint];
        const policyData = policyResult.result as [bigint, bigint, readonly number[], bigint];

        const policy = toPolicy({
          dailyLimit: policyData[0],
          maxPerTransaction: policyData[1],
          allowedOperations: policyData[2],
          expiresAt: policyData[3],
        });

        const agent = toAgent(
          agentAddresses[i],
          `Agent ${i + 1}`, // Default name, can be overridden
          {
            isAuthorized: info[0],
            isPaused: info[1],
            totalSpent: info[2],
            authorizedAt: info[3],
          },
          policy
        );

        agents.push(agent);
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
  const { address, isReady } = useWallet();

  const {
    data,
    isLoading,
    error,
    refetch,
  } = useReadContract({
    address: POLICY_VAULT_ADDRESS,
    abi: PolicyVaultABI,
    functionName: 'getAgentInfo',
    args: address && agentAddress ? [address, agentAddress] : undefined,
    chainId: arcTestnet.id,
    query: {
      enabled: isReady && !!address && !!agentAddress,
    },
  });

  return {
    isAuthorized: data?.[0],
    isPaused: data?.[1],
    totalSpent: data?.[2],
    authorizedAt: data?.[3] ? Number(data[3]) : undefined,
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
  const { isAuthorized, isLoading, error } = useAgentInfo(agentAddress);

  return {
    isAuthorized: isAuthorized ?? false,
    isLoading,
    error,
  };
}
