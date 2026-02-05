'use client';

import { useRef, useEffect } from 'react';
import { ConnectKitButton } from 'connectkit';
import { useWallet } from '@/lib/hooks/useWallet';
import { useChain } from '@/lib/hooks/useChain';
import { formatAddress } from '@/lib/utils/format';
import { Wallet, ChevronDown, AlertCircle } from 'lucide-react';
import gsap from 'gsap';

// ============================================
// ConnectWallet Component
// ============================================

interface ConnectWalletProps {
  className?: string;
  showBalance?: boolean;
}

export function ConnectWallet({ className = '', showBalance = true }: ConnectWalletProps) {
  const { isWrongChain, usdcBalanceFormatted } = useWallet();
  const { switchToArc, isSwitching } = useChain();
  const buttonRef = useRef<HTMLButtonElement>(null);

  // GSAP animation on mount
  useEffect(() => {
    if (buttonRef.current) {
      gsap.fromTo(
        buttonRef.current,
        { opacity: 0, y: -10 },
        { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out' }
      );
    }
  }, []);

  // Wrong chain state - show switch button
  if (isWrongChain) {
    return (
      <button
        ref={buttonRef}
        onClick={switchToArc}
        disabled={isSwitching}
        className={`
          flex items-center gap-2 px-4 py-2
          bg-red-500/20 text-red-400
          border border-red-500/30 rounded-lg
          hover:bg-red-500/30 transition-colors
          disabled:opacity-50 disabled:cursor-not-allowed
          ${className}
        `}
      >
        <AlertCircle className="w-4 h-4" />
        <span className="text-sm font-medium">
          {isSwitching ? 'Switching...' : 'Switch to Arc'}
        </span>
      </button>
    );
  }

  return (
    <ConnectKitButton.Custom>
      {({ isConnected, isConnecting, show, address, ensName }) => {
        return (
          <button
            ref={buttonRef}
            onClick={show}
            disabled={isConnecting}
            className={`
              flex items-center gap-2 px-4 py-2
              bg-grey-800 border border-grey-700 rounded-lg
              hover:bg-grey-700 hover:border-grey-600
              transition-all duration-200
              disabled:opacity-50 disabled:cursor-not-allowed
              ${className}
            `}
          >
            {isConnected ? (
              <>
                {/* Connected state */}
                <div className="w-2 h-2 bg-primary rounded-full" />
                <div className="flex flex-col items-start">
                  <span className="text-sm font-medium text-white">
                    {ensName || formatAddress(address as `0x${string}`)}
                  </span>
                  {showBalance && usdcBalanceFormatted && (
                    <span className="text-xs text-grey-400">
                      {parseFloat(usdcBalanceFormatted).toFixed(2)} USDC
                    </span>
                  )}
                </div>
                <ChevronDown className="w-4 h-4 text-grey-400" />
              </>
            ) : (
              <>
                {/* Disconnected state */}
                <Wallet className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-white">
                  {isConnecting ? 'Connecting...' : 'Connect Wallet'}
                </span>
              </>
            )}
          </button>
        );
      }}
    </ConnectKitButton.Custom>
  );
}
