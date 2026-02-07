import type { Address } from 'viem';
import type { BrianTransactionResult } from './types';

// ============================================
// Mock Brian Client
// ============================================

const MOCK_DELAY_MIN = 800;
const MOCK_DELAY_MAX = 2000;

function randomDelay(): Promise<void> {
  const ms = Math.floor(Math.random() * (MOCK_DELAY_MAX - MOCK_DELAY_MIN)) + MOCK_DELAY_MIN;
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Generate a mock Brian transaction result based on prompt keywords
 */
export async function getMockTransaction(
  prompt: string,
  address: Address,
): Promise<BrianTransactionResult> {
  await randomDelay();

  const lower = prompt.toLowerCase();

  // Swap
  if (lower.includes('swap')) {
    const amountMatch = lower.match(/(\d+(?:\.\d+)?)/);
    const amount = amountMatch ? amountMatch[1] : '100';

    return {
      description: `Swap ${amount} USDC for ETH on Uniswap V3`,
      fromToken: 'USDC',
      toToken: 'ETH',
      fromAmount: amount,
      toAmount: '0.032',
      transactions: [
        {
          to: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45' as Address,
          value: '0',
          data: '0xmockswapdata',
          from: address,
        },
      ],
      protocol: 'Uniswap V3',
    };
  }

  // Transfer
  if (lower.includes('transfer') || lower.includes('send')) {
    const amountMatch = lower.match(/(\d+(?:\.\d+)?)/);
    const amount = amountMatch ? amountMatch[1] : '50';
    const addrMatch = lower.match(/(0x[a-fA-F0-9]{40})/);
    const target = addrMatch ? addrMatch[1] as Address : '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045' as Address;

    return {
      description: `Transfer ${amount} USDC to ${target.slice(0, 10)}...`,
      fromToken: 'USDC',
      fromAmount: amount,
      transactions: [
        {
          to: target,
          value: '0',
          data: '0xmocktransferdata',
          from: address,
        },
      ],
    };
  }

  // Bridge
  if (lower.includes('bridge')) {
    const amountMatch = lower.match(/(\d+(?:\.\d+)?)/);
    const amount = amountMatch ? amountMatch[1] : '25';

    return {
      description: `Bridge ${amount} USDC from Ethereum to Arbitrum via Stargate`,
      fromToken: 'USDC',
      toToken: 'USDC',
      fromAmount: amount,
      toAmount: amount,
      transactions: [
        {
          to: '0x8731d54E9D02c286767d56ac03e8037C07e01e98' as Address,
          value: '0',
          data: '0xmockbridgedata',
          from: address,
        },
      ],
      protocol: 'Stargate',
    };
  }

  // Balance / Default
  return {
    description: `Check balance for ${address.slice(0, 10)}...`,
    fromToken: 'USDC',
    transactions: [],
  };
}
