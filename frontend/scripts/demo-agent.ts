/**
 * Demo script for Brian AI + PolicyVault integration
 *
 * Usage:
 *   NEXT_PUBLIC_BRIAN_MOCK=true npx tsx scripts/demo-agent.ts
 *
 * Or with a real API key:
 *   BRIAN_API_KEY=your_key npx tsx scripts/demo-agent.ts
 */

import { MockPolicyValidator } from '../lib/agent/MockPolicyValidator';
import { getTransactionFromPrompt, isBrianConfigured } from '../lib/brian/client';
import type { Address } from 'viem';

const DEMO_AGENT = '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18' as Address;
const DEMO_WALLET = '0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B' as Address;

const DEMO_PROMPTS = [
  'Swap 50 USDC for ETH on Uniswap',
  'Send 25 USDC to vitalik.eth',
  'Deposit 100 USDC into Aave V3',
  'What is my USDC balance?',
  'Swap 400 USDC for WBTC',          // Should be rejected (over limit)
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
  console.log(`Daily limit: 500.00 USDC | Per-tx limit: 200.00 USDC`);
  console.log();

  if (!configured && !mockMode) {
    console.error('Set BRIAN_API_KEY or NEXT_PUBLIC_BRIAN_MOCK=true to run the demo.');
    process.exit(1);
  }

  const validator = new MockPolicyValidator();

  for (const prompt of DEMO_PROMPTS) {
    console.log('-'.repeat(60));
    console.log(`$ ${prompt}`);
    console.log();

    try {
      // Step 1: Brian AI interpretation
      console.log('  [brian-ai] Interpreting prompt...');
      const result = await getTransactionFromPrompt(prompt, DEMO_WALLET);
      console.log(`  [brian-ai] ${result.description}`);
      if (result.protocol) console.log(`  [brian-ai] Protocol: ${result.protocol}`);
      console.log(`  [brian-ai] Tokens: ${result.fromAmount ?? '-'} ${result.fromToken ?? ''} -> ${result.toAmount ?? '-'} ${result.toToken ?? ''}`);
      console.log(`  [brian-ai] Transaction steps: ${result.transactions.length}`);
      console.log();

      // Step 2: Policy validation
      const amount = result.fromAmount ? BigInt(Math.round(Number(result.fromAmount) * 1e6)) : BigInt(0);
      if (amount > BigInt(0)) {
        console.log(`  [policy]   Validating spend: ${(Number(amount) / 1e6).toFixed(2)} USDC...`);
        const validation = await validator.validateSpend(DEMO_AGENT, amount);

        if (validation.allowed) {
          console.log(`  [policy]   \x1b[32mAPPROVED\x1b[0m — ${validation.reason}`);
        } else {
          console.log(`  [policy]   \x1b[31mREJECTED\x1b[0m — ${validation.reason}`);
        }

        if (validation.remainingLimit !== undefined) {
          console.log(`  [policy]   Remaining daily limit: ${(Number(validation.remainingLimit) / 1e6).toFixed(2)} USDC`);
        }
      } else {
        console.log(`  [policy]   Read-only operation — no spend validation needed`);
      }
    } catch (err) {
      console.error(`  [error]    ${err instanceof Error ? err.message : err}`);
    }

    console.log();
  }

  console.log('='.repeat(60));
  console.log('  Demo complete');
  console.log('='.repeat(60));
}

main().catch(console.error);
