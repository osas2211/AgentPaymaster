import { createPublicClient, http, type Address, type PublicClient } from 'viem';
import { arcTestnet } from '@/lib/config/wagmi';
import { PolicyVaultABI } from '@/lib/contracts/abi';
import { POLICY_VAULT_ADDRESS } from '@/lib/contracts/addresses';
import type { ValidationResult } from '@/lib/brian/types';

// ============================================
// Policy Validator Interface
// ============================================

export interface IPolicyValidator {
  validateSpend(agentAddress: Address, amount: bigint): Promise<ValidationResult>;
  isAgentAuthorized(agentAddress: Address): Promise<boolean>;
  getRemainingLimit(agentAddress: Address): Promise<bigint>;
}

// ============================================
// Policy Validator — On-Chain
// ============================================

export class PolicyValidator implements IPolicyValidator {
  private client: PublicClient;

  constructor(client?: PublicClient) {
    this.client = client ?? createPublicClient({
      chain: arcTestnet,
      transport: http(),
    });
  }

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
