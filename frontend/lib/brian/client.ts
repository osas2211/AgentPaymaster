import type { Address } from 'viem';
import type { BrianTransactionResult } from './types';

// ============================================
// Brian SDK Client (Singleton)
// ============================================

let brianInstance: InstanceType<typeof import('@brian-ai/sdk').BrianSDK> | null = null;

function getBrianClient() {
  if (brianInstance) return brianInstance;

  const apiKey = process.env.NEXT_PUBLIC_BRIAN_API_KEY || process.env.BRIAN_API_KEY;
  if (!apiKey) {
    throw new Error('Brian API key not configured. Set NEXT_PUBLIC_BRIAN_API_KEY in your environment.');
  }

  // Dynamic require to avoid issues with SSR/bundling
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { BrianSDK } = require('@brian-ai/sdk') as typeof import('@brian-ai/sdk');
  brianInstance = new BrianSDK({ apiKey });
  return brianInstance;
}

// ============================================
// Public API
// ============================================

/**
 * Check if Brian AI is configured with an API key
 */
export function isBrianConfigured(): boolean {
  return !!(process.env.NEXT_PUBLIC_BRIAN_API_KEY || process.env.BRIAN_API_KEY);
}

/**
 * Check if mock mode is enabled
 */
function isMockMode(): boolean {
  return process.env.NEXT_PUBLIC_BRIAN_MOCK === 'true';
}

/**
 * Get a transaction interpretation from a natural language prompt
 */
export async function getTransactionFromPrompt(
  prompt: string,
  address: Address,
  chainId?: number,
): Promise<BrianTransactionResult> {
  // Use mock mode if enabled
  if (isMockMode()) {
    const { getMockTransaction } = await import('./mock');
    return getMockTransaction(prompt, address);
  }

  const client = getBrianClient();

  const response = await client.transact({
    prompt,
    address,
    ...(chainId ? { chainId: `${chainId}` as `${number}` } : {}),
  });

  // Normalize the SDK response into our stable type
  const result = response[0];
  if (!result) {
    throw new Error('Brian AI returned no transaction data for this prompt.');
  }

  return {
    description: result.data?.description || 'Transaction interpreted by Brian AI',
    fromToken: result.data?.fromToken?.symbol,
    toToken: result.data?.toToken?.symbol,
    fromAmount: result.data?.fromAmount,
    toAmount: result.data?.toAmount,
    transactions: (result.data?.steps ?? []).map((step) => ({
      to: step.to as Address,
      value: String(step.value ?? '0'),
      data: step.data ?? '0x',
      chainId: step.chainId ? Number(step.chainId) : undefined,
      from: step.from as Address | undefined,
    })),
    protocol: result.solver,
  };
}
