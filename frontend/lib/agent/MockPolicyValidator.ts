import type { Address } from 'viem';
import type { ValidationResult } from '@/lib/brian/types';
import type { IPolicyValidator } from './PolicyValidator';

// ============================================
// Mock Policy Validator — Demo Mode
// ============================================
// Standalone class with NO wagmi/connectkit imports.
// Simulates a 500 USDC daily limit and 200 USDC per-tx limit.
// Tracks cumulative spending so the limit declines across commands.

const MOCK_DAILY_LIMIT = BigInt(500_000_000); // 500 USDC (6 decimals)
const MOCK_PER_TX_LIMIT = BigInt(200_000_000); // 200 USDC per tx

export class MockPolicyValidator implements IPolicyValidator {
  private spentToday: bigint = BigInt(0);

  async validateSpend(_agentAddress: Address, amount: bigint): Promise<ValidationResult> {
    // Simulate network delay
    await new Promise((r) => setTimeout(r, 300 + Math.random() * 400));

    const remaining = MOCK_DAILY_LIMIT - this.spentToday;

    // Per-transaction limit check
    if (amount > MOCK_PER_TX_LIMIT) {
      return {
        allowed: false,
        reason: `Exceeds per-transaction limit of ${Number(MOCK_PER_TX_LIMIT) / 1e6} USDC`,
        remainingLimit: remaining,
      };
    }

    // Daily limit check
    if (amount > remaining) {
      return {
        allowed: false,
        reason: `Exceeds daily spending limit. Remaining: ${(Number(remaining) / 1e6).toFixed(2)} USDC, requested: ${(Number(amount) / 1e6).toFixed(2)} USDC`,
        remainingLimit: remaining,
      };
    }

    // Approved — track the spend
    this.spentToday += amount;
    const newRemaining = MOCK_DAILY_LIMIT - this.spentToday;

    return {
      allowed: true,
      reason: 'Spend approved by PolicyVault',
      remainingLimit: newRemaining,
    };
  }

  async isAgentAuthorized(_agentAddress: Address): Promise<boolean> {
    await new Promise((r) => setTimeout(r, 100));
    return true;
  }

  async getRemainingLimit(_agentAddress: Address): Promise<bigint> {
    await new Promise((r) => setTimeout(r, 100));
    return MOCK_DAILY_LIMIT - this.spentToday;
  }

  /** Reset tracked spending (useful for demo reset) */
  resetSpending(): void {
    this.spentToday = BigInt(0);
  }
}
