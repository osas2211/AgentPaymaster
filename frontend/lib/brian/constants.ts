import type { BrianPrompt } from './types';

// ============================================
// Gas Cost Estimates (USD)
// ============================================

export const GAS_ESTIMATES: Record<string, number> = {
  swap: 0.45,
  transfer: 0.12,
  approve: 0.08,
  bridge: 0.65,
  deposit: 0.25,
  withdraw: 0.20,
  unknown: 0.15,
};

// ============================================
// Example Prompts
// ============================================

export const EXAMPLE_PROMPTS: BrianPrompt[] = [
  {
    label: 'Swap USDC',
    prompt: 'Swap 50 USDC for ETH on Uniswap',
    category: 'swap',
    icon: '🔄',
  },
  {
    label: 'Transfer',
    prompt: 'Transfer 100 USDC to 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
    category: 'transfer',
    icon: '💸',
  },
  {
    label: 'Bridge',
    prompt: 'Bridge 25 USDC from Ethereum to Arbitrum',
    category: 'bridge',
    icon: '🌉',
  },
  {
    label: 'Balance',
    prompt: 'What is my USDC balance?',
    category: 'balance',
    icon: '💰',
  },
];

// ============================================
// Agent Timing Configuration
// ============================================

export const AGENT_TIMING = {
  /** Minimum time between commands (ms) */
  cooldown: 2000,
  /** Brian API timeout (ms) */
  brianTimeout: 15000,
  /** Policy validation timeout (ms) */
  validationTimeout: 10000,
  /** Execution timeout (ms) */
  executionTimeout: 20000,
};

// ============================================
// Store Limits
// ============================================

export const MAX_COMMAND_HISTORY = 200;
