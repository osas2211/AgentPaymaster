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

// Designed for a demo narrative:
// 1. Swap 50 USDC   -> approved (remaining: 450)
// 2. Send 25 USDC   -> approved (remaining: 425)
// 3. Deposit 100     -> approved (remaining: 325)
// 4. Swap 400 USDC   -> REJECTED (exceeds 325 remaining)
// This shows the PolicyVault enforcing spending limits in real time.

export const EXAMPLE_PROMPTS: BrianPrompt[] = [
  {
    label: 'Swap USDC',
    prompt: 'Swap 50 USDC for ETH on Uniswap',
    category: 'swap',
    icon: '~',
  },
  {
    label: 'Send',
    prompt: 'Send 25 USDC to vitalik.eth',
    category: 'transfer',
    icon: '>',
  },
  {
    label: 'Lend',
    prompt: 'Deposit 100 USDC into Aave V3',
    category: 'deposit',
    icon: '+',
  },
  {
    label: 'Over Limit',
    prompt: 'Swap 400 USDC for WBTC',
    category: 'swap',
    icon: '!',
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
