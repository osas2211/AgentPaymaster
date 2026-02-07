import { createPublicClient, http, type Address, type PublicClient } from 'viem';
import { arcTestnet } from '@/lib/config/wagmi';
import { PolicyVaultABI } from '@/lib/contracts/abi';
import { POLICY_VAULT_ADDRESS } from '@/lib/contracts/addresses';
import type { ValidationResult } from '@/lib/brian/types';

// ============================================
// Policy Validator
// ============================================

export class PolicyValidator {
  private client: PublicClient;

  constructor(client?: PublicClient) {
    this.client = client ?? createPublicClient({
      chain: arcTestnet,
      transport: http(),
    });
  }

  /**
   * Validate whether an agent can spend a given amount
   */
  async validateSpend(agentAddress: Address, amount: bigint): Promise<ValidationResult> {
    try {
      const [allowed, reason] = await this.client.readContract({
        address: POLICY_VAULT_ADDRESS,
        abi: PolicyVaultABI,
        functionName: 'canSpend',
        args: [agentAddress, amount],
      }) as [boolean, string];

      let remainingLimit: bigint | undefined;
      try {
        remainingLimit = await this.getRemainingLimit(agentAddress);
      } catch {
        // Non-critical — continue without remaining limit
      }

      return {
        allowed,
        reason: allowed ? 'Spend approved by PolicyVault' : reason,
        remainingLimit,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown validation error';
      return {
        allowed: false,
        reason: `Validation failed: ${message}`,
      };
    }
  }

  /**
   * Check if an agent is authorized in the PolicyVault
   */
  async isAgentAuthorized(agentAddress: Address): Promise<boolean> {
    try {
      const authorized = await this.client.readContract({
        address: POLICY_VAULT_ADDRESS,
        abi: PolicyVaultABI,
        functionName: 'isAgentAuthorized',
        args: [agentAddress],
      });
      return authorized as boolean;
    } catch {
      return false;
    }
  }

  /**
   * Get the remaining daily spending limit for an agent
   */
  async getRemainingLimit(agentAddress: Address): Promise<bigint> {
    const remaining = await this.client.readContract({
      address: POLICY_VAULT_ADDRESS,
      abi: PolicyVaultABI,
      functionName: 'getRemainingDailyLimit',
      args: [agentAddress],
    });
    return remaining as bigint;
  }
}
