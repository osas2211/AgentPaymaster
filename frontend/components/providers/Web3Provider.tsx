'use client';

import type React from 'react';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConnectKitProvider } from 'connectkit';
import { wagmiConfig } from '@/lib/config/wagmi';

// ============================================
// Shared Query Client
// ============================================

// Single QueryClient instance shared between wagmi and app
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Stale time for wallet data
      staleTime: 1000 * 60, // 1 minute
      // Retry failed requests
      retry: 2,
      // Refetch on window focus for fresh wallet data
      refetchOnWindowFocus: true,
    },
  },
});

// ============================================
// ConnectKit Theme Customization
// ============================================

const connectKitTheme = {
  '--ck-font-family': 'var(--font-ibm-plex-sans)',
  '--ck-accent-color': '#c3ff49',
  '--ck-accent-text-color': '#000000',
  '--ck-body-background': '#0a0a0a',
  '--ck-body-background-secondary': '#141414',
  '--ck-body-background-tertiary': '#1a1a1a',
  '--ck-body-color': '#fdfdff',
  '--ck-body-color-muted': '#9ca3af',
  '--ck-primary-button-background': '#c3ff49',
  '--ck-primary-button-color': '#000000',
  '--ck-primary-button-hover-background': '#d4ff7a',
  '--ck-secondary-button-background': '#1a1a1a',
  '--ck-secondary-button-color': '#fdfdff',
  '--ck-secondary-button-hover-background': '#2a2a2a',
  '--ck-border-radius': '12px',
  '--ck-overlay-background': 'rgba(0, 0, 0, 0.8)',
  '--ck-modal-box-shadow': '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
} as const;

// ============================================
// Web3Provider Component
// ============================================

interface Web3ProviderProps {
  children: React.ReactNode;
}

export function Web3Provider({ children }: Web3ProviderProps) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <ConnectKitProvider
          theme="midnight"
          customTheme={connectKitTheme}
          options={{
            // Language
            language: 'en-US',
            // Hide balance in modal
            hideBalance: false,
            // Hide tooltip on button
            hideTooltips: false,
            // Enable dark mode
            enforceSupportedChains: true,
            // Truncate wallet addresses
            truncateLongENSAddress: true,
            // Disable recent wallets
            hideRecentBadge: false,
            // Disable QR codes for non-mobile
            hideNoWalletCTA: false,
            // Avoid siwe
            embedGoogleFonts: false,
          }}
        >
          {children}
        </ConnectKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

// Export the query client for use in other parts of the app
export { queryClient };
