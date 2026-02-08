/**
 * Demo script for Brian AI + PolicyVault integration
 *
 * Usage:
 *   npx tsx scripts/demo-agent.ts
 *
 * Set BRIAN_API_KEY in env for real API calls, or NEXT_PUBLIC_BRIAN_MOCK=true for mock mode.
 */

import { PolicyValidator } from '../lib/agent/PolicyValidator';
import { getTransactionFromPrompt, isBrianConfigured } from '../lib/brian/client';
import type { Address } from 'viem';

const DEMO_AGENT = '0x1234567890abcdef1234567890abcdef12345678' as Address;
const DEMO_WALLET = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd' as Address;

const DEMO_PROMPTS = [
  'Swap 50 USDC for ETH on Uniswap',
  'Transfer 100 USDC to 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
  'Bridge 25 USDC from Ethereum to Arbitrum',
  'What is my USDC balance?',
  'Swap 10000 USDC for WBTC',
];

async function main() {
  console.log('='.repeat(60));
  console.log('  Brian AI + PolicyVault Demo');
  console.log('='.repeat(60));
  console.log();

  const mockMode = process.env.NEXT_PUBLIC_BRIAN_MOCK === 'true';
  const configured = isBrianConfigured();

  console.log(`Brian API configured: ${configured}`);
  console.log(`Mock mode: ${mockMode}`);
  console.log(`Agent: ${DEMO_AGENT}`);
  console.log(`Wallet: ${DEMO_WALLET}`);
  console.log();

  if (!configured && !mockMode) {
    console.error('Set BRIAN_API_KEY or NEXT_PUBLIC_BRIAN_MOCK=true to run the demo.');
    process.exit(1);
  }

  const validator = new PolicyValidator();

  for (const prompt of DEMO_PROMPTS) {
    console.log('-'.repeat(60));
    console.log(`Prompt: "${prompt}"`);
    console.log();

    try {
      // Step 1: Brian AI interpretation
      console.log('[1/2] Calling Brian AI...');
      const result = await getTransactionFromPrompt(prompt, DEMO_WALLET);
      console.log(`  Description: ${result.description}`);
      console.log(`  From: ${result.fromToken ?? '-'} ${result.fromAmount ?? '-'}`);
      console.log(`  To: ${result.toToken ?? '-'} ${result.toAmount ?? '-'}`);
      console.log(`  Protocol: ${result.protocol ?? '-'}`);
      console.log(`  Transactions: ${result.transactions.length}`);
      console.log();

      // Step 2: Policy validation
      const amount = result.fromAmount ? BigInt(Math.round(Number(result.fromAmount) * 1e6)) : BigInt(0);
      console.log(`[2/2] Validating spend (${Number(amount) / 1e6} USDC)...`);
      const validation = await validator.validateSpend(DEMO_AGENT, amount);
      console.log(`  Allowed: ${validation.allowed}`);
      console.log(`  Reason: ${validation.reason}`);
      if (validation.remainingLimit !== undefined) {
        console.log(`  Remaining limit: ${Number(validation.remainingLimit) / 1e6} USDC`);
      }
    } catch (err) {
      console.error(`  Error: ${err instanceof Error ? err.message : err}`);
    }

    console.log();
  }

  console.log('='.repeat(60));
  console.log('  Demo complete');
  console.log('='.repeat(60));
}

main().catch(console.error);
