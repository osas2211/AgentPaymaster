import type { Address } from 'viem'

// ============================================
// Contract Addresses
// ============================================

/**
 * PolicyVault contract address
 * Manages USDC deposits, agent authorization, and spending policies
 */
export const POLICY_VAULT_ADDRESS = (process.env.NEXT_PUBLIC_POLICY_VAULT_ADDRESS ||
  '0x0000000000000000000000000000000000000000') as Address

/**
 * USDC token contract address
*/
export const USDC_ADDRESS = (process.env.NEXT_PUBLIC_USDC_ADDRESS ||
  '0x0000000000000000000000000000000000000000') as Address

// ============================================
// Validation
// ============================================

/**
 * Check if contract addresses are configured
 */
export function areContractsConfigured(): boolean {
  return (
    POLICY_VAULT_ADDRESS !== '0x0000000000000000000000000000000000000000' &&
    USDC_ADDRESS !== '0x0000000000000000000000000000000000000000'
  )
}
