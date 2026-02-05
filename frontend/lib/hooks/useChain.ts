'use client';

import { useAccount, useSwitchChain } from 'wagmi';
import { arcTestnet } from '@/lib/config/wagmi';
import { ARC_TESTNET_CHAIN_ID } from '@/lib/utils/constants';

// ============================================
// useChain Hook
// ============================================

/**
 * Chain validation and switching hook
 * Ensures user is connected to the correct network
 */
export function useChain() {
  const { chain, isConnected } = useAccount();

  const {
    switchChain,
    isPending: isSwitching,
    error: switchError,
    isError: hasSwitchError,
  } = useSwitchChain();

  // Chain status
  const currentChainId = chain?.id;
  const isCorrectChain = currentChainId === ARC_TESTNET_CHAIN_ID;
  const needsSwitch = isConnected && !isCorrectChain;

  // Switch to Arc Testnet
  const switchToArc = () => {
    if (!switchChain) return;
    switchChain({ chainId: arcTestnet.id });
  };

  // Get chain display info
  const getChainInfo = () => {
    if (!chain) return null;

    return {
      id: chain.id,
      name: chain.name,
      isSupported: chain.id === ARC_TESTNET_CHAIN_ID,
    };
  };

  return {
    // Current chain state
    chain,
    currentChainId,
    isCorrectChain,
    needsSwitch,

    // Target chain info
    targetChain: arcTestnet,
    targetChainId: ARC_TESTNET_CHAIN_ID,

    // Switch actions
    switchToArc,
    isSwitching,
    switchError,
    hasSwitchError,

    // Helpers
    getChainInfo,
  };
}
