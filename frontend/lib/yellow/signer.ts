import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts'
import type { Address, Hex, WalletClient } from 'viem'
import {
  createECDSAMessageSigner,
  createEIP712AuthMessageSigner,
  type MessageSigner,
  type RPCAllowance,
  type PartialEIP712AuthMessage,
} from '@erc7824/nitrolite'

// ============================================
// Session Key Types
// ============================================

export interface SessionKeyManager {
  privateKey: Hex
  address: Address
  messageSigner: MessageSigner
}

// ============================================
// Session Key Generation
// ============================================

/**
 * Generate a random session key pair and ECDSA message signer
 */
export function createSessionKey(): SessionKeyManager {
  const privateKey = generatePrivateKey()
  const account = privateKeyToAccount(privateKey)

  return {
    privateKey,
    address: account.address,
    messageSigner: createECDSAMessageSigner(privateKey),
  }
}

// ============================================
// Auth Signer Creation
// ============================================

/**
 * Create an EIP-712 auth message signer for the auth challenge flow
 */
export function createAuthSigner(
  walletClient: WalletClient,
  sessionKeyAddress: Address,
  allowances: RPCAllowance[],
  expiresAt: bigint,
  scope: string,
): MessageSigner {
  const partialMessage: PartialEIP712AuthMessage = {
    scope,
    session_key: sessionKeyAddress,
    expires_at: expiresAt,
    allowances,
  }

  return createEIP712AuthMessageSigner(walletClient, partialMessage, {
    name: 'Yellow Network',
  })
}
