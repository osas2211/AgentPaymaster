'use client';

import { useAccount, useBalance, useDisconnect } from 'wagmi';
import { useModal } from 'connectkit';
import { USDC_ADDRESS } from '@/lib/contracts/addresses';
import { arcTestnet } from '@/lib/config/wagmi';

// ============================================
// useWallet Hook
// ============================================

/**
 * Unified wallet state and actions hook
 * Provides wallet connection status, balances, and control functions
 */
export function useWallet() {
  // Connection state
  const { address, isConnected, isConnecting, isReconnecting, chain, connector } =
    useAccount();

  // Disconnect action
  const { disconnect, isPending: isDisconnecting } = useDisconnect();

  // ConnectKit modal controls
  const { open, setOpen } = useModal();

  // Native ETH balance
  const {
    data: ethBalance,
    isLoading: isEthBalanceLoading,
    refetch: refetchEthBalance,
  } = useBalance({
    address,
    chainId: arcTestnet.id,
    query: {
      enabled: !!address,
    },
  });

  // USDC balance
  const {
    data: usdcBalance,
    isLoading: isUsdcBalanceLoading,
    refetch: refetchUsdcBalance,
  } = useBalance({
    address,
    token: USDC_ADDRESS,
    chainId: arcTestnet.id,
    query: {
      enabled: !!address && USDC_ADDRESS !== '0x0000000000000000000000000000000000000000',
    },
  });

  // Connection status helpers
  const isWrongChain = isConnected && chain?.id !== arcTestnet.id;
  const isReady = isConnected && !isWrongChain;

  // Actions
  const openConnectModal = () => setOpen(true);
  const closeConnectModal = () => setOpen(false);

  const refetchBalances = async () => {
    await Promise.all([refetchEthBalance(), refetchUsdcBalance()]);
  };

  return {
    // Connection state
    address,
    isConnected,
    isConnecting: isConnecting || isReconnecting,
    isDisconnecting,
    isWrongChain,
    isReady,

    // Chain info
    chain,
    connector,

    // Balances
    ethBalance: ethBalance?.value,
    ethBalanceFormatted: ethBalance?.formatted,
    usdcBalance: usdcBalance?.value,
    usdcBalanceFormatted: usdcBalance?.formatted,
    isBalanceLoading: isEthBalanceLoading || isUsdcBalanceLoading,

    // Actions
    connect: openConnectModal,
    disconnect,
    refetchBalances,

    // Modal controls
    isModalOpen: open,
    openModal: openConnectModal,
    closeModal: closeConnectModal,
  };
}
