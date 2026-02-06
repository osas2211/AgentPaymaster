import { http, createConfig } from 'wagmi'
import { defineChain } from 'viem'
import { getDefaultConfig } from 'connectkit'

// ============================================
// Arc Testnet Chain Definition
// ============================================

export const arcTestnet = defineChain({
  id: 5042002,
  name: 'Arc Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'Arc',
    symbol: 'USD',
  },
  rpcUrls: {
    default: {
      http: [process.env.NEXT_PUBLIC_ARC_TESTNET_RPC || 'https://rpc.testnet.arc.network'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Arc Explorer',
      url: 'https://testnet-explorer.arc.io',
    },
  },
  testnet: true,
})

// ============================================
// Wagmi Config with ConnectKit
// ============================================

export const wagmiConfig = createConfig(
  getDefaultConfig({
    // Required
    chains: [arcTestnet],
    transports: {
      [arcTestnet.id]: http(),
    },

    // WalletConnect Project ID
    walletConnectProjectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '',

    // App metadata
    appName: 'Agent Paymaster',
    appDescription: 'AI Agent Spending Control with Yellow Network State Channels',
    appUrl: typeof window !== 'undefined' ? window.location.origin : 'https://agentpaymaster.xyz',
    appIcon: '/icon.png',
  })
)

// ============================================
// Type Exports
// ============================================

declare module 'wagmi' {
  interface Register {
    config: typeof wagmiConfig
  }
}
