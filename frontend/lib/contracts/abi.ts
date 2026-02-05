// ============================================
// PolicyVault ABI
// ============================================

export const PolicyVaultABI = [
  // ============================================
  // Read Functions
  // ============================================

  // Get vault balance for an owner
  {
    type: 'function',
    name: 'getBalance',
    inputs: [{ name: 'owner', type: 'address' }],
    outputs: [
      { name: 'total', type: 'uint256' },
      { name: 'available', type: 'uint256' },
      { name: 'allocated', type: 'uint256' },
    ],
    stateMutability: 'view',
  },

  // Get agent info
  {
    type: 'function',
    name: 'getAgentInfo',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'agent', type: 'address' },
    ],
    outputs: [
      { name: 'isAuthorized', type: 'bool' },
      { name: 'isPaused', type: 'bool' },
      { name: 'totalSpent', type: 'uint256' },
      { name: 'authorizedAt', type: 'uint256' },
    ],
    stateMutability: 'view',
  },

  // Get agent policy
  {
    type: 'function',
    name: 'getAgentPolicy',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'agent', type: 'address' },
    ],
    outputs: [
      { name: 'dailyLimit', type: 'uint256' },
      { name: 'maxPerTransaction', type: 'uint256' },
      { name: 'allowedOperations', type: 'uint8[]' },
      { name: 'expiresAt', type: 'uint256' },
    ],
    stateMutability: 'view',
  },

  // Get list of authorized agents
  {
    type: 'function',
    name: 'getAuthorizedAgents',
    inputs: [{ name: 'owner', type: 'address' }],
    outputs: [{ name: 'agents', type: 'address[]' }],
    stateMutability: 'view',
  },

  // Check if agent can spend amount
  {
    type: 'function',
    name: 'canSpend',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'agent', type: 'address' },
      { name: 'amount', type: 'uint256' },
      { name: 'operationType', type: 'uint8' },
    ],
    outputs: [{ name: 'allowed', type: 'bool' }],
    stateMutability: 'view',
  },

  // Get remaining daily limit for agent
  {
    type: 'function',
    name: 'getRemainingDailyLimit',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'agent', type: 'address' },
    ],
    outputs: [{ name: 'remaining', type: 'uint256' }],
    stateMutability: 'view',
  },

  // Get session info
  {
    type: 'function',
    name: 'getSession',
    inputs: [{ name: 'sessionId', type: 'bytes32' }],
    outputs: [
      { name: 'owner', type: 'address' },
      { name: 'agent', type: 'address' },
      { name: 'allocation', type: 'uint256' },
      { name: 'spent', type: 'uint256' },
      { name: 'status', type: 'uint8' },
      { name: 'openedAt', type: 'uint256' },
      { name: 'closedAt', type: 'uint256' },
    ],
    stateMutability: 'view',
  },

  // ============================================
  // Write Functions
  // ============================================

  // Deposit USDC into vault
  {
    type: 'function',
    name: 'deposit',
    inputs: [{ name: 'amount', type: 'uint256' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },

  // Withdraw USDC from vault
  {
    type: 'function',
    name: 'withdraw',
    inputs: [{ name: 'amount', type: 'uint256' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },

  // Emergency withdraw all available USDC
  {
    type: 'function',
    name: 'emergencyWithdraw',
    inputs: [],
    outputs: [],
    stateMutability: 'nonpayable',
  },

  // Authorize an agent with policy
  {
    type: 'function',
    name: 'authorizeAgent',
    inputs: [
      { name: 'agent', type: 'address' },
      { name: 'dailyLimit', type: 'uint256' },
      { name: 'maxPerTransaction', type: 'uint256' },
      { name: 'allowedOperations', type: 'uint8[]' },
      { name: 'expiresAt', type: 'uint256' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },

  // Revoke agent authorization
  {
    type: 'function',
    name: 'revokeAgent',
    inputs: [{ name: 'agent', type: 'address' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },

  // Pause agent (temporary)
  {
    type: 'function',
    name: 'pauseAgent',
    inputs: [{ name: 'agent', type: 'address' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },

  // Resume paused agent
  {
    type: 'function',
    name: 'resumeAgent',
    inputs: [{ name: 'agent', type: 'address' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },

  // Open a state channel session
  {
    type: 'function',
    name: 'openSession',
    inputs: [
      { name: 'agent', type: 'address' },
      { name: 'allocation', type: 'uint256' },
    ],
    outputs: [{ name: 'sessionId', type: 'bytes32' }],
    stateMutability: 'nonpayable',
  },

  // Close a session and settle
  {
    type: 'function',
    name: 'closeSession',
    inputs: [
      { name: 'sessionId', type: 'bytes32' },
      { name: 'spent', type: 'uint256' },
      { name: 'signature', type: 'bytes' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },

  // ============================================
  // Events
  // ============================================

  {
    type: 'event',
    name: 'Deposited',
    inputs: [
      { name: 'owner', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
    ],
  },

  {
    type: 'event',
    name: 'Withdrawn',
    inputs: [
      { name: 'owner', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
    ],
  },

  {
    type: 'event',
    name: 'AgentAuthorized',
    inputs: [
      { name: 'owner', type: 'address', indexed: true },
      { name: 'agent', type: 'address', indexed: true },
      { name: 'dailyLimit', type: 'uint256', indexed: false },
    ],
  },

  {
    type: 'event',
    name: 'AgentRevoked',
    inputs: [
      { name: 'owner', type: 'address', indexed: true },
      { name: 'agent', type: 'address', indexed: true },
    ],
  },

  {
    type: 'event',
    name: 'AgentPaused',
    inputs: [
      { name: 'owner', type: 'address', indexed: true },
      { name: 'agent', type: 'address', indexed: true },
    ],
  },

  {
    type: 'event',
    name: 'AgentResumed',
    inputs: [
      { name: 'owner', type: 'address', indexed: true },
      { name: 'agent', type: 'address', indexed: true },
    ],
  },

  {
    type: 'event',
    name: 'SessionOpened',
    inputs: [
      { name: 'sessionId', type: 'bytes32', indexed: true },
      { name: 'owner', type: 'address', indexed: true },
      { name: 'agent', type: 'address', indexed: true },
      { name: 'allocation', type: 'uint256', indexed: false },
    ],
  },

  {
    type: 'event',
    name: 'SessionClosed',
    inputs: [
      { name: 'sessionId', type: 'bytes32', indexed: true },
      { name: 'spent', type: 'uint256', indexed: false },
      { name: 'refunded', type: 'uint256', indexed: false },
    ],
  },
] as const;

// ============================================
// ERC20 ABI (for USDC)
// ============================================

export const ERC20ABI = [
  {
    type: 'function',
    name: 'approve',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: 'success', type: 'bool' }],
    stateMutability: 'nonpayable',
  },

  {
    type: 'function',
    name: 'allowance',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ name: 'remaining', type: 'uint256' }],
    stateMutability: 'view',
  },

  {
    type: 'function',
    name: 'balanceOf',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: 'balance', type: 'uint256' }],
    stateMutability: 'view',
  },

  {
    type: 'function',
    name: 'decimals',
    inputs: [],
    outputs: [{ name: 'decimals', type: 'uint8' }],
    stateMutability: 'view',
  },

  {
    type: 'function',
    name: 'symbol',
    inputs: [],
    outputs: [{ name: 'symbol', type: 'string' }],
    stateMutability: 'view',
  },

  {
    type: 'event',
    name: 'Approval',
    inputs: [
      { name: 'owner', type: 'address', indexed: true },
      { name: 'spender', type: 'address', indexed: true },
      { name: 'value', type: 'uint256', indexed: false },
    ],
  },

  {
    type: 'event',
    name: 'Transfer',
    inputs: [
      { name: 'from', type: 'address', indexed: true },
      { name: 'to', type: 'address', indexed: true },
      { name: 'value', type: 'uint256', indexed: false },
    ],
  },
] as const;
